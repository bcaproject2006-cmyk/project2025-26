// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          <div className="error-code">
            <span className="number">4</span>
            <span className="emoji">😕</span>
            <span className="number">4</span>
          </div>
          
          <h1 className="error-title">Page Not Found</h1>
          
          <p className="error-message">
            Oops! The page you're looking for seems to have wandered off. 
            Maybe it's exploring other sections of our store?
          </p>
          
          <div className="suggestions">
            <h3>Here are some helpful links instead:</h3>
            <div className="suggestion-links">
              <Link to="/" className="suggestion-link">
                <span className="link-icon">🏠</span>
                <div>
                  <strong>Home Page</strong>
                  <span>Back to the main store</span>
                </div>
              </Link>
              
              <Link to="/products" className="suggestion-link">
                <span className="link-icon">🛒</span>
                <div>
                  <strong>All Products</strong>
                  <span>Browse our collection</span>
                </div>
              </Link>
              
              <Link to="/cart" className="suggestion-link">
                <span className="link-icon">📦</span>
                <div>
                  <strong>Your Cart</strong>
                  <span>View your shopping cart</span>
                </div>
              </Link>
            </div>
          </div>
          
          <div className="action-buttons">
            <Link to="/" className="btn btn-primary">
              Go to Homepage
            </Link>
            <button 
              className="btn btn-outline" 
              onClick={() => window.history.back()}
            >
              Go Back
            </button>
          </div>
          
          <div className="search-again">
            <p>Or try searching for what you need:</p>
            <form action="/products" method="GET" className="search-form">
              <input
                type="text"
                name="search"
                placeholder="Search products..."
                className="search-input"
              />
              <button type="submit" className="search-button">
                <span className="search-icon">🔍</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;