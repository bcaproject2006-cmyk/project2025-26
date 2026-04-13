require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const multer = require('multer');
const whatsappService = require('./config/whatsapp');
console.log("Current directory:", __dirname);


// Database connection (mysql2 promise enabled)
const connection = require('./db');

// Email utility
const sendEmail = require('./config/email');

const app = express();

app.use(cors());
// app.use(bodyParser.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use('/public', require('express').static('public'));

app.use('/uploads', express.static('uploads'));

// ---------- JWT MIDDLEWARE ----------
const authenticateToken = (req, res, next) => {

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

    if (err) {
      console.error("JWT verify error:", err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // normalize role to lowercase
    user.role = user.role?.toLowerCase();

    req.user = user;

    next();

  });

};

// ---------- RAZORPAY INIT ----------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------- HELPER FUNCTIONS ----------
// Insert order and its items within a transaction (db must be a promise-enabled connection)
async function insertOrderAndItems(db, orderData, items, shipping_address) {

  const {
    user_id,
    total_amount,
    payment_mode,
    order_status,
    delivery_fee = 0,
    discount = 0
  } = orderData;

  // insert into orders table (ONLY ONE ROW)
  const [orderResult] = await db.query(
    `INSERT INTO orders 
    (user_id, order_date, total_amount, payment_mode, order_status, address, payment_id, delivery_fee, discount)
    VALUES (?, NOW(), ?, ?, ?, ?, '', ?, ?)`,
    [
      user_id,
      total_amount,
      payment_mode,
      order_status,
      shipping_address,
      delivery_fee,
      discount
    ]
  );

  const orderId = orderResult.insertId;

  // insert items
  for (const item of items) {

    await db.query(
      `INSERT INTO order_items 
      (order_id, product_id, quantity, price, subtotal)
      VALUES (?, ?, ?, ?, ?)`,
      [
        orderId,
        item.product_id,
        item.quantity,
        item.price,
        item.subtotal
      ]
    );

  }

  return orderId;
}


//invoice pdf

async function generateInvoice(orderId, customer, items, orderData) {
  try {
    const invoiceDir = path.join(__dirname, "invoices");
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    const fileName = `invoice_${orderId}_${Date.now()}.pdf`;
    const filePath = path.join(invoiceDir, fileName);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ✅ SAFE FONT (NO CRASH)
    doc.font("Helvetica");

    const green = "#16a34a";
    const gray = "#555";

    // HEADER
    doc.fontSize(22).fillColor(green).text("FreshBasket", 50, 50);
    doc.fontSize(10).fillColor(gray).text("Fresh Fruits & Vegetables Delivered", 50, 75);

    doc.fontSize(10)
      .text("support.freshbasket@gmail.com", 400, 50)
      .text("+91 98765 43210", 400, 65);

    doc.fontSize(20).fillColor("#000").text("INVOICE", 400, 100);

    doc.fontSize(10)
      .text(`Invoice #: INV-${orderId}`, 400, 130)
      .text(`Date: ${new Date().toLocaleDateString()}`, 400, 145);

    doc.moveTo(50, 170).lineTo(550, 170).stroke();

    // CUSTOMER
    doc.fontSize(12).text("Bill To:", 50, 190);
    doc.fontSize(10)
      .text(customer.name || "-", 50, 210)
      .text(customer.email || "-", 50, 225)
      .text(customer.phone_no || "-", 50, 240);

    doc.fontSize(12).text("Deliver To:", 300, 190);
    doc.fontSize(10)
      .text(orderData.shipping_address || "-", 300, 210, { width: 220 });

    // TABLE
    const tableTop = 300;

    doc.rect(50, tableTop, 500, 25).fill("#f1f5f9");

    doc.fillColor("#000").fontSize(11)
      .text("Sr.", 55, tableTop + 7)
      .text("Product", 100, tableTop + 7)
      .text("Qty", 300, tableTop + 7)
      .text("Price", 360, tableTop + 7)
      .text("Total", 450, tableTop + 7);

    let y = tableTop + 35;
    let subtotal = 0;

    items.forEach((item, index) => {
      const total = Number(item.subtotal || 0);
      subtotal += total;

      doc.fontSize(10)
        .text(index + 1, 55, y)
        .text(item.product_name || "-", 100, y, { width: 180 })
        .text(item.quantity || 0, 305, y)
        .text(`Rs. ${Number(item.price || 0).toFixed(2)}`, 360, y)
        .text(`Rs. ${total.toFixed(2)}`, 450, y);

      doc.moveTo(50, y + 18).lineTo(550, y + 18).stroke("#eee");

      y += 25;
    });

    // TOTALS
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;

    const delivery = Number(orderData.delivery_fee || 0);
    const discount = Number(orderData.discount || 0);
    const grandTotal = Number(orderData.total_amount || subtotal);

    doc.text("Subtotal:", 350, y)
       .text(`Rs. ${subtotal.toFixed(2)}`, 450, y);

    doc.text("Delivery:", 350, y + 20)
       .text(`Rs. ${delivery.toFixed(2)}`, 450, y + 20);

    doc.text("Discount:", 350, y + 40)
       .text(`-Rs. ${discount.toFixed(2)}`, 450, y + 40);

    doc.fontSize(13).fillColor(green)
       .text("Grand Total:", 330, y + 70)
       .text(`Rs. ${grandTotal.toFixed(2)}`, 450, y + 70);

    // FOOTER
    doc.fontSize(9).fillColor(gray)
      .text("Thank you for shopping with FreshBasket!", 50, 750, {
        align: "center",
        width: 500
      });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on("finish", () => {
        console.log("✅ Invoice created:", filePath);
        resolve(filePath);
      });
      stream.on("error", (err) => {
        console.error("❌ Stream error:", err);
        reject(err);
      });
    });

  } catch (err) {
    console.error("❌ Invoice generation failed:", err);
    throw err;
  }
}

/* =========================
   CATEGORIES (with /api)
   ========================= */
app.post('/api/categories', (req, res) => {
  const { category_name, description } = req.body;
  if (!category_name || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'INSERT INTO categories (category_name, description) VALUES (?, ?)';
  connection.query(sql, [category_name, description], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Category added', category_id: result.insertId });
  });
});

app.get('/api/categories', (req, res) => {
  const sql = `
    SELECT 
      c.category_id,
      c.category_name,
      c.description,
      COUNT(p.product_id) AS product_count
    FROM categories c
    LEFT JOIN products p 
      ON c.category_id = p.category_id
    GROUP BY c.category_id
    ORDER BY c.category_name
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }

    res.json(results);
  });
});

app.get('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM categories WHERE category_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { category_name, description } = req.body;
  if (!category_name || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?';
  connection.query(sql, [category_name, description, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category updated' });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM categories WHERE category_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  });
});

/* =========================
   PRODUCTS (with /api)
   ========================= */
app.post('/api/products', (req, res) => {
  const { category_id, product_name, unit, price, image, status } = req.body;
  if (!category_id || !product_name || !unit || !price || !image || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = `INSERT INTO products (category_id, product_name, unit, price, image, status)
               VALUES (?, ?, ?, ?, ?, ?)`;
  connection.query(sql, [category_id, product_name, unit, price, image, status], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Product added', product_id: result.insertId });
  });
});

app.get('/api/products', (req, res) => {
  connection.query('SELECT * FROM products', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM products WHERE product_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { product_name, unit, price, status, image } = req.body;

  if (!product_name || !unit || !price || !status) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const sql = `
    UPDATE products 
    SET product_name=?, unit=?, price=?, status=?, image=? 
    WHERE product_id=?
  `;

  connection.query(
    sql,
    [product_name, unit, price, status, image || null, id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product updated successfully' });
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM products WHERE product_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  });
});

app.get('/api/categories/:category_id/products', (req, res) => {
  const { category_id } = req.params;
  connection.query('SELECT * FROM products WHERE category_id = ?', [category_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

/* =========================
   CUSTOMERS – ROUTES (all under /api)
   ========================= */

// 🔹 Specific profile routes (must come before parameterized /:id routes)
app.get('/api/customers/profile', authenticateToken, (req, res) => {
  connection.query(
    'SELECT customer_id, name, email, phone_no, address, reward_points FROM customers WHERE customer_id = ?',
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(results[0]);
    }
  );
});

app.put('/api/customers/profile', authenticateToken, async (req, res) => {
  const { name, email, phone_no, address } = req.body;
  if (!name || !email || !phone_no) {
    return res.status(400).json({ error: 'Name, email, and phone number are required' });
  }

  try {
    // Check if email is already taken by another customer
    const [existing] = await connection.promise().query(
      'SELECT customer_id FROM customers WHERE email = ? AND customer_id != ?',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    await connection.promise().query(
      'UPDATE customers SET name = ?, email = ?, phone_no = ?, address = ? WHERE customer_id = ?',
      [name, email, phone_no, address || null, req.user.id]
    );

    const [rows] = await connection.promise().query(
      'SELECT customer_id, name, email, phone_no, address, reward_points FROM customers WHERE customer_id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 Public routes
app.post('/api/customers', async (req, res) => {
  const { name, email, password, phone_no, address, reward_points = 0 } = req.body;
  if (!name || !email || !password || !phone_no) {
    return res.status(400).json({ error: 'Name, email, password and phone_no are required' });
  }

  try {
    const [rows] = await connection.promise().query(
      'SELECT customer_id FROM customers WHERE email = ?', [email]
    );
    if (rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO customers (name, email, password, phone_no, address, reward_points)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await connection.promise().query(sql, [
      name, email, hashedPassword, phone_no, address || null, reward_points
    ]);

    res.status(201).json({ message: 'Customer created', customer_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/customers/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await connection.promise().query(
      'SELECT * FROM customers WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const customer = rows[0];
    const validPassword = await bcrypt.compare(password, customer.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { 
        id: customer.customer_id,
        email: customer.email,
        role: "customer",
        type: "customer"
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...customerData } = customer;
    res.json({ message: 'Login successful', token, customer: customerData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/customers', authenticateToken, async (req, res) => {

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const [rows] = await connection.promise().query(
      "SELECT customer_id, name, email, phone_no, address, reward_points FROM customers"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }

});

// 🔹 Parameterized routes (must come after /profile)
app.get('/api/customers/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  if (req.user.id != id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  connection.query(
    'SELECT customer_id, name, email, phone_no, address, reward_points FROM customers WHERE customer_id = ?',
    [id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(results[0]);
    }
  );
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, password, phone_no, address, reward_points } = req.body;

  if (req.user.id != id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!name || !email || !password || !phone_no) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [existing] = await connection.promise().query(
      'SELECT customer_id FROM customers WHERE email = ? AND customer_id != ?',
      [email, id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `UPDATE customers SET name=?, email=?, password=?, phone_no=?, address=?, reward_points=?
                 WHERE customer_id=?`;
    const [result] = await connection.promise().query(sql, [
      name, email, hashedPassword, phone_no, address, reward_points, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [rows] = await connection.promise().query(
      'SELECT customer_id, name, email, phone_no, address, reward_points FROM customers WHERE customer_id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/customers/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  if (req.user.id != id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  connection.query('DELETE FROM customers WHERE customer_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted' });
  });
});

/* =========================
   USERS (admin) – with /api
   ========================= */
app.post('/api/users/register', async (req, res) => {
  const { name, email, password, mobile, role = 'user', status = 'Active' } = req.body;
  if (!name || !email || !password || !mobile) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [rows] = await connection.promise().query(
      'SELECT user_id FROM users WHERE email = ? OR mobile = ?', [email, mobile]
    );
    if (rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (name, email, password, mobile, role, status) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await connection.promise().query(sql, [
      name, email, hashedPassword, mobile, role, status
    ]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await connection.promise().query(
      'SELECT * FROM users WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role, type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userData } = user;
    res.json({ message: 'Login successful', token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  connection.query('SELECT user_id, name, email, mobile, role, status FROM users', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/users/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.id != id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  connection.query(
    'SELECT user_id, name, email, mobile, role, status FROM users WHERE user_id = ?',
    [id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(results[0]);
    }
  );
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, password, mobile, role, status } = req.body;

  if (req.user.role !== 'admin' && req.user.id != id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!name || !email || !password || !mobile || !role || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `UPDATE users SET name=?, email=?, password=?, mobile=?, role=?, status=? WHERE user_id=?`;
    const [result] = await connection.promise().query(sql, [
      name, email, hashedPassword, mobile, role, status, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.id != id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  connection.query('DELETE FROM users WHERE user_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  });
});

// Get current user profile (authenticated)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await connection.promise().query(
      'SELECT user_id, name, email, mobile, role, status, created_at FROM users WHERE user_id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   ORDERS (with /api prefix)
   ========================= */

// CREATE ORDER (COD)
app.post('/api/orders', authenticateToken, async (req, res) => {

  const db = connection.promise();

  try {

    const {
      user_id,
      total_amount,
      payment_mode,
      order_status,
      items,
      shipping_address,
      delivery_fee = 0,
      discount = 0,
      points_redeemed = 0,
      points_discount = 0
    } = req.body;

    if (!user_id || !total_amount || !payment_mode || !order_status || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (req.user.id != user_id) {
      return res.status(403).json({ error: "You can only create orders for yourself" });
    }

    await db.beginTransaction();

    // Get customer first
    const [customerRows] = await db.query(
      "SELECT name, email, phone_no, reward_points FROM customers WHERE customer_id = ?",
      [user_id]
    );

    if (customerRows.length === 0) {
      await db.rollback();
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customerRows[0];

    if (points_redeemed > customer.reward_points) {
      await db.rollback();
      return res.status(400).json({ error: "Insufficient reward points" });
    }

    // Create order
    const orderId = await insertOrderAndItems(db, req.body, items, shipping_address);

    // ===== FIND LOYALTY MEMBER =====
    const [memberRows] = await db.query(
      "SELECT member_id FROM loyalty_members WHERE email = ?",
      [customer.email]
    );

    const memberId = memberRows.length > 0 ? memberRows[0].member_id : null;

    // ===== EARN POINTS =====
    const pointsEarned = Math.floor((total_amount + points_discount) / 100) * 10;

    if (pointsEarned > 0) {

      // insert transaction ONLY if loyalty member exists
      if (memberId) {
        await db.query(
          `INSERT INTO point_transactions
          (member_id, member_name, activity, points, transaction_date, order_ref)
          VALUES (?, ?, ?, ?, NOW(), ?)`,
          [
            memberId,
            customer.name,
            "Order purchase",
            pointsEarned,
            `ORD-${orderId}`
          ]
        );
      }

      // update customer reward points
      await db.query(
        `UPDATE customers SET reward_points = reward_points + ? WHERE customer_id = ?`,
        [pointsEarned, user_id]
      );
    }

    // ===== REDEEM POINTS =====
    if (points_redeemed > 0) {

      if (memberId) {
        await db.query(
          `INSERT INTO point_transactions
          (member_id, member_name, activity, points, transaction_date, order_ref)
          VALUES (?, ?, ?, ?, NOW(), ?)`,
          [
            memberId,
            customer.name,
            "Points redeemed",
            -points_redeemed,
            `ORD-${orderId}`
          ]
        );
      }

      await db.query(
        `UPDATE customers SET reward_points = reward_points - ? WHERE customer_id = ?`,
        [points_redeemed, user_id]
      );
    }

    // Get items for invoice
    const [itemsWithNames] = await db.query(
      `SELECT oi.*, p.product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    await db.commit();
    // 🔔 Insert notification AFTER successful order commit
try {
  console.log("🔔 Inserting notification for order:", orderId);

  const [notifResult] = await db.query(
    `INSERT INTO notifications (user_id, message, status, created_at)
     VALUES (?, ?, ?, NOW())`,
    [
      1, // admin user id
      `New order received: #${orderId}`,
      'unread'
    ]
  );

  console.log("✅ Notification inserted:", notifResult);

} catch (notifError) {
  console.error("❌ Notification insert failed:", notifError);
}

    // ✅ GENERATE INVOICE BEFORE RESPONSE
try {
  console.log("🚀 Generating invoice...");

  const pdfPath = await generateInvoice(
    orderId,
    customer,
    itemsWithNames,
    {
      total_amount,
      delivery_fee,
      discount,
      shipping_address
    }
  );

  await db.query(
    "INSERT INTO invoices (order_id, invoice_date, invoice_pdf_path) VALUES (?, ?, ?)",
    [orderId, new Date().toISOString().slice(0, 10), pdfPath]
  );

  console.log("✅ Invoice saved in DB");

  await sendEmail(
    customer.email,
    "Order Invoice",
    "Thank you for your order!",
    null,
    pdfPath
  );

// 🔐 Generate Delivery OTP
const deliveryOtp = Math.floor(1000 + Math.random() * 9000);

// 💰 Payment Mode Fix
const paymentModeText = payment_mode === 'cod'
  ? 'Cash on Delivery'
  : 'Prepaid';

// 🧾 Items Summary
const itemsSummary = itemsWithNames
  .map(item => `• ${item.product_name} x${item.quantity}`)
  .join('\n');

// 📩 Final WhatsApp Message
const message = `
🛒 *FreshBasket Order Confirmed!*

Hi ${customer.name},

Thank you for your order! 🙌

📦 *Order ID:* #${orderId}  
💰 *Payment:* ${paymentModeText}  
💵 *Total:* ₹${total_amount}  

🧾 *Items:*
${itemsSummary}

📍 *Delivery Address:*  
${shipping_address}

🔐 *Delivery OTP:* ${deliveryOtp}

📧 Your invoice has been sent to your email.

🚚 Our delivery partner will contact you soon.

_Thank you for choosing FreshBasket!_
`;

await whatsappService.sendMessage(customer.phone_no, message);

console.log("✅ WhatsApp order message sent");

  console.log("✅ WhatsApp invoice sent");

} catch (err) {
  console.error("❌ INVOICE ERROR:", err);
}

// ✅ NOW SEND RESPONSE (AFTER INVOICE CREATED)
res.status(201).json({
  message: "Order created successfully",
  order_id: orderId
});
  } catch (error) {

    await db.rollback();
    console.error("Order creation error:", error);

    res.status(500).json({
      error: "Database error",
      details: error.message
    });

  }

});
app.get('/view-invoice/:fileName', (req, res) => {
  const filePath = path.join(__dirname, 'public/invoices', req.params.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline'); // 👈 THIS IS KEY

  fs.createReadStream(filePath).pipe(res);
});
// GET all orders (admin: all; customer: own)
app.get('/api/orders', authenticateToken, async (req, res) => {

  const db = connection.promise();

  try {

    let sql = `
      SELECT * 
      FROM orders
      ORDER BY order_date DESC
    `;

    const [rows] = await db.query(sql);

    rows.forEach(row => {
      row.total_amount = parseFloat(row.total_amount || 0);
      row.delivery_fee = parseFloat(row.delivery_fee || 0);
      row.discount = parseFloat(row.discount || 0);
    });

    res.json(rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }

});

// GET single order with delivery address
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { id } = req.params;
  let sql = `
    SELECT o.*,
           COALESCE(o.address, c.address) AS delivery_address
    FROM orders o
    JOIN customers c ON o.user_id = c.customer_id
    WHERE o.order_id = ?
  `;
  const params = [id];
  if (req.user.type === 'customer') {
    sql += ' AND o.user_id = ?';
    params.push(req.user.id);
  }
  try {
    const [rows] = await db.query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = rows[0];
    if (order.total_amount) order.total_amount = parseFloat(order.total_amount);
    if (order.delivery_fee) order.delivery_fee = parseFloat(order.delivery_fee);
    if (order.discount) order.discount = parseFloat(order.discount);
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE order (admin only)
app.put('/api/orders/:order_id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { order_id } = req.params;
  const { user_id, order_date, total_amount, payment_mode, order_status, address, delivery_fee, discount } = req.body;
  if (!user_id || !order_date || !total_amount || !payment_mode || !order_status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = connection.promise();

  try {
    // If status is 'delivered', set delivered_at to current timestamp using MySQL NOW()
    let setDeliveredAt = '';
    let queryParams = [
      user_id, order_date, total_amount, payment_mode, order_status, address, 
      delivery_fee || 0, discount || 0, order_id
    ];

    if (order_status.toLowerCase() === 'delivered') {
      setDeliveredAt = ', delivered_at = NOW()';
    } else {
      setDeliveredAt = '';
    }

    const sql = `
      UPDATE orders
      SET user_id = ?, order_date = ?, total_amount = ?, payment_mode = ?, order_status = ?, address = ?, delivery_fee = ?, discount = ?
      ${setDeliveredAt}
      WHERE order_id = ?
    `;

    const [result] = await db.query(sql, queryParams);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order updated' });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE order (admin only)
app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  const db = connection.promise();
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { id } = req.params;
  try {
    await db.query('DELETE FROM order_items WHERE order_id = ?', [id]);
    const [result] = await db.query('DELETE FROM orders WHERE order_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/today/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await connection.promise().query(
      'SELECT COUNT(*) AS count FROM orders WHERE DATE(order_date) = CURDATE()'
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   ORDER ITEMS (with /api prefix)
   ========================= */

// GET all order items (admin: all; customer: only own)
app.get('/api/order-items', authenticateToken, async (req, res) => {
  const db = connection.promise();
  let sql = `
    SELECT oi.*, p.product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    JOIN orders o ON oi.order_id = o.order_id
  `;
  const params = [];
  if (req.user.type === 'customer') {
    sql += ' WHERE o.user_id = ?';
    params.push(req.user.id);
  }
  try {
    const [rows] = await db.query(sql, params);
    rows.forEach(r => {
      if (r.price) r.price = parseFloat(r.price);
      if (r.subtotal) r.subtotal = parseFloat(r.subtotal);
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET a single order item by its ID
app.get('/api/order-items/:id', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { id } = req.params;
  let sql = `
    SELECT oi.*, p.product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.order_item_id = ?
  `;
  const params = [id];
  if (req.user.type === 'customer') {
    sql += ' AND o.user_id = ?';
    params.push(req.user.id);
  }
  try {
    const [rows] = await db.query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    const item = rows[0];
    if (item.price) item.price = parseFloat(item.price);
    if (item.subtotal) item.subtotal = parseFloat(item.subtotal);
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all items for a specific order (used by OrderDetails page)
app.get('/api/orders/:id/items', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { id } = req.params;

  try {
    // Verify order ownership
    const [orderRows] = await db.query(
      'SELECT user_id FROM orders WHERE order_id = ?',
      [id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];

    if (req.user.type === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // ✅ MODIFIED QUERY: include product_id, unit, category_name
    const [items] = await db.query(
      `SELECT 
          oi.order_item_id,
          oi.product_id,
          oi.quantity,
          oi.price,
          oi.subtotal,
          p.product_name,
          p.unit,
          p.image,
          c.category_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE oi.order_id = ?`,
      [id]
    );

    const formattedItems = items.map(item => ({
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: parseFloat(item.price || 0),
      subtotal: parseFloat(item.subtotal || 0),
      product_name: item.product_name,
      unit: item.unit || 'pcs',
      category_name: item.category_name || 'Uncategorized',
      product_image: item.image || null
    }));

    res.json(formattedItems);

  } catch (err) {
    console.error('Error fetching order items:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new order item (admin only)
app.post('/api/order-items', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { order_id, product_id, quantity, price, subtotal } = req.body;
  if (!order_id || !product_id || !quantity || !price || !subtotal) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const [result] = await connection.promise().query(
      'INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
      [order_id, product_id, quantity, price, subtotal]
    );
    res.status(201).json({ message: 'Order item added', order_item_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT (update) an order item (admin only)
app.put('/api/order-items/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { id } = req.params;
  const { order_id, product_id, quantity, price, subtotal } = req.body;
  if (!order_id || !product_id || !quantity || !price || !subtotal) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const [result] = await connection.promise().query(
      `UPDATE order_items SET order_id=?, product_id=?, quantity=?, price=?, subtotal=?
       WHERE order_item_id=?`,
      [order_id, product_id, quantity, price, subtotal, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    res.json({ message: 'Order item updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE an order item (admin only)
app.delete('/api/order-items/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { id } = req.params;
  try {
    const [result] = await connection.promise().query('DELETE FROM order_items WHERE order_item_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    res.json({ message: 'Order item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== RETURN REQUESTS ====================

// Configure multer for file uploads (added)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads/return-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'return-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Submit a return request (customer only) – UPDATED VERSION with items, action, images
app.post('/api/orders/:id/return', authenticateToken, upload.array('images', 5), async (req, res) => {
  const db = connection.promise();
  const { id } = req.params;
  const { action, reason, selected_items } = req.body; // selected_items is a JSON string
  const files = req.files || [];

  // Validation
  if (!action || !['return', 'replace'].includes(action)) {
    return res.status(400).json({ error: 'Valid action is required' });
  }
  if (!reason || reason.trim() === '') {
    return res.status(400).json({ error: 'Reason is required' });
  }
  let selectedItemsArray;
  try {
    selectedItemsArray = JSON.parse(selected_items);
    if (!Array.isArray(selectedItemsArray) || selectedItemsArray.length === 0) {
      throw new Error();
    }
  } catch {
    return res.status(400).json({ error: 'Selected items must be a non-empty array' });
  }

  try {
    // Check order exists and belongs to user
    const [orderRows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [id]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderRows[0];

    if (req.user.type === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only delivered orders can be returned
    if (order.order_status?.toLowerCase() !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders can be returned' });
    }

    // Ensure delivered_at is set (should be if status is delivered)
    if (!order.delivered_at) {
      return res.status(400).json({ error: 'Delivery timestamp not available. Please contact support.' });
    }

    // 30-minute window check using delivered_at
    const deliveredTime = new Date(order.delivered_at).getTime();
    const now = Date.now();
    const minutesDiff = (now - deliveredTime) / (1000 * 60);
    if (minutesDiff > 30) {
      return res.status(400).json({
        error: 'Return period has expired. You can only return within 30 minutes of delivery.'
      });
    }

    // Check if a return request already exists for this order
    const [existing] = await db.query('SELECT * FROM return_requests WHERE order_id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Return request already submitted for this order' });
    }

    await db.beginTransaction();

    // Insert return request
    const [requestResult] = await db.query(
      'INSERT INTO return_requests (order_id, user_id, action, reason, status) VALUES (?, ?, ?, ?, ?)',
      [id, order.user_id, action, reason, 'pending']
    );
    const requestId = requestResult.insertId;

    // Insert selected items
    for (const itemId of selectedItemsArray) {
      // Verify item belongs to order
      const [itemRows] = await db.query(
        'SELECT order_item_id FROM order_items WHERE order_item_id = ? AND order_id = ?',
        [itemId, id]
      );
      if (itemRows.length === 0) {
        throw new Error(`Item ${itemId} does not belong to this order`);
      }
      await db.query(
        'INSERT INTO return_request_items (request_id, order_item_id) VALUES (?, ?)',
        [requestId, itemId]
      );
    }

    // Insert images
    for (const file of files) {
      const imagePath = file.path; // store full path
      await db.query(
        'INSERT INTO return_request_images (request_id, image_path) VALUES (?, ?)',
        [requestId, imagePath]
      );
    }

    // Update order status
    await db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', ['return requested', id]);

    await db.commit();

    // Send confirmation email to customer
    const [customerRows] = await db.query('SELECT email, name FROM customers WHERE customer_id = ?', [order.user_id]);
    const customer = customerRows[0];
    if (customer && customer.email) {
      const subject = 'Return Request Submitted';
      const text = `Dear ${customer.name},\n\nYour return request for order #${id} has been submitted successfully.\n\nAction: ${action}\nReason: ${reason}\nItems: ${selectedItemsArray.length}\n\nWe will review it and notify you soon.\n\nThank you.`;
      await sendEmail(customer.email, subject, text);
    }

    res.json({ message: 'Return request submitted successfully', request_id: requestId });
  } catch (err) {
    await db.rollback();
    console.error('Return request error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Cancel order (customer only) – FINAL VERSION
app.post('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { id } = req.params;

  try {
    const [orderRows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [id]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];

    if (req.user.type === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowedStatuses = ['pending', 'processing'];
    if (!allowedStatuses.includes(order.order_status?.toLowerCase())) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    await db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', ['cancelled', id]);

    // Send cancellation email
    const [customerRows] = await db.query('SELECT email, name FROM customers WHERE customer_id = ?', [order.user_id]);
    const customer = customerRows[0];
    if (customer && customer.email) {
      const subject = 'Order Cancelled';
      const text = `Dear ${customer.name},\n\nYour order #${id} has been cancelled successfully.\n\nThank you.`;
      await sendEmail(customer.email, subject, text);
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get return request for a specific order (used in admin order modal)
app.get('/api/return-requests/order/:orderId', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { orderId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT rr.*, c.name as customer_name, c.email 
       FROM return_requests rr
       JOIN customers c ON rr.user_id = c.customer_id
       WHERE rr.order_id = ?`,
      [orderId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No return request found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all return requests (admin only)
app.get('/api/return-requests', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const db = connection.promise();
  try {
    const [rows] = await db.query(
      `SELECT rr.*, o.order_date, o.total_amount, c.name as customer_name, c.email
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.order_id
       JOIN customers c ON rr.user_id = c.customer_id
       ORDER BY rr.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get items for a specific return request (admin only) – optional, for detailed view
app.get('/api/return-requests/:requestId/items', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const db = connection.promise();
  const { requestId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT rri.*, oi.product_id, oi.quantity, oi.price, p.product_name
       FROM return_request_items rri
       JOIN order_items oi ON rri.order_item_id = oi.order_item_id
       JOIN products p ON oi.product_id = p.product_id
       WHERE rri.request_id = ?`,
      [requestId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get images for a specific return request (admin only)
app.get('/api/return-requests/:requestId/images', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const db = connection.promise();
  const { requestId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM return_request_images WHERE request_id = ?',
      [requestId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve return request (admin only)
app.post('/api/return-requests/:requestId/approve', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const db = connection.promise();
  const { requestId } = req.params;

  try {
    const [reqRows] = await db.query('SELECT * FROM return_requests WHERE request_id = ?', [requestId]);
    if (reqRows.length === 0) {
      return res.status(404).json({ error: 'Return request not found' });
    }
    const request = reqRows[0];

    await db.query('UPDATE return_requests SET status = ? WHERE request_id = ?', ['approved', requestId]);
    await db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', ['return approved', request.order_id]);

    const [customerRows] = await db.query('SELECT email, name FROM customers WHERE customer_id = ?', [request.user_id]);
    const customer = customerRows[0];
    if (customer && customer.email) {
      sendEmail(
        customer.email,
        'Return Request Approved',
        `Dear ${customer.name},\n\nYour return request for order #${request.order_id} has been approved. Please proceed with returning the items.\n\nThank you.`
      ).catch(err => console.error('Email error:', err));
    }

    res.json({ message: 'Return request approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject return request (admin only)
app.post('/api/return-requests/:requestId/reject', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const db = connection.promise();
  const { requestId } = req.params;

  try {
    const [reqRows] = await db.query('SELECT * FROM return_requests WHERE request_id = ?', [requestId]);
    if (reqRows.length === 0) {
      return res.status(404).json({ error: 'Return request not found' });
    }
    const request = reqRows[0];

    await db.query('UPDATE return_requests SET status = ? WHERE request_id = ?', ['rejected', requestId]);
    await db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', ['return rejected', request.order_id]);

    const [customerRows] = await db.query('SELECT email, name FROM customers WHERE customer_id = ?', [request.user_id]);
    const customer = customerRows[0];
    if (customer && customer.email) {
      sendEmail(
        customer.email,
        'Return Request Rejected',
        `Dear ${customer.name},\n\nYour return request for order #${request.order_id} has been rejected. Please contact support for more information.\n\nThank you.`
      ).catch(err => console.error('Email error:', err));
    }

    res.json({ message: 'Return request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   RAZORPAY PAYMENT
   ========================= */
// Create Razorpay order
app.post('/api/create-razorpay-order', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;
    const options = {
      amount: amount, // in paise
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

// Verify Razorpay payment and create order
app.post('/api/verify-razorpay-payment', authenticateToken, async (req, res) => {
  const db = connection.promise();
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderPayload
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const {
      user_id,
      payment_mode,
      order_status,
      total_amount,
      delivery_fee,
      discount,
      items,
      shipping_address,
      points_redeemed = 0,
      points_discount = 0
    } = orderPayload;

    // Validation
    if (!user_id || !total_amount || !payment_mode || !order_status || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields or items' });
    }
    if (req.user.id != user_id) {
      return res.status(403).json({ error: 'You can only create orders for yourself' });
    }
    if (!shipping_address || shipping_address.trim() === '') {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    await db.beginTransaction();

    // Check points balance
    if (points_redeemed > 0) {
      const [custRows] = await db.query('SELECT reward_points FROM customers WHERE customer_id = ?', [user_id]);
      if (custRows.length === 0 || custRows[0].reward_points < points_redeemed) {
        await db.rollback();
        return res.status(400).json({ error: 'Insufficient reward points' });
      }
    }

    const orderId = await insertOrderAndItems(db, orderPayload, items, shipping_address);

    // Get customer details for later use (loyalty, invoice)
    const [customerRows] = await db.query(
      'SELECT name, email, phone_no FROM customers WHERE customer_id = ?',
      [user_id]
    );
    const customer = customerRows[0];

    // ===== REWARD POINTS EARNED =====
    const pointsEarned = Math.floor((total_amount + points_discount) / 100) * 10;
    if (pointsEarned > 0) {
      // Find loyalty member
      const [loyaltyRows] = await db.query(
        'SELECT member_id FROM loyalty_members WHERE email = ?',
        [customer.email]
      );
      const memberId = loyaltyRows.length > 0 ? loyaltyRows[0].member_id : null;

      if (memberId) {
        await db.query(
          `INSERT INTO point_transactions
          (member_id, member_name, activity, points, transaction_date, order_ref)
          VALUES (?, ?, ?, ?, NOW(), ?)`,
          [memberId, customer.name, "Order purchase", pointsEarned, `ORD-${orderId}`]
        );
      }

      await db.query(
        `UPDATE customers SET reward_points = reward_points + ? WHERE customer_id = ?`,
        [pointsEarned, user_id]
      );
    }

    // ===== REWARD POINTS REDEEMED =====
    if (points_redeemed > 0) {
      // Find loyalty member for redemption transaction (optional)
      const [loyaltyRows] = await db.query(
        'SELECT member_id FROM loyalty_members WHERE email = ?',
        [customer.email]
      );
      const memberId = loyaltyRows.length > 0 ? loyaltyRows[0].member_id : null;

      if (memberId) {
        await db.query(
          `INSERT INTO point_transactions
          (member_id, member_name, activity, points, transaction_date, order_ref)
          VALUES (?, ?, ?, ?, NOW(), ?)`,
          [memberId, customer.name, "Points redeemed", -points_redeemed, `ORD-${orderId}`]
        );
      }

      await db.query(
        `UPDATE customers SET reward_points = reward_points - ? WHERE customer_id = ?`,
        [points_redeemed, user_id]
      );
    }

    // Get items with product names for invoice
    const [itemsWithNames] = await db.query(
      `SELECT oi.*, p.product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    await db.commit();

    // ✅ GENERATE INVOICE BEFORE RESPONSE (FINAL FIX)
    try {
      console.log("🚀 Generating invoice (Razorpay)...");

      const pdfPath = await generateInvoice(
        orderId,
        customer,
        itemsWithNames,
        {
          total_amount,
          delivery_fee,
          discount,
          shipping_address
        }
      );

      await db.query(
        "INSERT INTO invoices (order_id, invoice_date, invoice_pdf_path) VALUES (?, ?, ?)",
        [orderId, new Date().toISOString().slice(0, 10), pdfPath]
      );

      console.log("✅ Invoice saved (Razorpay)");

      await sendEmail(
  customer.email,
  "Order Invoice",
  "Thank you for your order!",
  null,
  pdfPath
);

    } catch (err) {
      console.error("❌ Razorpay invoice error:", err);
    }

    // ✅ SEND RESPONSE AFTER EVERYTHING
    res.status(201).json({
      message: "Order created successfully",
      order_id: orderId
    });

  } catch (error) {
    await db.rollback();
    console.error('Payment verification / order creation error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/* =========================
   INVOICES (with /api)
   ========================= */
app.post('/api/invoices', (req, res) => {
  const { order_id, invoice_date, invoice_pdf_path } = req.body;
  if (!order_id || !invoice_date || !invoice_pdf_path) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'INSERT INTO invoices (order_id, invoice_date, invoice_pdf_path) VALUES (?, ?, ?)';
  connection.query(sql, [order_id, invoice_date, invoice_pdf_path], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Invoice created', invoice_id: result.insertId });
  });
});

app.get('/api/invoices', authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      i.invoice_id,
      i.order_id,
      i.invoice_date,
      i.invoice_pdf_path,
      o.order_status,
      o.total_amount,
      c.name AS customer_name,
      c.email AS customer_email
    FROM invoices i
    JOIN orders o ON i.order_id = o.order_id
    JOIN customers c ON o.user_id = c.customer_id
    ORDER BY i.invoice_date DESC
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching invoices:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM invoices WHERE invoice_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  const { order_id, invoice_date, invoice_pdf_path } = req.body;
  if (!order_id || !invoice_date || !invoice_pdf_path) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'UPDATE invoices SET order_id=?, invoice_date=?, invoice_pdf_path=? WHERE invoice_id=?';
  connection.query(sql, [order_id, invoice_date, invoice_pdf_path, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice updated' });
  });
});

app.delete('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM invoices WHERE invoice_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted' });
  });
});

// Download invoice PDF
app.get('/api/invoices/:orderId/download', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { orderId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT invoice_pdf_path FROM invoices WHERE order_id = ?',
      [orderId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const filePath = rows[0].invoice_pdf_path;
    if (req.user.type === 'customer') {
      const [orderRows] = await db.query(
        'SELECT user_id FROM orders WHERE order_id = ?',
        [orderId]
      );
      if (orderRows.length === 0 || orderRows[0].user_id != req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    res.download(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

/* =========================
   REWARDS (with /api)
   ========================= */
app.post('/api/rewards', (req, res) => {
  const { points, description, expiry_date } = req.body;
  if (!points || !description || !expiry_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'INSERT INTO rewards (points, description, expiry_date) VALUES (?, ?, ?)';
  connection.query(sql, [points, description, expiry_date], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Reward created', reward_id: result.insertId });
  });
});

app.get('/api/rewards', (req, res) => {
  connection.query('SELECT * FROM rewards', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/rewards/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM rewards WHERE reward_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/rewards/:id', (req, res) => {
  const { id } = req.params;
  const { points, description, expiry_date } = req.body;
  if (!points || !description || !expiry_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'UPDATE rewards SET points=?, description=?, expiry_date=? WHERE reward_id=?';
  connection.query(sql, [points, description, expiry_date, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    res.json({ message: 'Reward updated' });
  });
});

app.delete('/api/rewards/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM rewards WHERE reward_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    res.json({ message: 'Reward deleted' });
  });
});

/* =========================
   CUSTOMER_REWARDS (with /api)
   ========================= */
app.post('/api/customer-rewards', (req, res) => {
  const { customer_id, reward_id, used_status } = req.body;
  if (!customer_id || !reward_id || !used_status) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'INSERT INTO customer_rewards (customer_id, reward_id, used_status) VALUES (?, ?, ?)';
  connection.query(sql, [customer_id, reward_id, used_status], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Customer reward added', customer_reward_id: result.insertId });
  });
});

app.get('/api/customer-rewards', (req, res) => {
  connection.query('SELECT * FROM customer_rewards', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/customer-rewards/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM customer_rewards WHERE customer_reward_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Customer reward not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/customer-rewards/:id', (req, res) => {
  const { id } = req.params;
  const { customer_id, reward_id, used_status } = req.body;
  if (!customer_id || !reward_id || !used_status) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = `UPDATE customer_rewards SET customer_id=?, reward_id=?, used_status=? WHERE customer_reward_id=?`;
  connection.query(sql, [customer_id, reward_id, used_status, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer reward not found' });
    }
    res.json({ message: 'Customer reward updated' });
  });
});

app.delete('/api/customer-rewards/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM customer_rewards WHERE customer_reward_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer reward not found' });
    }
    res.json({ message: 'Customer reward deleted' });
  });
});

/* =========================
   NOTIFICATIONS (with /api)
   ========================= */
app.post('/api/notifications', (req, res) => {

  const { user_id, message, status } = req.body;

  console.log("Notification payload:", req.body);

  if (!user_id || !message || !status) {
    return res.status(400).json({
      error: 'user_id, message and status are required'
    });
  }

  const sql = `
    INSERT INTO notifications (user_id, message, status)
    VALUES (?, ?, ?)
  `;

  connection.query(sql, [user_id, message, status], (err, result) => {

    if (err) {
      console.error("Notification DB error:", err);
      return res.status(500).json({
        error: err.sqlMessage
      });
    }

    res.status(201).json({
      message: "Notification stored",
      notification_id: result.insertId
    });

  });
});

app.get('/api/notifications', (req, res) => {
  connection.query('SELECT * FROM notifications', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM notifications WHERE notification_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const { user_id, message, status } = req.body;
  if (!user_id || !message || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'UPDATE notifications SET user_id=?, message=?, status=? WHERE notification_id=?';
  connection.query(sql, [user_id, message, status, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification updated' });
  });
});

app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM notifications WHERE notification_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted' });
  });
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { id } = req.params;
  try {
    await db.query('UPDATE notifications SET status = ? WHERE notification_id = ?', ['read', id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   CONTACT_MESSAGES (with /api)
   ========================= */
app.post('/api/contact-messages', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)';
  connection.query(sql, [name, email, message], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'Message sent', contact_id: result.insertId });
  });
});

app.get('/api/contact-messages', (req, res) => {
  connection.query('SELECT * FROM contact_messages', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/contact-messages/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM contact_messages WHERE contact_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/contact-messages/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'UPDATE contact_messages SET name=?, email=?, message=? WHERE contact_id=?';
  connection.query(sql, [name, email, message, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: 'Message updated' });
  });
});

app.delete('/api/contact-messages/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM contact_messages WHERE contact_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: 'Message deleted' });
  });
});

/* =========================
   FAQS (with /api)
   ========================= */
app.post('/api/faqs', (req, res) => {
  const { question, answer, status } = req.body;
  if (!question || !answer || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'INSERT INTO faqs (question, answer, status) VALUES (?, ?, ?)';
  connection.query(sql, [question, answer, status], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(201).json({ message: 'FAQ added', faq_id: result.insertId });
  });
});

app.get('/api/faqs', (req, res) => {
  connection.query('SELECT * FROM faqs', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/api/faqs/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM faqs WHERE faq_id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    res.json(results[0]);
  });
});

app.put('/api/faqs/:id', (req, res) => {
  const { id } = req.params;
  const { question, answer, status } = req.body;
  if (!question || !answer || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = 'UPDATE faqs SET question=?, answer=?, status=? WHERE faq_id=?';
  connection.query(sql, [question, answer, status, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    res.json({ message: 'FAQ updated' });
  });
});

app.delete('/api/faqs/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM faqs WHERE faq_id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    res.json({ message: 'FAQ deleted' });
  });
});

/* =========================
   LOYALTY OFFERS DASHBOARD
   ========================= */
app.get('/api/loyalty/dashboard', (req, res) => {

  /* Auto expire offers if date passed */
  connection.query(
    "UPDATE offers SET status='expired' WHERE valid_until < CURDATE() AND status != 'expired'"
  );

  /* ================= MEMBERS ================= */

  connection.query(
    'SELECT COUNT(*) as total FROM loyalty_members',
    (err, memberTotal) => {

      if (err) return res.status(500).json({ error: err.message });

      connection.query(
        'SELECT COUNT(*) as active FROM loyalty_members WHERE status="active"',
        (err, activeMembers) => {

          if (err) return res.status(500).json({ error: err.message });

          connection.query(
            'SELECT SUM(points) as issued, SUM(points_redeemed) as redeemed FROM loyalty_members',
            (err, pointsData) => {

              if (err) return res.status(500).json({ error: err.message });

              const totalMembers = memberTotal[0]?.total || 0;
              const activeCount = activeMembers[0]?.active || 0;
              const pointsIssued = pointsData[0]?.issued || 0;
              const pointsRedeemed = pointsData[0]?.redeemed || 0;

              const avgPoints =
                totalMembers > 0
                  ? (pointsIssued / totalMembers).toFixed(1)
                  : 0;

              const overview = [
                { label: 'Total Members', value: totalMembers },
                { label: 'Active Members', value: activeCount },
                { label: 'Points Issued', value: pointsIssued },
                { label: 'Points Redeemed', value: pointsRedeemed },
                { label: 'Avg Points/Member', value: avgPoints }
              ];

              /* ================= OFFERS ================= */

              const offersSQL = `
              SELECT *,
              CASE
                WHEN valid_until < CURDATE() THEN 'expired'
                WHEN start_date > CURDATE() THEN 'upcoming'
                ELSE 'active'
              END as computed_status
              FROM offers
              ORDER BY created_at DESC
              `;

              connection.query(offersSQL, (err, offers) => {

                if (err) return res.status(500).json({ error: err.message });

                const offersData = {
                  active: [],
                  upcoming: [],
                  expired: []
                };

               offers.forEach(offer => {

  const status = offer.computed_status;

  const formattedOffer = {
    id: offer.offer_code,
    name: offer.offer_name,
    type: offer.offer_type,
    discount: offer.discount_value,
    minPurchase: offer.min_purchase,
    startDate: offer.start_date,   // ✅ FIXED
    validUntil: offer.valid_until,
    redeemed: offer.redeemed || 0,
    total: offer.total_offers || 0,
    status: status
  };

  offersData[status].push(formattedOffer);

});
                /* ================= TIERS ================= */

                connection.query(
                  'SELECT tier, COUNT(*) as count FROM loyalty_members GROUP BY tier',
                  (err, tiers) => {

                    if (err) return res.status(500).json({ error: err.message });

                    const tierMap = {
                      Bronze: 0,
                      Silver: 0,
                      Gold: 0,
                      Platinum: 0
                    };

                    tiers.forEach(t => {
                      tierMap[t.tier] = t.count;
                    });

                    const loyaltyTiers = [
                      { tier: 'Bronze', members: tierMap.Bronze },
                      { tier: 'Silver', members: tierMap.Silver },
                      { tier: 'Gold', members: tierMap.Gold },
                      { tier: 'Platinum', members: tierMap.Platinum }
                    ];

                    /* ================= TRANSACTIONS ================= */

                    connection.query(
                      'SELECT * FROM point_transactions ORDER BY transaction_date DESC LIMIT 10',
                      (err, transactions) => {

                        if (err) return res.status(500).json({ error: err.message });

                        const pointActivities = transactions.map(t => ({
                          customer: t.member_name,
                          activity: t.activity,
                          points: t.points,
                          date: t.transaction_date
                        }));

                        /* ================= TOP REDEEMERS ================= */

                        connection.query(
                          `SELECT name,tier,points,
                           points_redeemed as redeemed,
                           joined_date as joined
                           FROM loyalty_members
                           ORDER BY points_redeemed DESC
                           LIMIT 5`,
                          (err, redeemers) => {

                            if (err)
                              return res.status(500).json({ error: err.message });

                            const topRedeemers = redeemers.map(r => ({
                              customer: r.name,
                              tier: r.tier,
                              points: r.points,
                              redeemed: r.redeemed,
                              joined: r.joined
                            }));

                            res.json({
                              overview,
                              offers: offersData,
                              loyaltyTiers,
                              pointActivities,
                              topRedeemers
                            });

                          }
                        );
                      }
                    );
                  }
                );
              });
            }
          );
        }
      );
    }
  );
});


/* =========================
   GET ALL OFFERS
   ========================= */
app.get('/api/loyalty/offers', (req, res) => {

  const sql = `
  SELECT *,
  CASE
    WHEN valid_until < CURDATE() THEN 'expired'
    WHEN status='upcoming' THEN 'upcoming'
    ELSE 'active'
  END as computed_status
  FROM offers
  ORDER BY created_at DESC
  `;

  connection.query(sql, (err, results) => {

    if (err) return res.status(500).json({ error: err.message });

    res.json(results);

  });

});


// Add this import at the top of your server.js (if not already present)


// =========================
// CREATE OFFER (with WhatsApp notifications)
// =========================
app.post('/api/loyalty/offers', async (req, res) => {
  const db = connection.promise();
  const { 
    name, type, discount, minPurchase, 
    startDate, validUntil, totalOffers,
    notify_customers = true   // Optional: set to false to skip notifications
  } = req.body;

  // Validation
  if (!name || !type || !discount || !startDate || !validUntil) {
    return res.status(400).json({ message: 'Required fields missing' });
  }

  try {
    // Generate unique offer code
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 900 + 100);
    const offerCode = "OFF-" + timestamp + random;

    // Insert offer into database
    const sql = `
      INSERT INTO offers
      (offer_code, offer_name, offer_type, discount_value, min_purchase, 
       start_date, valid_until, total_offers, status, redeemed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
    `;

    await db.query(sql, [
      offerCode, name, type, discount, minPurchase || 0, 
      startDate, validUntil, totalOffers || null
    ]);

    // Prepare offer object for WhatsApp notification
    const newOffer = {
      offer_code: offerCode,
      offer_name: name,
      offer_type: type,
      discount_value: discount,
      min_purchase: minPurchase || 0,
      valid_until: validUntil
    };

    let notificationResults = [];
    let notificationsSent = 0;

    // Send WhatsApp notifications if requested
    if (notify_customers) {
      try {
        // Fetch customers who have opted in for WhatsApp notifications
        const [customers] = await db.query(`
          SELECT customer_id, name, phone_no, whatsapp_opt_in 
          FROM customers 
          WHERE whatsapp_opt_in = TRUE 
            AND phone_no IS NOT NULL 
            AND phone_no != ''
        `);

        if (customers.length > 0) {
          console.log(`📱 Broadcasting offer to ${customers.length} customers...`);
          
          // Send notifications with a small delay between each to avoid rate limiting
          for (const customer of customers) {
            try {
              const result = await whatsappService.sendOfferNotification(customer, newOffer);
              notificationResults.push({ 
                customer_id: customer.customer_id, 
                success: true, 
                ...result 
              });
              notificationsSent++;
              
              // Add 500ms delay between messages (WhatsApp rate limit protection)
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Failed to send WhatsApp to customer ${customer.customer_id}:`, error.message);
              notificationResults.push({ 
                customer_id: customer.customer_id, 
                success: false, 
                error: error.message 
              });
            }
          }
          
          console.log(`✅ Offer notifications sent: ${notificationsSent}/${customers.length}`);
        } else {
          console.log('ℹ️ No customers opted in for WhatsApp notifications');
        }
      } catch (notifyError) {
        // Log but don't fail the offer creation
        console.error('❌ WhatsApp notification error:', notifyError);
      }
    }

    // Return success response with notification stats
    res.status(201).json({
      message: 'Offer created successfully',
      offer_code: offerCode,
      notifications_sent: notificationsSent,
      total_opted_in_customers: notificationResults.length
    });

  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});
// Add to your server.js

// Opt-in to WhatsApp notifications
app.post('/api/customers/whatsapp/opt-in', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const customerId = req.user.id;

  try {
    await db.query(
      'UPDATE customers SET whatsapp_opt_in = TRUE WHERE customer_id = ?',
      [customerId]
    );

    res.json({ message: 'Successfully opted in to WhatsApp notifications' });
  } catch (error) {
    console.error('Opt-in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Opt-out from WhatsApp notifications
app.post('/api/customers/whatsapp/opt-out', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const customerId = req.user.id;

  try {
    await db.query(
      'UPDATE customers SET whatsapp_opt_in = FALSE WHERE customer_id = ?',
      [customerId]
    );

    res.json({ message: 'Successfully opted out from WhatsApp notifications' });
  } catch (error) {
    console.error('Opt-out error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get WhatsApp opt-in status
app.get('/api/customers/whatsapp/status', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const customerId = req.user.id;

  try {
    const [rows] = await db.query(
      'SELECT whatsapp_opt_in FROM customers WHERE customer_id = ?',
      [customerId]
    );

    res.json({ 
      whatsapp_opt_in: rows.length > 0 ? rows[0].whatsapp_opt_in : false 
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// Test endpoint - send offer to specific customer
app.post('/api/loyalty/offers/:code/test-notification', authenticateToken, async (req, res) => {
  const db = connection.promise();
  const { code } = req.params;
  const { customer_id } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    // Get offer details
    const [offers] = await db.query(
      'SELECT * FROM offers WHERE offer_code = ?',
      [code]
    );

    if (offers.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Get customer details
    const [customers] = await db.query(
      'SELECT customer_id, name, phone_no FROM customers WHERE customer_id = ?',
      [customer_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customers[0];
    const offer = offers[0];

    // Send WhatsApp notification
    const result = await whatsappService.sendOfferNotification(customer, offer);

    res.json({ 
      message: 'Test notification sent successfully',
      result 
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/test-whatsapp', authenticateToken, async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await whatsappService.sendMessage(phone, 'Test from FreshBasket!');
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code });
  }
});
/* =========================
   UPDATE OFFER
   ========================= */
app.put('/api/loyalty/offers/:code', (req, res) => {

  const { name, type, discount, minPurchase, startDate, validUntil, totalOffers, status } = req.body;

  const sql = `
  UPDATE offers
  SET offer_name=?, offer_type=?, discount_value=?, min_purchase=?,
      start_date=?, valid_until=?, total_offers=?, status=?
  WHERE offer_code=?
  `;

  connection.query(
    sql,
    [
      name,
      type,
      discount,
      minPurchase || 0,
      startDate,              // ✅ added
      validUntil,
      totalOffers || null,
      status,
      req.params.code
    ],
    (err, result) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: 'Offer updated successfully' });

    }
  );
});


/* =========================
   DELETE OFFER
   ========================= */
app.delete('/api/loyalty/offers/:code', (req, res) => {

  const sql = 'DELETE FROM offers WHERE offer_code=?';

  connection.query(sql, [req.params.code], (err, result) => {

    if (err) return res.status(500).json({ error: err.message });

    res.json({ message: 'Offer deleted successfully' });

  });

});

/* =========================
   REDEEM OFFER (WHEN CUSTOMER USES OFFER)
   ========================= */
app.post('/api/loyalty/redeem/:code', (req, res) => {

  const offerCode = req.params.code;

  const checkSQL = `
  SELECT redeemed, total_offers, valid_until, start_date
  FROM offers
  WHERE offer_code = ?
  `;

  connection.query(checkSQL, [offerCode], (err, result) => {

    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      return res.status(404).json({ message: "Offer not found" });
    }

    const offer = result[0];

    const today = new Date().toISOString().split("T")[0];

    /* Check date validity */
    if (offer.start_date > today) {
      return res.status(400).json({ message: "Offer not started yet" });
    }

    if (offer.valid_until < today) {
      return res.status(400).json({ message: "Offer expired" });
    }

    /* Check redemption limit */
    if (offer.total_offers && offer.redeemed >= offer.total_offers) {
      return res.status(400).json({ message: "Offer redemption limit reached" });
    }

    /* Update redeemed count */
    const updateSQL = `
    UPDATE offers
    SET redeemed = redeemed + 1
    WHERE offer_code = ?
    `;

    connection.query(updateSQL, [offerCode], (err) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json({
        message: "Offer redeemed successfully"
      });

    });

  });

});

/* =========================
   WASTE TRACKING (already under /api)
   ========================= */

// GET ALL WASTE ENTRIES (with category)
app.get('/api/waste', (req, res) => {
  const sql = `
    SELECT w.*, 
           p.product_name as product_details, 
           p.category_id,
           c.category_name
    FROM waste_tracking w
    LEFT JOIN products p ON w.product_id = p.product_id
    LEFT JOIN categories c ON p.category_id = c.category_id
    ORDER BY w.waste_date DESC
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching waste records:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// CREATE waste entry
app.post('/api/waste', (req, res) => {
  const {
    product_id,
    quantity,
    unit,
    waste_reason,
    disposal_method,
    waste_date,
    cost_loss,
    notes
  } = req.body;

  if (!product_id || !quantity || !unit || !waste_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Fetch product name from DB directly
  const getProductSql = `SELECT product_name FROM products WHERE product_id = ?`;

  connection.query(getProductSql, [product_id], (err, productResult) => {
    if (err) {
      console.error('Error fetching product:', err);
      return res.status(500).json({ error: err.message });
    }

    if (productResult.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product_name = productResult[0].product_name;

    const insertSql = `INSERT INTO waste_tracking 
      (product_id, product_name, quantity, unit, waste_reason, disposal_method, waste_date, cost_loss, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    connection.query(
      insertSql,
      [
        product_id,
        product_name,
        quantity,
        unit,
        waste_reason || null,
        disposal_method || null,
        waste_date,
        cost_loss || 0,
        notes || null
      ],
      (err, result) => {
        if (err) {
          console.error('Error inserting waste:', err);
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          message: 'Waste entry added successfully',
          waste_id: result.insertId
        });
      }
    );
  });
});

// UPDATE waste entry
app.put('/api/waste/:id', (req, res) => {
  const { id } = req.params;
  const {
    product_id,
    quantity,
    unit,
    waste_reason,
    disposal_method,
    waste_date,
    cost_loss,
    notes
  } = req.body;

  if (!product_id || !quantity || !unit || !waste_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const getProductSql = `SELECT product_name FROM products WHERE product_id = ?`;

  connection.query(getProductSql, [product_id], (err, productResult) => {
    if (err) {
      console.error('Error fetching product:', err);
      return res.status(500).json({ error: err.message });
    }

    if (productResult.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product_name = productResult[0].product_name;

    const sql = `UPDATE waste_tracking SET 
      product_id = ?, 
      product_name = ?, 
      quantity = ?, 
      unit = ?, 
      waste_reason = ?, 
      disposal_method = ?, 
      waste_date = ?, 
      cost_loss = ?, 
      notes = ?
      WHERE waste_id = ?`;

    connection.query(
      sql,
      [
        product_id,
        product_name,
        quantity,
        unit,
        waste_reason || null,
        disposal_method || null,
        waste_date,
        cost_loss || 0,
        notes || null,
        id
      ],
      (err, result) => {
        if (err) {
          console.error('Error updating waste:', err);
          return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Waste entry not found' });
        }

        res.json({ message: 'Waste entry updated successfully' });
      }
    );
  });
});

// DELETE waste entry
app.delete('/api/waste/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM waste_tracking WHERE waste_id = ?';

  connection.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting waste:', err);
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Waste entry not found' });
    }

    res.json({ message: 'Waste entry deleted successfully' });
  });
});

/* =========================
   STOCK IN CRUD
   ========================= */

// GET all stock entries (with category info from products)
app.get('/api/stock', (req, res) => {
  const sql = `
    SELECT s.*, p.category_id 
    FROM stock_in s 
    LEFT JOIN products p ON s.product_id = p.product_id 
    ORDER BY s.received_date DESC
  `;
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching stock:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

// GET expiring alerts (within next 7 days)
app.get('/api/stock/alerts', (req, res) => {
  const sql = `
    SELECT * FROM stock_in 
    WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY expiry_date
  `;
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching alerts:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

// POST new stock entry
app.post('/api/stock', (req, res) => {
  const {
    product_id, product_name, quantity, unit,
    purchase_price, supplier, received_date, expiry_date, batch_no, notes
  } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ message: 'Missing required fields (product_id, quantity)' });
  }

  const sql = `
    INSERT INTO stock_in 
    (product_id, product_name, quantity, unit, purchase_price, supplier, received_date, expiry_date, batch_no, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fresh', NOW())
  `;

  connection.query(
    sql,
    [
      product_id,
      product_name || null,
      quantity,
      unit || 'kg',
      purchase_price || null,
      supplier || null,
      received_date || null,
      expiry_date || null,
      batch_no || null,
      notes || null
    ],
    (err, result) => {
      if (err) {
        console.error('Error inserting stock:', err);
        return res.status(500).json({ message: 'Database error: ' + err.message });
      }
      res.status(201).json({ message: 'Stock added', id: result.insertId });
    }
  );
});

// PUT update stock entry
app.put('/api/stock/:id', (req, res) => {
  const id = req.params.id;
  const {
    product_id, product_name, quantity, unit,
    purchase_price, supplier, received_date, expiry_date, batch_no, notes
  } = req.body;

  const sql = `
    UPDATE stock_in SET
      product_id = ?, product_name = ?, quantity = ?, unit = ?,
      purchase_price = ?, supplier = ?, received_date = ?, expiry_date = ?,
      batch_no = ?, notes = ?
    WHERE stock_id = ?
  `;

  connection.query(
    sql,
    [product_id, product_name, quantity, unit, purchase_price, supplier, received_date, expiry_date, batch_no, notes, id],
    (err, result) => {
      if (err) {
        console.error('Error updating stock:', err);
        return res.status(500).json({ message: 'Database error: ' + err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Stock entry not found' });
      }
      res.json({ message: 'Stock updated' });
    }
  );
});

// DELETE stock entry
app.delete('/api/stock/:id', (req, res) => {
  const id = req.params.id;

  connection.query('DELETE FROM stock_in WHERE stock_id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error deleting stock:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }
    res.json({ message: 'Stock deleted' });
  });
});

// =========================
// CURRENT STOCK API
// =========================
app.get('/api/current-stock', (req, res) => {
  const query = `
    SELECT 
      p.product_id,
      p.product_name,
      p.unit,
      COALESCE((
        SELECT SUM(quantity) 
        FROM stock_in 
        WHERE product_id = p.product_id
      ), 0) as total_purchased,
      COALESCE((
        SELECT SUM(oi.quantity) 
        FROM order_items oi 
        WHERE oi.product_id = p.product_id
      ), 0) as total_sold,
      COALESCE((
        SELECT SUM(quantity) 
        FROM waste_tracking 
        WHERE product_id = p.product_id
      ), 0) as total_wasted
    FROM products p
    ORDER BY p.product_name
  `;

  connection.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching current stock:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate current stock for each row
    const stockData = rows.map(row => ({
      product_id: row.product_id,
      product_name: row.product_name,
      unit: row.unit,
      total_purchased: parseFloat(row.total_purchased),
      total_sold: parseFloat(row.total_sold),
      total_wasted: parseFloat(row.total_wasted),
      current_stock: parseFloat(row.total_purchased) - parseFloat(row.total_sold) - parseFloat(row.total_wasted),
    }));

    res.json(stockData);
  });
});

// -------------------------------
// Unified Password Reset (customers & admins)
// Uses password_resets table with user_type column
// -------------------------------

// Send OTP
app.post('/api/:userType/forgot-password', async (req, res) => {
  const { userType } = req.params; // 'customers' or 'users'
  const { email } = req.body;

  if (!['customers', 'users'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Check if user exists in the correct table
    const table = userType === 'users' ? 'users' : 'customers';
    const idField = userType === 'users' ? 'user_id' : 'customer_id';
    const [rows] = await connection.promise().query(
      `SELECT ${idField} FROM ${table} WHERE email = ?`,
      [email]
    );
    if (rows.length === 0) {
      // Security: don't reveal non-existence
      return res.status(200).json({ message: 'If your email is registered, you will receive an OTP.' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email + userType
    await connection.promise().query(
      'DELETE FROM password_resets WHERE email = ? AND user_type = ?',
      [email, userType === 'users' ? 'admin' : 'customer']
    );

    // Insert new OTP
    await connection.promise().query(
      'INSERT INTO password_resets (email, otp, expires_at, user_type) VALUES (?, ?, ?, ?)',
      [email, otp, expiresAt, userType === 'users' ? 'admin' : 'customer']
    );

    // Send email
    const subject = userType === 'users' ? 'Admin Password Reset - FreshBasket' : 'Password Reset - FreshBasket';
    const text = `Your OTP is: ${otp}. It is valid for 10 minutes.`;
    await sendEmail(email, subject, text);

    console.log(`OTP sent to ${email} (${userType})`);
    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP
app.post('/api/:userType/verify-otp', async (req, res) => {
  const { userType } = req.params;
  const { email, otp } = req.body;

  if (!['customers', 'users'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    const [rows] = await connection.promise().query(
      'SELECT * FROM password_resets WHERE email = ? AND otp = ? AND user_type = ? AND used = FALSE AND expires_at > NOW()',
      [email, otp, userType === 'users' ? 'admin' : 'customer']
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
app.post('/api/:userType/reset-password', async (req, res) => {
  const { userType } = req.params;
  const { email, otp, newPassword } = req.body;

  if (!['customers', 'users'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }

  try {
    // Verify OTP again
    const [rows] = await connection.promise().query(
      'SELECT * FROM password_resets WHERE email = ? AND otp = ? AND user_type = ? AND used = FALSE AND expires_at > NOW()',
      [email, otp, userType === 'users' ? 'admin' : 'customer']
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('New hashed password:', hashedPassword); // debug

    // Update correct table
    const table = userType === 'users' ? 'users' : 'customers';
    const [updateResult] = await connection.promise().query(
      `UPDATE ${table} SET password = ? WHERE email = ?`,
      [hashedPassword, email]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error('User not found');
    }

    // Mark OTP as used
    await connection.promise().query(
      'UPDATE password_resets SET used = TRUE WHERE id = ?',
      [rows[0].id]
    );

    console.log(`Password reset successfully for ${email} (${userType})`);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   FINANCIAL DASHBOARD API
   ========================= */
function getDateFilter(timeRange) {
  switch (timeRange) {
    case 'daily':
      return "DATE(order_date) = CURDATE()";
    case 'weekly':
      return "YEARWEEK(order_date, 1) = YEARWEEK(CURDATE(), 1)";
    case 'monthly':
      return "MONTH(order_date) = MONTH(CURDATE()) AND YEAR(order_date) = YEAR(CURDATE())";
    case 'yearly':
      return "YEAR(order_date) = YEAR(CURDATE())";
    default:
      return "MONTH(order_date) = MONTH(CURDATE()) AND YEAR(order_date) = YEAR(CURDATE())";
  }
}

app.get('/api/financial/overview', (req, res) => {
  const timeRange = req.query.timeRange || 'monthly';
  const dateFilter = getDateFilter(timeRange);
  const currentQuery = `
    SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_revenue
    FROM orders
    WHERE ${dateFilter} AND order_status NOT IN ('cancelled')
  `;
  connection.query(currentQuery, (err, currentRows) => {
    if (err) {
      console.error('Error fetching overview current:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const current = currentRows[0];
    const orderCount = current.order_count;
    const totalRevenue = parseFloat(current.total_revenue);
    const netProfit = totalRevenue * 0.3;
    const avgOrder = orderCount ? totalRevenue / orderCount : 0;

    let prevDateFilter = '';
    switch (timeRange) {
      case 'daily':
        prevDateFilter = "DATE(order_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
        break;
      case 'weekly':
        prevDateFilter = "YEARWEEK(order_date,1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 7 DAY),1)";
        break;
      case 'monthly':
        prevDateFilter = "MONTH(order_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(order_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
        break;
      case 'yearly':
        prevDateFilter = "YEAR(order_date) = YEAR(CURDATE())-1";
        break;
      default:
        prevDateFilter = "MONTH(order_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(order_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
    }

    const prevQuery = `
      SELECT COUNT(*) as prev_count, COALESCE(SUM(total_amount),0) as prev_revenue
      FROM orders
      WHERE ${prevDateFilter} AND order_status NOT IN ('cancelled')
    `;
    connection.query(prevQuery, (err, prevRows) => {
      if (err) {
        console.error('Error fetching overview previous:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      const prev = prevRows[0];
      const prevRevenue = parseFloat(prev.prev_revenue);
      const prevOrderCnt = prev.prev_count;
      const prevAvg = prevOrderCnt ? prevRevenue / prevOrderCnt : 0;

      const revChange = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
      const ordChange = prevOrderCnt ? ((orderCount - prevOrderCnt) / prevOrderCnt * 100) : 0;
      const avgChange = prevAvg ? ((avgOrder - prevAvg) / prevAvg * 100) : 0;

      const overview = [
        {
          title: 'Total Revenue',
          value: totalRevenue,
          change: (revChange >= 0 ? '+' : '') + revChange.toFixed(1) + '%',
          icon: 'rupee-sign',
          color: '#27ae60'
        },
        {
          title: 'Net Profit',
          value: netProfit,
          change: (revChange >= 0 ? '+' : '') + revChange.toFixed(1) + '%',
          icon: 'chart-line',
          color: '#3498db'
        },
        {
          title: 'Orders',
          value: orderCount,
          change: (ordChange >= 0 ? '+' : '') + ordChange.toFixed(1) + '%',
          icon: 'shopping-cart',
          color: '#9b59b6'
        },
        {
          title: 'Avg. Order Value',
          value: avgOrder,
          change: (avgChange >= 0 ? '+' : '') + avgChange.toFixed(1) + '%',
          icon: 'calculator',
          color: '#e67e22'
        }
      ];
      res.json(overview);
    });
  });
});

app.get('/api/financial/revenue-trend', (req, res) => {
  const months = 6;
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const start = `${year}-${month.toString().padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    const query = `
      SELECT COALESCE(SUM(total_amount),0) as revenue
      FROM orders
      WHERE order_date BETWEEN ? AND ? AND order_status NOT IN ('cancelled')
    `;
    connection.query(query, [start, end], (err, rows) => {
      if (err) {
        console.error('Error in revenue trend:', err);
      }
      const revenue = rows && rows.length ? parseFloat(rows[0].revenue) : 0;
      const profit = revenue * 0.3;
      result.push({
        month: d.toLocaleString('default', { month: 'short' }),
        revenue,
        profit
      });
      if (result.length === months && !res.headersSent) {
        result.sort((a, b) => {
          const monthsOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return monthsOrder.indexOf(a.month) - monthsOrder.indexOf(b.month);
        });
        res.json(result);
      }
    });
  }
});

app.get('/api/financial/top-categories', (req, res) => {
  const timeRange = req.query.timeRange || 'monthly';
  const dateFilter = getDateFilter(timeRange);
  const query = `
    SELECT c.category_name as name, SUM(oi.subtotal) as revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN categories c ON p.category_id = c.category_id
    WHERE ${dateFilter} AND o.order_status NOT IN ('cancelled')
    GROUP BY c.category_id
    ORDER BY revenue DESC
    LIMIT 5
  `;
  connection.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching top categories:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const totalRevenue = rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
    const categories = rows.map(row => ({
      name: row.name,
      revenue: parseFloat(row.revenue),
      percentage: totalRevenue ? Math.round((row.revenue / totalRevenue) * 100) : 0,
      growth: 0
    }));
    res.json(categories);
  });
});

app.get('/api/financial/recent-transactions', (req, res) => {

  const query = `
    SELECT 
      o.order_id as id,
      c.name as customer,
      o.total_amount as amount,
      o.order_date as date,
      o.order_status as status
    FROM orders o
    LEFT JOIN customers c 
      ON o.user_id = c.customer_id
    WHERE o.order_status NOT IN ('cancelled')
    ORDER BY o.order_date DESC
    LIMIT 10
  `;

  connection.query(query, (err, rows) => {

    if (err) {
      console.error('Error fetching recent transactions:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const transactions = rows.map(row => ({
      id: 'INV-' + String(row.id).padStart(3, '0'),
      customer: row.customer || 'Guest',
      amount: parseFloat(row.amount),
      date: row.date,
      status:
        row.status === 'delivered'
          ? 'Paid'
          : row.status === 'pending'
          ? 'Pending'
          : 'Failed'
    }));

    res.json(transactions);

  });

});
app.get('/api/financial/key-metrics', (req, res) => {
  const timeRange = req.query.timeRange || 'monthly';
  const dateFilter = getDateFilter(timeRange);
  const paymentQuery = `
    SELECT COUNT(*) as total,
           SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as successful
    FROM orders
    WHERE ${dateFilter}
  `;
  connection.query(paymentQuery, (err, payRows) => {
    if (err) {
      console.error('Error fetching payment success:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const total = payRows[0].total;
    const successful = payRows[0].successful;
    const paymentSuccess = total ? (successful / total) * 100 : 100;
    const metrics = {
      grossMargin: '32.5%',
      grossMarginChange: 1.2,
      operatingExpenses: '₹23,450',
      operatingExpensesChange: -0.5,
      cac: 1250,
      cacChange: 2.1,
      repeatRate: '43%',
      repeatRateChange: 3.4,
      inventoryTurnover: '4.2x',
      inventoryTurnoverChange: 0.3,
      paymentSuccess: paymentSuccess.toFixed(1) + '%',
      paymentSuccessChange: 0.1
    };
    res.json(metrics);
  });
});
function getPrevDateFilter(timeRange) {
  switch (timeRange) {
    case 'daily':
      return "DATE(order_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
    case 'weekly':
      return "YEARWEEK(order_date,1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 7 DAY),1)";
    case 'monthly':
      return "MONTH(order_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(order_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
    case 'yearly':
      return "YEAR(order_date) = YEAR(CURDATE())-1";
    default:
      return "MONTH(order_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(order_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
  }
}
app.get('/api/financial/top-products', (req, res) => {
  const timeRange = req.query.timeRange || 'monthly';
  const dateFilter = getDateFilter(timeRange);
  const prevDateFilter = getPrevDateFilter(timeRange);

  // Get current period top 5 products
  const currentQuery = `
    SELECT p.product_id, p.product_name as name, SUM(oi.subtotal) as revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN products p ON oi.product_id = p.product_id
    WHERE ${dateFilter} AND o.order_status NOT IN ('cancelled')
    GROUP BY p.product_id
    ORDER BY revenue DESC
    LIMIT 5
  `;

  connection.query(currentQuery, (err, currentRows) => {
    if (err) {
      console.error('Error fetching top products:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const products = currentRows.map(row => ({
      product_id: row.product_id,
      name: row.name,
      revenue: parseFloat(row.revenue),
    }));

    // For each product, get previous period revenue to calculate growth
    const prevPromises = products.map(product => {
      return new Promise((resolve, reject) => {
        const prevQuery = `
          SELECT COALESCE(SUM(oi.subtotal),0) as prev_revenue
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.order_id
          WHERE oi.product_id = ? AND ${prevDateFilter} AND o.order_status NOT IN ('cancelled')
        `;
        connection.query(prevQuery, [product.product_id], (err, prevRows) => {
          if (err) reject(err);
          else resolve({ product_id: product.product_id, prev_revenue: parseFloat(prevRows[0].prev_revenue) });
        });
      });
    });

    Promise.all(prevPromises)
      .then(prevData => {
        const result = products.map(p => {
          const prev = prevData.find(pd => pd.product_id === p.product_id)?.prev_revenue || 0;
          const growth = prev ? ((p.revenue - prev) / prev * 100) : 0;
          return {
            name: p.name,
            revenue: p.revenue,
            growth: Math.round(growth * 10) / 10 // one decimal
          };
        });
        res.json(result);
      })
      .catch(error => {
        console.error('Error in top-products growth calculation:', error);
        res.status(500).json({ error: 'Database error' });
      });
  });
});
app.get('/api/financial/daily-summary', (req, res) => {
  const days = parseInt(req.query.days) || 7; // default last 7 days

  const orderQuery = `
    SELECT
      DATE(order_date) as date,
      COALESCE(SUM(total_amount),0) as revenue,
      COUNT(*) as orders,
      COALESCE(SUM(total_amount)*0.3,0) as profit
    FROM orders
    WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND order_status NOT IN ('cancelled')
    GROUP BY DATE(order_date)
    ORDER BY date DESC
  `;

  connection.query(orderQuery, [days], (err, orderRows) => {
    if (err) {
      console.error('Error fetching daily orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const wasteQuery = `
      SELECT DATE(waste_date) as date, COALESCE(SUM(cost_loss),0) as waste
      FROM waste_tracking
      WHERE waste_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(waste_date)
    `;

    connection.query(wasteQuery, [days], (err, wasteRows) => {
      if (err) {
        console.error('Error fetching daily waste:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const wasteMap = {};
      wasteRows.forEach(w => { wasteMap[w.date] = parseFloat(w.waste); });

      const summary = orderRows.map(row => {
        const dateStr = row.date.toISOString().split('T')[0];
        return {
          date: dateStr,
          revenue: parseFloat(row.revenue),
          orders: row.orders,
          profit: parseFloat(row.profit),
          waste: wasteMap[dateStr] || 0
        };
      });

      res.json(summary);
    });
  });
});
/* =========================
   SERVER START
   ========================= */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});