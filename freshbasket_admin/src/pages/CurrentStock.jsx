import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CurrentStock.css';

const API_BASE = `${process.env.REACT_APP_API_BASE_URL}`;

const CurrentStock = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/current-stock`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStockData(res.data);
    } catch (err) {
      console.error('Error fetching stock:', err);
      setError('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => num.toFixed(2);
  // const formatCurrency = (num) => `₹${num.toFixed(2)}`;

  const filteredStock = stockData.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics
  const totalProducts = stockData.length;
  const totalCurrentStock = stockData.reduce((sum, item) => sum + item.current_stock, 0);
  const lowStockItems = stockData.filter(item => item.current_stock < 10).length;

  if (loading) {
    return (
      <div className="stock-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading stock data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-page">
        <div className="error-banner">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="stock-page">
      {/* Header */}
      <header className="page-header">
        <h1>
          <span className="header-icon"></span>
          Current Stock
        </h1>
        <p className="header-subtitle">Real‑time inventory levels (Purchased – Sold – Wasted)</p>
      </header>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>{totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{formatNumber(totalCurrentStock)}</h3>
            <p>Total Current Stock (units)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{lowStockItems}</h3>
            <p>Low Stock (&lt;10)</p> {/* FIXED: &lt; instead of < */}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2>
              <i className="fas fa-clipboard-list"></i> Stock Levels
            </h2>
            <span className="item-count">{filteredStock.length} items</span>
          </div>
          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="    Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" onClick={fetchStock}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Unit</th>
                <th>Purchased</th>
                <th>Sold</th>
                <th>Wasted</th>
                <th>Current Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.map((item) => {
                const stock = item.current_stock;
                let statusClass = 'stock-ok';
                let statusText = 'OK';
                if (stock <= 0) {
                  statusClass = 'stock-out';
                  statusText = 'Out of Stock';
                } else if (stock < 10) {
                  statusClass = 'stock-low';
                  statusText = 'Low Stock';
                }
                return (
                  <tr key={item.product_id}>
                    <td><span className="id-badge">{item.product_id}</span></td>
                    <td>
                      <div className="product-cell">
                        <span className="product-name">{item.product_name}</span>
                      </div>
                    </td>
                    <td>{item.unit}</td>
                    <td className="numeric-cell">{formatNumber(item.total_purchased)}</td>
                    <td className="numeric-cell">{formatNumber(item.total_sold)}</td>
                    <td className="numeric-cell">{formatNumber(item.total_wasted)}</td>
                    <td className="numeric-cell">
                      <span className={`stock-value ${stock <= 0 ? 'text-danger' : ''}`}>
                        {formatNumber(stock)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>{statusText}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStock.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-box-open"></i>
              <h4>No products found</h4>
              <p>Add products to see stock levels.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentStock;