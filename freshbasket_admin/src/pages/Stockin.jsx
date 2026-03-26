import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './Stockin.css';

const StockIn = () => {
  const [stockEntries, setStockEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Stock update date
  const [stockDate, setStockDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // stockUpdates: key = product_id, value = { quantity: '1', price: (product.price) }
  const [stockUpdates, setStockUpdates] = useState({});

  // Selected product IDs
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchProducts(),
        fetchStockEntries(),
        fetchAlerts()
      ]);
    };
    fetchData();
  }, []);

  // Initialize stockUpdates when products change
  useEffect(() => {
    const initialUpdates = {};
    products.forEach(p => {
      initialUpdates[p.product_id] = { 
        quantity: '1', 
        price: p.price?.toString() || '10.00'
      };
    });
    setStockUpdates(initialUpdates);
    setSelectedProducts([]);
  }, [products]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Failed to load categories', 'error');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('Failed to load products', 'error');
    }
  };

  const fetchStockEntries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/stock');
      setStockEntries(response.data);
    } catch (error) {
      console.error('Error fetching stock:', error);
      showToast('Failed to load stock entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/stock/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  // Calculate current stock for each product (sum of all entries)
  const getProductStock = (productId) => {
    const entries = stockEntries.filter(e => e.product_id === productId);
    return entries.reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
  };

  // Derived data
  const categoryMap = useMemo(() => 
    Object.fromEntries(categories.map(c => [c.category_id, c.category_name])),
    [categories]
  );

  const productMap = useMemo(() => 
    Object.fromEntries(products.map(p => [p.product_id, p])),
    [products]
  );

  const categoryOptions = useMemo(() => 
    ['All', ...categories.map(c => c.category_name)],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    let filtered = categoryFilter === 'All'
      ? products
      : products.filter(p => p.category_id && categoryMap[p.category_id] === categoryFilter);
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [products, categoryFilter, categoryMap, searchTerm]);

  // Event handlers
  const handleUpdateChange = (productId, field, value) => {
    setStockUpdates(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleSelectProduct = (productId, checked) => {
    setSelectedProducts(prev => 
      checked ? [...prev, productId] : prev.filter(id => id !== productId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedProducts(checked ? filteredProducts.map(p => p.product_id) : []);
  };

  const handleResetFields = () => {
    const cleared = { ...stockUpdates };
    Object.keys(cleared).forEach(id => {
      const product = productMap[id];
      cleared[id].quantity = '1';
      cleared[id].price = product?.price?.toString() || '10.00';
    });
    setStockUpdates(cleared);
    showToast('All fields reset to product defaults', 'info');
  };

  const handleDeselectAll = () => {
    setSelectedProducts([]);
  };

  const handleBatchSubmit = async () => {
    const updates = [];
    for (const productId of selectedProducts) {
      const data = stockUpdates[productId];
      const product = productMap[productId];
      if (data && data.quantity && parseFloat(data.quantity) > 0) {
        updates.push({
          product_id: parseInt(productId),
          quantity: parseFloat(data.quantity),
          unit: product?.unit || 'kg',
          purchase_price: data.price ? parseFloat(data.price) : (product?.price || 10.00),
          received_date: stockDate
        });
      }
    }

    if (updates.length === 0) {
      showToast('No quantities to update for selected products', 'info');
      return;
    }

    setSubmitLoading(true);
    try {
      await Promise.all(updates.map(update =>
        axios.post('http://localhost:8000/api/stock', update)
      ));
      showToast(`Stock updated for ${updates.length} product(s)!`);
      const cleared = { ...stockUpdates };
      updates.forEach(u => {
        const product = productMap[u.product_id];
        cleared[u.product_id].quantity = '1';
        cleared[u.product_id].price = product?.price?.toString() || '10.00';
      });
      setStockUpdates(cleared);
      fetchStockEntries();
      fetchAlerts();
    } catch (error) {
      console.error('Error saving stock:', error);
      const errorMsg = error.response?.data?.message || 'Error saving stock entries';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Helpers
  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

  // Selection state
  const allSelected = filteredProducts.length > 0 && 
                      filteredProducts.every(p => selectedProducts.includes(p.product_id));
  const someSelected = filteredProducts.some(p => selectedProducts.includes(p.product_id)) && !allSelected;

  const selectedCount = selectedProducts.length;
  const totalValueToAdd = selectedProducts.reduce((sum, id) => {
    const qty = parseFloat(stockUpdates[id]?.quantity) || 0;
    const price = parseFloat(stockUpdates[id]?.price) || 0;
    return sum + (qty * price);
  }, 0);
  const hasValidUpdates = selectedProducts.some(id => 
    stockUpdates[id]?.quantity && parseFloat(stockUpdates[id].quantity) > 0
  );

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="stock-in-page">
      {toast.show && <div className={`toast-notification ${toast.type}`}>{toast.message}</div>}

      {/* Page Header */}
      <div className="page-header">
        <div className="header-title">
          <h1>Stock In</h1>
          <p>Add stock for multiple products at once</p>
        </div>
      </div>

      {/* Date Picker Card */}
      <div className="date-card">
        <div className="date-card-content">
          <label htmlFor="stockDate">
            <i className="fas fa-calendar-alt"></i> Stock Update Date
          </label>
          <input
            type="date"
            id="stockDate"
            value={stockDate}
            min={today}
            onChange={(e) => setStockDate(e.target.value)}
            className="date-input"
          />
          <small className="date-hint">(Cannot be a past date)</small>
        </div>
      </div>

      {/* Main Product Card */}
      <div className="table-section">
        {/* Card Header */}
        <div className="section-header">
          <div className="section-title">
            <h2><i className="fas fa-list"> </i> Products</h2>
            <span className="item-count">{filteredProducts.length} items</span>
          </div>

          <div className="table-controls">
            <select
              className="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="     Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-secondary"
              onClick={handleDeselectAll}
              disabled={selectedCount === 0}
            >
              Deselect All
            </button>

            <button 
              className="btn btn-secondary"
              onClick={handleResetFields}
            >
              Reset Fields
            </button>
          </div>
        </div>

        {/* Product Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    ref={input => {
                      if (input) input.indeterminate = someSelected;
                    }}
                  />
                </th>
                <th>PRODUCT</th>
                <th>QUANTITY</th>
                <th>PRICE</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="loading-cell">
                    <div className="loading-spinner">Loading products...</div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    <div className="empty-state">
                      <i className="fas fa-box-open"></i>
                      <h4>No products found</h4>
                      <p>Try adjusting your search or filter</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const categoryName = product.category_id ? categoryMap[product.category_id] : '';
                  const update = stockUpdates[product.product_id] || { 
                    quantity: '1', 
                    price: product.price?.toString() || '10.00' 
                  };
                  const isSelected = selectedProducts.includes(product.product_id);
                  const unit = product.unit || 'kg';
                  const total = (parseFloat(update.quantity) || 0) * (parseFloat(update.price) || 0);
                  return (
                    <tr key={product.product_id} className={isSelected ? 'selected-row' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectProduct(product.product_id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="product-info">
                          <strong>{product.product_name}</strong>
                          {categoryName && <div className="product-category">{categoryName}</div>}
                        </div>
                      </td>
                      <td>
                        <div className="input-group">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={update.quantity}
                            onChange={(e) => handleUpdateChange(product.product_id, 'quantity', e.target.value)}
                            className="qty-input"
                          />
                          <span className="unit-badge">{unit}</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={update.price}
                          onChange={(e) => handleUpdateChange(product.product_id, 'price', e.target.value)}
                          className="price-input"
                        />
                      </td>
                      <td className="total-cell">{formatCurrency(total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer */}
        <div className="table-footer">
          <div className="summary">
            {selectedCount > 0 && totalValueToAdd > 0 ? (
              <span>Ready to add stock worth <strong>{formatCurrency(totalValueToAdd)}</strong> for <strong>{selectedCount}</strong> product(s) on <strong>{stockDate}</strong>.</span>
            ) : selectedCount > 0 ? (
              <span className="warning">Enter quantities for selected products.</span>
            ) : (
              <span>Select products to update stock.</span>
            )}
          </div>
          <button
            onClick={handleBatchSubmit}
            disabled={submitLoading || !hasValidUpdates}
            className="btn btn-primary"
          >
            {submitLoading ? <><span className="spinner"></span> Updating...</> : 'Update Selected Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockIn;