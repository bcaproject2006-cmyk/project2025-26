import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Category.css";
import "./FAQManagement.css";

const FAQManagement = () => {

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const API_URL = "http://localhost:8000";

  const fetchFAQs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/faqs`);
      setFaqs(res.data || []);
    } catch (err) {
      console.error("Failed to fetch FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const filteredFAQs = faqs
    .filter(
      (faq) =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((faq) => {
      if (activeTab === "all") return true;
      return faq.status === activeTab;
    });

  const stats = {
    total: faqs.length,
    active: faqs.filter((f) => f.status === "active").length,
    draft: faqs.filter((f) => f.status === "draft").length,
    inactive: faqs.filter((f) => f.status === "inactive").length,
  };

  return (
    <div className="category-page">

      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <h1>FAQ Management</h1>
          <p>Manage frequently asked questions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-overview">
        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-question-circle"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total FAQs</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-check"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.active}</h3>
              <p>Active</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-edit"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.draft}</h3>
              <p>Draft</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-eye-slash"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.inactive}</h3>
              <p>Inactive</p>
            </div>
          </div>

        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">

        <div className="section-header">

          <div className="section-title">
            <h2>
              <i className="fas fa-list"></i> FAQ List
            </h2>
            <span className="item-count">{filteredFAQs.length}</span>
          </div>

          <div className="table-controls">

            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="     Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="btn btn-primary">
              <i className="fas fa-plus"></i> Add FAQ
            </button>

          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="status-tabs">

          <button
            className={`status-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>

          <button
            className={`status-tab ${activeTab === "active" ? "active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            Active
          </button>

          <button
            className={`status-tab ${activeTab === "draft" ? "active" : ""}`}
            onClick={() => setActiveTab("draft")}
          >
            Draft
          </button>

          <button
            className={`status-tab ${activeTab === "inactive" ? "active" : ""}`}
            onClick={() => setActiveTab("inactive")}
          >
            Inactive
          </button>

        </div>

        {/* Table */}
        <div className="table-wrapper">

          {loading ? (
            <div className="loading-container">
              <div className="loader"></div>
              <p>Loading FAQs...</p>
            </div>
          ) : filteredFAQs.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-question-circle"></i>
              <h4>No FAQs Found</h4>
              <p>Add your first FAQ</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Answer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredFAQs.map((faq) => (
                  <tr key={faq.faq_id}>

                    <td>{faq.question}</td>

                    <td className="description">
                      {faq.answer.length > 80
                        ? faq.answer.substring(0, 80) + "..."
                        : faq.answer}
                    </td>

                    <td>
                      <span className="product-count">
                        {faq.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">

                        <button className="btn-action edit">
                          <i className="fas fa-edit"></i>
                        </button>

                        <button className="btn-action delete">
                          <i className="fas fa-trash"></i>
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

export default FAQManagement;