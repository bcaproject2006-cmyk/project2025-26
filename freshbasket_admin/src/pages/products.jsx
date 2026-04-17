import { useState, useEffect } from "react";
import axios from "axios";
import "./Products.css";

const Products = () => {
  const BASE_URL = `${process.env.REACT_APP_API_BASE_URL}/api`;

  const [formData, setFormData] = useState({
    category_id: "",
    product_name: "",
    unit: "",
    price: "",
    image: "",
    status: "active"
  });

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const units = ["Kg", "Gram", "Liter", "Piece", "Packet", "Bottle", "Box", "Dozen"];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
      alert("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const response = await axios.get(`${BASE_URL}/api/categories`);
    setCategories(response.data);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large! Maximum size is 5MB.");
      e.target.value = "";
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file type! Please upload JPEG, PNG, JPG, GIF or WebP images.");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    setFormData({...formData, image: ""});
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category_id || !formData.product_name || !formData.unit || !formData.price) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      let finalImageUrl = formData.image;
      
      if (imageFile) {
        finalImageUrl = await convertToBase64(imageFile);
      }

      const productData = {
        category_id: parseInt(formData.category_id),
        product_name: formData.product_name,
        unit: formData.unit,
        price: parseFloat(formData.price),
        status: formData.status
      };

      if (finalImageUrl && finalImageUrl.trim() !== "") {
        productData.image = finalImageUrl;
      }

      if (editingId) {
        await axios.put(`${BASE_URL}/api/products/${editingId}`, productData);
        alert("Product updated successfully!");
      } else {
        await axios.post(`${BASE_URL}/api/products`, productData);
        alert("Product added successfully!");
      }

      fetchProducts();
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      alert(error.response?.data?.message || "Failed to save product");
    }
  };

  const handleDelete = async (product_id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/products/${product_id}`);
      alert("Product deleted successfully!");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert(error.response?.data?.message || "Failed to delete product");
    }
  };

  const handleEdit = (product) => {
    setFormData({
      category_id: product.category_id.toString(),
      product_name: product.product_name,
      unit: product.unit,
      price: product.price.toString(),
      image: product.image || "",
      status: product.status || "active"
    });
    if (product.image) {
      setImagePreview(product.image);
      setImageFile(null);
    } else {
      setImagePreview("");
      setImageFile(null);
    }
    setEditingId(product.product_id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      category_id: "",
      product_name: "",
      unit: "",
      price: "",
      image: "",
      status: "active"
    });
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setShowForm(false);
    const fileInput = document.getElementById("imageUpload");
    if (fileInput) fileInput.value = "";
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData({...formData, image: ""});
    const fileInput = document.getElementById("imageUpload");
    if (fileInput) fileInput.value = "";
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.category_id === categoryId);
    return category ? category.category_name : "Unknown";
  };

  const formatIndianRupees = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getProductImage = (product) => {
    if (product.image) return product.image;
    return null;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.product_id.toString().includes(searchTerm);
    const matchesCategory = categoryFilter === "all" || product.category_id.toString() === categoryFilter;
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === "active").length;
  const inactiveProducts = products.filter(p => p.status === "inactive").length;
  const avgPrice = products.length > 0 
    ? (products.reduce((sum, prod) => sum + parseFloat(prod.price), 0) / products.length).toFixed(0)
    : 0;

  if (loading && products.length === 0) {
    return (
      <div className="products-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Products</h1>
          <p>Product details</p>
        </div>
      </div>

      {/* Statistics Section */}
      <section className="stats-section">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{activeProducts}</h3>
            <p>Active Products</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <h3>{inactiveProducts}</h3>
            <p>Inactive Products</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>₹{avgPrice}</h3>
            <p>Average Price</p>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2>📋 Products</h2>
            <span className="table-count">{filteredProducts.length} products</span>
          </div>
          <div className="table-controls">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button 
              className="icon-button refresh-button"
              onClick={fetchProducts}
              title="Refresh"
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
            <button 
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" style={{marginRight: '8px'}}>
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add Product
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>CATEGORY</th>
                <th>UNIT</th>
                <th>PRICE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const productImage = getProductImage(product);
                return (
                  <tr key={product.product_id}>
                    <td className="name-cell">
                      <div className="product-cell">
                        <div className="product-image-container">
                          {productImage ? (
                            <img 
                              src={productImage} 
                              alt={product.product_name} 
                              className="product-table-image"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="product-image-placeholder"><i class="fas fa-cube"></i></div>';
                              }}
                            />
                          ) : (
                            <div className="product-image-placeholder">
                              <i className="fas fa-cube"></i>
                            </div>
                          )}
                        </div>
                        <div className="product-info">
                          <div className="product-name">{product.product_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="category-cell">
                      <div className="product-category">{getCategoryName(product.category_id)}</div>
                    </td>
                    <td className="unit-cell">
                      <span className="unit-badge">{product.unit}</span>
                    </td>
                    <td className="price-cell">
                      <span className="product-price">{formatIndianRupees(product.price)}</span>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${product.status}`}>
                        {product.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button className="action-button edit" onClick={() => handleEdit(product)} title="Edit">
                          <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button className="action-button delete" onClick={() => handleDelete(product.product_id)} title="Delete">
                          <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h4>No products found</h4>
              <p>Get started by creating your first product</p>
              <button className="primary-button" onClick={() => setShowForm(true)}>
                Add Product
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Product Form Modal - LARGER VERSION */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? "✏️ Edit Product" : "➕ Add New Product"}</h3>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              {/* Row 1: Category & Product Name */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="productName">Product Name *</label>
                  <input
                    type="text"
                    id="productName"
                    value={formData.product_name}
                    onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                    placeholder="Enter product name"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Row 2: Unit & Price */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="unit">Unit *</label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    required
                  >
                    <option value="">Select Unit</option>
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price (₹) *</label>
                  <input
                    type="number"
                    id="price"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Image Upload Group */}
              <div className="form-group">
                <label>Product Image</label>
                <div className="image-upload-container">
                  <label htmlFor="imageUpload" className="file-upload-btn">
                    <svg viewBox="0 0 24 24" width="18" height="18" style={{marginRight: '8px'}}>
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    Choose Image
                    <input type="file" id="imageUpload" accept="image/*" onChange={handleImageChange} className="file-input" />
                  </label>
                  <span className="file-info">{imageFile ? imageFile.name : "No file chosen"}</span>
                </div>
                <div className="upload-hint">
                  <small>Max size: 5MB • Supports: JPG, PNG, GIF, WebP</small>
                </div>
                {(imagePreview || formData.image) && (
                  <div className="image-preview-container">
                    <div className="image-preview">
                      <img 
                        src={imagePreview || formData.image} 
                        alt="Preview" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="preview-error"><i class="fas fa-image"></i> Preview not available</div>';
                        }}
                      />
                      <button type="button" onClick={removeImage} className="remove-image-btn" title="Remove image">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status & Actions */}
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">
                  {editingId ? "Update Product" : "Add Product"}
                </button>
                <button type="button" onClick={resetForm} className="cancel-button">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;