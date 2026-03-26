// pages/WasteTracking.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WasteTracking.css';

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000'
  : '';

const WasteTracking = () => {

  const [dateRange, setDateRange] = useState('thisMonth');
  const [wasteEntries, setWasteEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    quantity: '',
    unit: 'kg',
    waste_reason: '',
    disposal_method: '',
    waste_date: new Date().toISOString().split('T')[0],
    cost_loss: '',
    notes: ''
  });

  useEffect(() => {
    fetchWasteEntries();
  }, [dateRange]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products`);
      setProducts(response.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchWasteEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/waste`);
      setWasteEntries(response.data);
    } catch (err) {
      console.error('Error fetching waste entries:', err);
      setError(
        err.response
          ? `Server error: ${err.response.status}`
          : 'Failed to connect to server'
      );
    } finally {
      setLoading(false);
    }
  };

const calculateCostLoss = (productId, quantity) => {

  const product = products.find(p => p.product_id === parseInt(productId));

  if (!product) return "0.00";

  const rate = parseFloat(product.price || product.rate || 0);
  const qty = parseFloat(quantity || 0);

  return (rate * qty).toFixed(2);
};

const handleFormChange = (e) => {

  const { name, value } = e.target;

  const updatedData = {
    ...formData,
    [name]: value
  };

  // recalculate cost when product OR quantity changes
  if (name === "quantity" || name === "product_id") {
    updatedData.cost_loss = calculateCostLoss(
      name === "product_id" ? value : updatedData.product_id,
      name === "quantity" ? value : updatedData.quantity
    );
  }

  setFormData(updatedData);
};

  const handleAddClick = () => {

    setEditingEntry(null);

    setFormData({
      product_id: '',
      product_name: '',
      quantity: '',
      unit: 'kg',
      waste_reason: '',
      disposal_method: '',
      waste_date: new Date().toISOString().split('T')[0],
      cost_loss: '',
      notes: ''
    });

    setShowModal(true);
  };

  const handleEditClick = (simplifiedEntry) => {

    const fullEntry = wasteEntries.find(e => e.waste_id === simplifiedEntry.id);

    if (!fullEntry) {
      alert('Entry not found');
      return;
    }

    setEditingEntry(fullEntry);

    setFormData({
      product_id: fullEntry.product_id,
      product_name: fullEntry.product_name,
      quantity: fullEntry.quantity,
      unit: fullEntry.unit,
      waste_date: fullEntry.waste_date,
      cost_loss: fullEntry.cost_loss,
      notes: fullEntry.notes
    });

    setShowModal(true);
  };

  const handleDeleteClick = async (id) => {

    if (!window.confirm('Delete this entry?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/waste/${id}`);
      fetchWasteEntries();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleFormSubmit = async (e) => {

    e.preventDefault();

    try {

      if (editingEntry) {

        await axios.put(
          `${API_BASE_URL}/api/waste/${editingEntry.waste_id}`,
          formData
        );

      } else {

        await axios.post(
          `${API_BASE_URL}/api/waste`,
          formData
        );
      }

      setShowModal(false);
      fetchWasteEntries();

    } catch (err) {
      alert("Save failed");
    }
  };

  const filteredEntries = wasteEntries.filter(e => {

    const matchesSearch =
      !searchTerm ||
      (e.product_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      e.category_id === parseInt(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  const recentWasteEntries = filteredEntries
    .sort((a, b) => new Date(b.waste_date) - new Date(a.waste_date))
    .slice(0, 5)
    .map(e => {

      const dateObj = new Date(e.waste_date);

      const formattedDate =
        dateObj.toLocaleDateString() + " " +
        dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        id: e.waste_id,
        product: e.product_name,
        weight: `${e.quantity} ${e.unit}`,
        cost_loss: e.cost_loss,
        date: formattedDate
      };
    });

  if (loading) {
    return <div className="waste-tracking">Loading...</div>;
  }

  if (error) {
    return <div className="waste-tracking">{error}</div>;
  }

  return (

    <div className="waste-tracking">

      <div className="page-header">

        <div className="header-title">
          <h1>Waste Tracking & Management</h1>
          <p>Monitor, analyze, and reduce waste across your operations</p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleAddClick}>
            <i className="fas fa-plus"></i> Record Waste
          </button>
        </div>

      </div>

{/* Recent Entries */}
<div className="recent-entries-card">

  <div className="card-header">

    <h2><i className="fas fa-list"></i> Recent Waste Entries</h2>

    <div className="header-actions">

      <div className="search-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e)=>setSearchTerm(e.target.value)}
        />

      </div>

      <select
        className="filter-select"
        value={categoryFilter}
        onChange={(e)=>setCategoryFilter(e.target.value)}
      >

        <option value="all">All Categories</option>

        {categories.map(cat => (
          <option key={cat.category_id} value={cat.category_id}>
            {cat.category_name}
          </option>
        ))}

      </select>

    </div>

  </div>

  <div className="table-wrapper">

    <table className="data-table">

      <thead>

        <tr>
          <th>Entry ID</th>
          <th>Product</th>
          <th>Weight</th>
          <th>Cost Loss</th>
          <th>Date & Time</th>
          <th>Actions</th>
        </tr>

      </thead>

      <tbody>

        {recentWasteEntries.map(entry => (

          <tr key={entry.id}>

            <td>
              <span className="id-badge">#{entry.id}</span>
            </td>

            <td><strong>{entry.product}</strong></td>

            <td>{entry.weight}</td>

            <td>₹{parseFloat(entry.cost_loss).toFixed(2)}</td>

            <td>{entry.date}</td>

            <td>

              <div className="action-buttons">

                <button
                  className="btn-action edit"
                  onClick={()=>handleEditClick(entry)}
                >
                  <i className="fas fa-edit"></i>
                </button>

                <button
                  className="btn-action delete"
                  onClick={()=>handleDeleteClick(entry.id)}
                >
                  <i className="fas fa-trash"></i>
                </button>

              </div>

            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>
  {showModal && (
  <div className="modal-overlay">

    <div className="modal">

      <div className="modal-header">
        <h3>
          {editingEntry ? "Edit Waste Entry" : "Record Waste"}
        </h3>

        <button
          className="modal-close"
          onClick={() => setShowModal(false)}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="modal-form">

        <div className="form-group">
          <label>Product</label>

          <select
            name="product_id"
            value={formData.product_id}
            onChange={handleFormChange}
            required
          >

            <option value="">Select Product</option>

            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.product_name}
              </option>
            ))}

          </select>

        </div>

        <div className="form-row">

          <div className="form-group">
            <label>Quantity</label>

            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Unit</label>

            <select
              name="unit"
              value={formData.unit}
              onChange={handleFormChange}
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="pcs">pcs</option>
            </select>

          </div>

        </div>

        <div className="form-group">
          <label>Waste Date</label>

          <input
            type="date"
            name="waste_date"
            value={formData.waste_date}
            onChange={handleFormChange}
          />

        </div>

        <div className="form-group">
          <label>Cost Loss</label>

          <input
            type="number"
            name="cost_loss"
            value={formData.cost_loss}
            onChange={handleFormChange}
          />
        </div>

        <div className="form-actions">

          <button type="submit" className="btn btn-primary">
            {editingEntry ? "Update Entry" : "Save Entry"}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>

        </div>

      </form>

    </div>

  </div>
)}

</div>

</div>

  );
};

export default WasteTracking;