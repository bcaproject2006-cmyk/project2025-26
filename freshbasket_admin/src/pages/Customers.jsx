import { useState, useEffect } from "react";
import axios from "axios";
import "./Customers.css";

const API_BASE = "http://localhost:8000/api";

const Customers = () => {
  // State for data
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  
  // View modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);

  // Helper to get token from either storage
  const getToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();

      const [custRes, ordRes, rewRes] = await Promise.all([
        axios.get(`${API_BASE}/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/rewards`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setCustomers(custRes.data);
      setOrders(ordRes.data);
      setRewards(rewRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  // Compute per-customer totals from orders (using user_id from orders)
  const customerPayments = customers.map((customer) => {
    const customerOrders = orders.filter(
      (o) => o.user_id === customer.customer_id && o.order_status !== "cancelled"
    );
    const totalPaid = customerOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    return { ...customer, totalPaid };
  });

  // Filter by search (name, email, phone, customer ID)
  const filteredCustomers = customerPayments.filter(
    (c) =>
      c.customer_id?.toString().includes(searchTerm) ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone_no && c.phone_no.includes(searchTerm))
  );

  // Statistics
  const totalCustomers = customers.length;
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalRewardPoints = customers.reduce((sum, c) => sum + (c.reward_points || 0), 0);
  const avgPoints = totalCustomers ? (totalRewardPoints / totalCustomers).toFixed(0) : 0;

  // ---------- Customer CRUD ----------
  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      const token = getToken();
      await axios.delete(`${API_BASE}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllData();
    } catch (err) {
      alert("Failed to delete customer.");
    }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone_no: formData.get("phone_no"),
      address: formData.get("address"),
      reward_points: parseInt(formData.get("reward_points")) || 0,
    };
    if (!editingCustomer) {
      payload.password = formData.get("password");
    }

    try {
      const token = getToken();
      if (editingCustomer) {
        await axios.put(`${API_BASE}/customers/${editingCustomer.customer_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE}/customers`, payload);
      }
      fetchAllData();
      setShowCustomerModal(false);
    } catch (err) {
      alert(editingCustomer ? "Update failed." : "Creation failed.");
    }
  };

  // ---------- Payment ----------
  const openPaymentModal = (customer) => {
    setPaymentCustomer(customer);
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentCustomer || !paymentAmount) return;

    // Reward points: 10 points per ₹100 spent (floor) – calculated but not used for DB update
    const pointsEarned = Math.floor(parseFloat(paymentAmount) / 100) * 10;

    try {
      const token = getToken();

      // Create an order for this payment
      await axios.post(`${API_BASE}/orders`, {
        user_id: paymentCustomer.customer_id,
        order_date: paymentDate,
        total_amount: parseFloat(paymentAmount),
        payment_mode: "Cash",
        order_status: "completed",
        items: [], // No items for a manual payment – adjust if needed
        shipping_address: paymentCustomer.address || "No address provided",
        delivery_fee: 0,
        discount: 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // No need to manually update reward_points – backend handles it

      fetchAllData();
      setShowPaymentModal(false);
      setPaymentCustomer(null);
    } catch (err) {
      console.error(err);
      alert("Payment recording failed. " + (err.response?.data?.error || ""));
    }
  };

  // ---------- View Details ----------
  const openViewModal = (customer) => {
    setViewCustomer(customer);
    setShowViewModal(true);
  };

  if (loading && customers.length === 0) {
    return (
      <div className="customers-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customers-page">
      {/* Header */}
      <div className="page-header">
        <h1>Customer Ledger</h1>
        <p>View all customers, payment history, and record new payments</p>
      </div>

      {error && (
        <div className="error-banner">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{totalCustomers}</h3>
            <p>Total Customers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>₹{totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <h3>{totalRewardPoints}</h3>
            <p>Total Points</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{avgPoints}</h3>
            <p>Avg Points</p>
          </div>
        </div>
      </div>

      {/* Main Customer Table */}
      <div className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2>
              <i className="fas fa-users"></i> Customer Ledger
            </h2>
            <span className="item-count">{filteredCustomers.length} customers</span>
          </div>
          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by name, email, phone, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" onClick={fetchAllData}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>

          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Address</th>
                <th>Total Paid (₹)</th>
                <th>Reward Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.customer_id}>
                <td>
                  <div className="customer-cell">
                    <span className="customer-avatar-small">
                      {customer.name ? customer.name.charAt(0).toUpperCase() : "?"}
                    </span>

                    <div className="customer-details">
                      <div className="customer-name">{customer.name || "Guest"}</div>
                      <div className="customer-email">{customer.email || "-"}</div>
                      <div className="customer-phone">{customer.phone_no || "-"}</div>
                    </div>
                  </div>
                </td>

                <td>{customer.address || "-"}</td>
                  <td>
                    <span className="product-count">₹{customer.totalPaid.toFixed(2)}</span>
                  </td>
                  <td>
                    <span className="product-count">{customer.reward_points || 0}</span>
                  </td>
                  <td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button
                        className="action-button view"
                        onClick={() => openViewModal(customer)}
                        title="View Details"
                      >
                      <i className="fas fa-eye"></i>
                      </button>
                    </div>
                  </td>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-users"></i>
              <h4>No customers found</h4>
              <p>Add your first customer to get started.</p>
              <button className="btn btn-primary" onClick={handleAddCustomer}>
                <i className="fas fa-plus"></i> Add Customer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-user"></i>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </h3>
              <button className="modal-close" onClick={() => setShowCustomerModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingCustomer?.name || ""}
                  placeholder="Full name"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingCustomer?.email || ""}
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  name="phone_no"
                  defaultValue={editingCustomer?.phone_no || ""}
                  placeholder="Phone number"
                  required
                />
              </div>
              {!editingCustomer && (
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  defaultValue={editingCustomer?.address || ""}
                  placeholder="Address"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Reward Points</label>
                <input
                  type="number"
                  name="reward_points"
                  defaultValue={editingCustomer?.reward_points || 0}
                  min="0"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? "Update Customer" : "Add Customer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && paymentCustomer && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-coins"></i>
                Record Payment for {paymentCustomer.name || `Customer #${paymentCustomer.customer_id}`}
              </h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="modal-form">
              <div className="form-group">
                <label>Customer</label>
                <input
                  type="text"
                  value={`${paymentCustomer.name || "Guest"} (ID: ${paymentCustomer.customer_id})`}
                  disabled
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Details Modal */}
      {showViewModal && viewCustomer && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3><i className="fas fa-user"></i> Customer Details</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><strong>ID:</strong> {viewCustomer.customer_id}</div>
              <div className="detail-row"><strong>Name:</strong> {viewCustomer.name || "Guest"}</div>
              <div className="detail-row"><strong>Email:</strong> {viewCustomer.email || "-"}</div>
              <div className="detail-row"><strong>Phone:</strong> {viewCustomer.phone_no || "-"}</div>
              <div className="detail-row"><strong>Address:</strong> {viewCustomer.address || "-"}</div>
              <div className="detail-row"><strong>Total Paid:</strong> ₹{viewCustomer.totalPaid?.toFixed(2)}</div>
              <div className="detail-row"><strong>Reward Points:</strong> {viewCustomer.reward_points || 0}</div>
              <div className="detail-row"><strong>Recent Orders:</strong></div>
              <ul className="order-list">
                {orders
                  .filter(o => o.user_id === viewCustomer.customer_id && o.order_status !== "cancelled")
                  .slice(0, 5)
                  .map(o => (
                    <li key={o.order_id}>
                      Order #{o.order_id} – ₹{parseFloat(o.total_amount).toFixed(2)} ({new Date(o.order_date).toLocaleDateString()})
                    </li>
                  ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;