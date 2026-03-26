import { useState, useEffect } from "react";
import axios from "axios";
import "./Category.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const Category = () => {
  const BASE_URL = "http://localhost:8000";

  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      alert("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category_name) {
      alert("Please fill in category name");
      return;
    }

    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/categories/${editingId}`, formData);
        alert("Category updated successfully!");
      } else {
        await axios.post(`${BASE_URL}/api/categories`, formData);
        alert("Category added successfully!");
      }

      fetchCategories();
      resetForm();
    } catch (error) {
      console.error("Error saving category:", error);
      alert(error.response?.data?.message || "Failed to save category");
    }
  };

  const handleDelete = async (category_id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/api/categories/${category_id}`);
      alert("Category deleted successfully!");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert(error.response?.data?.message || "Failed to delete category");
    }
  };

  const handleEdit = (category) => {
    setFormData({
      category_name: category.category_name,
      description: category.description || "",
    });
    setEditingId(category.category_id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      category_name: "",
      description: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Calculate statistics - Always show real data
  const totalCategories = categories.length;
  const totalProducts = categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0);
  const avgProductsPerCategory = totalCategories > 0 
    ? (totalProducts / totalCategories).toFixed(1) 
    : "0.0";
  
  // Find top category products
  const topCategoryProducts = categories.length > 0 
    ? Math.max(...categories.map(cat => cat.product_count || 0))
    : 0;

  // Filter categories
  const filteredCategories = categories.filter(category =>
    category.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare chart data
  const chartData = [...categories]
    .sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
    .slice(0, 5)
    .map(cat => ({
      name: cat.category_name,
      products: cat.product_count || 0,
    }));

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading && categories.length === 0) {
    return (
      <div className="category-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <h1>Category</h1>
          <p>Product categories and their details</p>
        </div>
      </div>

      {/* Statistics Section */}
      {/* <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-folder"></i>
          </div>
          <div className="stat-info">
            <h3>{totalCategories}</h3>
            <p>Total Categories</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-box"></i>
          </div>
          <div className="stat-info">
            <h3>{totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="stat-info">
            <h3>{avgProductsPerCategory}</h3>
            <p>Avg Products/Category</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-trophy"></i>
          </div>
          <div className="stat-info">
            <h3>{topCategoryProducts}</h3>
            <p>Top Category Products</p>
          </div>
        </div>
      </div> */}

      {/* Charts Section */}
      {/* <div className="charts-section">
        <div className="chart-card">
          <div className="chart-header">
            <h3><i className="fas fa-chart-bar"></i> Products per Category</h3>
          </div>
          <div className="chart-container">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eaeaea" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} products`, 'Count']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '10px'
                    }}
                  />
                  <Bar 
                    dataKey="products" 
                    fill="#4f46e5" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-chart">
                <i className="fas fa-chart-bar"></i>
                <p>Add categories to see data visualization</p>
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3><i className="fas fa-chart-pie"></i> Category Distribution</h3>
          </div>
          <div className="chart-container">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.products}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="products"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} products`, 'Count']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '10px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-chart">
                <i className="fas fa-chart-pie"></i>
                <p>Add categories to see distribution</p>
              </div>
            )}
          </div>
        </div>
      </div> */}

      {/* Table Section */}
      <div className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2><i className="fas fa-list"> </i> Categories</h2>
            <span className="item-count">{filteredCategories.length} items</span>
          </div>
          
          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="     Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button 
              className="btn btn-secondary"
              onClick={fetchCategories}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              <i className="fas fa-plus"></i> Add Category
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {/* <th>ID</th> */}
                <th>CATEGORY NAME</th>
                <th>DESCRIPTION</th>
                <th>PRODUCTS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.category_id}>
                  {/* <td>
                    <span className="id-badge">#{category.category_id}</span>
                  </td> */}
                  <td>
                    <strong>{category.category_name}</strong>
                  </td>
                  <td>
                    <span className="description">
                      {category.description || "No description"}
                    </span>
                  </td>
                  <td>
                    <span className="product-count">
                      {category.product_count || 0}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-action edit"
                        onClick={() => handleEdit(category)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn-action delete"
                        onClick={() => handleDelete(category.category_id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCategories.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <h4>No categories found</h4>
              <p>Get started by creating your first category</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fas fa-plus"></i> Create Category
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-tag"></i>
                {editingId ? "Edit Category" : "Add New Category"}
              </h3>
              <button className="modal-close" onClick={resetForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.category_name}
                  onChange={(e) => setFormData({...formData, category_name: e.target.value})}
                  placeholder="Enter category name"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter description (optional)"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Update Category" : "Add Category"}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="btn btn-outline"
                >
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

export default Category;