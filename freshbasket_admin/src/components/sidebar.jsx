import React from "react";
import NavItem from "./NavItem";
import "./sidebar.css";
import { Link } from "react-router-dom";

const Sidebar = ({ sidebarOpen }) => {
  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="navbar-logo">
            <Link to="/" className="logo-link">
              <span className="logo-icon">🛒</span>
              <div className="logo-text-container">
                <h1 className="logo-text">FreshBasket</h1>
              </div>
            </Link>
          </div>
<br></br>
        {/* Navigation */}
        <nav className="nav">
          {/* CORE */}
          <div className="nav-group">
            <span className="nav-title">CORE</span>

            <NavItem to="/dashboard">
              <i className="fas fa-tachometer-alt"></i>
              Dashboard
            </NavItem>
            
            <NavItem to="/category">
              <i className="fas fa-layer-group"></i>
              Category
            </NavItem>
            
            <NavItem to="/products">
              <i className="fas fa-boxes"></i>
              Products
            </NavItem>
            
            <NavItem to="/orders">
              <i className="fas fa-clipboard-list"></i>
              Orders
            </NavItem>
            
            <NavItem to="/returns">
              <i className="fas fa-undo-alt"></i>
              Return / Replace
            </NavItem>

            <NavItem to="/notifications">
              <i className="fas fa-bell"></i>
              Notifications
            </NavItem>
            
            <NavItem to="/billing">
              <i className="fas fa-file-invoice-dollar"></i>
              Billing / Invoices
            </NavItem>
            
            <NavItem to="/customers">
              <i className="fas fa-users"></i>
              Customers & Ledger
            </NavItem>

            <NavItem to="/Stockin">
              <i className="fas fa-boxes"></i>
              Stock In
            </NavItem>

            {/* NEW: Current Stock */}
            <NavItem to="/current-stock">
              <i className="fas fa-cubes"></i>
              Current Stock
            </NavItem>
            
            <NavItem to="/faq">
              <i className="fas fa-question-circle"></i>
              FAQs
            </NavItem>
          </div>

          {/* ANALYTICS */}
          <div className="nav-group">
            <span className="nav-title">ANALYTICS</span>

            <NavItem to="/reports">
              <i className="fas fa-chart-line"></i>
              Financial Dashboard
            </NavItem>
            
            <NavItem to="/waste">
              <i className="fas fa-trash-alt"></i>
              Waste Tracking
            </NavItem>
            
            <NavItem to="/loyalty">
              <i className="fas fa-gift"></i>
              Loyalty & Offers
            </NavItem>
          </div>

        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <span className="status-dot"></span> Admin Site
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay"></div>}
    </>
  );
};

export default Sidebar;