const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Create a Razorpay order
router.post('/create-razorpay-order', async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body; // amount in paise
    const options = {
      amount: amount, // e.g., 50000 for ₹500
      currency: currency || 'INR',
      receipt: receipt || 'receipt#1',
      payment_capture: 1, // auto-capture
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// 2. Verify payment signature and create order in DB
router.post('/verify-razorpay-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderPayload, // your existing order data (user_id, items, etc.)
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

    // Payment verified – now create the order in your database
    // (Reuse your existing order creation logic here)
    const { user_id, payment_mode, order_status, total_amount, items, shipping_address } = orderPayload;

    // Add payment details to the order record (optional)
    // e.g., payment_id, payment_status = 'paid'

    // Call your database function to insert order and items
    // For example:
    // const newOrder = await db.orders.create({ user_id, payment_mode: 'razorpay', total_amount, shipping_address, payment_id: razorpay_payment_id, payment_status: 'paid' });
    // then insert items...

    // Simulate success response
    res.json({
      success: true,
      message: 'Payment verified and order created',
      payment_id: razorpay_payment_id,
      // order_id: newOrder.id
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;