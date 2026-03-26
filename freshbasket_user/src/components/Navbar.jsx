import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import API_BASE_URL from '../config';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useContext(CartContext);
  const cartCount = getItemCount();

  // Fetch categories from backend using API_BASE_URL
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback categories
        setCategories([
          { category_id: 1, category_name: 'Vegetables' },
          { category_id: 2, category_name: 'Fruits' },
          { category_id: 3, category_name: 'Dairy' },
          { category_id: 4, category_name: 'Bakery' },
          { category_id: 5, category_name: 'Beverages' },
        ]);
      }
    };

    fetchCategories();
  }, []);

  // Check login status
  useEffect(() => {
    const checkLoggedInUser = () => {
      const customerData = localStorage.getItem('customer');
      if (customerData) {
        try {
          setUser(JSON.parse(customerData));
        } catch (error) {
          console.error('Error parsing customer data:', error);
          localStorage.removeItem('customer');
        }
      } else {
        setUser(null);
      }
    };

    checkLoggedInUser();

    const handleStorageChange = () => checkLoggedInUser();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkLoggedInUser);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkLoggedInUser);
    };
  }, []);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('customer');
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsCategoryOpen(false);
  }, [location]);

  // Cart notification
  useEffect(() => {
    if (cartCount > 0) {
      setShowCartNotification(true);
      const timer = setTimeout(() => setShowCartNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSuggestions([]);
      setIsMenuOpen(false);
    }
  };

  const handleQuickCategory = (categoryName) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
    setIsCategoryOpen(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 1) {
      const mockSuggestions = [
        'Fresh Apples',
        'Organic Vegetables',
        'Milk & Dairy',
        'Fresh Bread',
        'Seasonal Fruits',
      ].filter((item) => item.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
      setSuggestions(mockSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    navigate(`/products?search=${encodeURIComponent(suggestion)}`);
    setSuggestions([]);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
  };

  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    const nameParts = user.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  const getFirstName = () => {
    if (!user || !user.name) return 'User';
    return user.name.split(' ')[0];
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container container">
          {/* Logo */}
          <div className="navbar-logo">
            <Link to="/" className="logo-link">
              <span className="logo-icon">🛒</span>
              <div className="logo-text-container">
                <h1 className="logo-text">FreshBasket</h1>
                <span className="logo-tagline">Fresh Fruits & Vegetables Delivered</span>
              </div>
            </Link>
          </div>

          {/* Search */}
          <div className="navbar-search">
            <div className={`search-container ${isSearchFocused ? 'focused' : ''}`}>
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder="Search for fresh products..."
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={clearSearch}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button type="submit" className="search-button">
                  <span className="search-icon">🔍</span>
                </button>
              </form>

              {suggestions.length > 0 && isSearchFocused && (
                <div className="search-suggestions">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onMouseDown={() => handleSuggestionClick(suggestion)}
                    >
                      <span className="suggestion-icon">🔍</span>
                      <span className="suggestion-text">{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Categories Dropdown */}
          <div
            className="navbar-categories"
            onMouseEnter={() => setIsCategoryOpen(true)}
            onMouseLeave={() => setIsCategoryOpen(false)}
          >
            <button className="categories-button">
              <span className="categories-icon">☰</span>
              <span className="categories-text">Categories</span>
              <span className="categories-arrow">▼</span>
            </button>

            {isCategoryOpen && (
              <div className="categories-dropdown">
                <div className="dropdown-header">
                  <h3>All Categories</h3>
                  <span className="dropdown-count">{categories.length} categories</span>
                </div>
                <div className="categories-grid simple-list">
                  {categories.map((category) => (
                    <button
                      key={category.category_id}
                      className="category-item"
                      onClick={() => handleQuickCategory(category.category_name)}
                    >
                      <span className="category-name">{category.category_name}</span>
                    </button>
                  ))}
                </div>
                <div className="dropdown-footer">
                  <Link to="/products" className="view-all-categories">
                    View All Products →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="navbar-actions">
            <Link to="/cart" className="action-item cart-item">
              <div className="cart-icon-container">
                <span className="action-icon">🛒</span>
                {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
              </div>
              <span className="action-text">Cart</span>
            </Link>

            {/* Help Link */}
            <Link to="/help" className="action-item help-item">
              <span className="action-icon">❓</span>
              <span className="action-text">Help</span>
            </Link>

            <div className="action-divider"></div>

            {user ? (
              <div className="user-dropdown">
                <div className="user-info">
                  <div className="user-avatar">{getUserInitials()}</div>
                  <div className="account-info">
                    <span className="action-text">Hi, {getFirstName()}</span>
                    <span className="account-subtext">Your Account</span>
                  </div>
                  <span className="dropdown-icon">▼</span>
                </div>
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar">{getUserInitials()}</div>
                    <div className="user-dropdown-details">
                      <div className="user-dropdown-name">{user.name}</div>
                      <div className="user-dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  <Link to="/profile" className="user-dropdown-item">
                    <span className="dropdown-item-icon">👤</span>
                    <span>My Profile</span>
                  </Link>
                  <Link to="/my-orders" className="user-dropdown-item">
                    <span className="dropdown-item-icon">📦</span>
                    <span>My Orders</span>
                  </Link>

                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="user-dropdown-item logout">
                    <span className="dropdown-item-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="action-item account-item">
                <span className="action-icon">👤</span>
                <div className="account-info">
                  <span className="action-text">Hello, Sign in</span>
                  <span className="account-subtext">Your Account</span>
                </div>
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="navbar-mobile-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`mobile-menu-overlay ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Mobile Menu */}
        <div className={`navbar-mobile-menu ${isMenuOpen ? 'active' : ''}`}>
          <div className="mobile-menu-header">
            <div className="mobile-logo">
              <span className="logo-icon">🛒</span>
              <h2>FreshBasket</h2>
            </div>
            <button className="mobile-menu-close" onClick={() => setIsMenuOpen(false)}>
              ✕
            </button>
          </div>

          <div className="mobile-menu-content">
            <div className="mobile-search-section">
              <form onSubmit={handleSearch} className="mobile-search-form">
                <div className="mobile-search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search products..."
                    className="mobile-search-input"
                  />
                </div>
              </form>
            </div>

            <div className="mobile-categories-section">
              <h3 className="mobile-section-title">Categories</h3>
              <div className="mobile-categories-grid">
                {categories.slice(0, 8).map((category) => (
                  <Link
                    key={category.category_id}
                    to={`/products?category=${encodeURIComponent(category.category_name)}`}
                    className="mobile-category-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="category-icon">
                      {category.category_name === 'Fruits'
                        ? '🍎'
                        : category.category_name === 'Vegetables'
                        ? '🥦'
                        : category.category_name === 'Dairy'
                        ? '🥛'
                        : category.category_name === 'Bakery'
                        ? '🍞'
                        : '🛒'}
                    </span>
                    <span className="category-name">{category.category_name}</span>
                  </Link>
                ))}
              </div>
              <Link to="/products" className="mobile-view-all" onClick={() => setIsMenuOpen(false)}>
                View All Categories →
              </Link>
            </div>

            <div className="mobile-actions-section">
              <Link to="/cart" className="mobile-action-item" onClick={() => setIsMenuOpen(false)}>
                <span className="action-icon">🛒</span>
                <div className="action-details">
                  <span className="action-title">Shopping Cart</span>
                  <span className="action-subtitle">{cartCount} items</span>
                </div>
                <span className="action-arrow">→</span>
              </Link>

              {user ? (
                <>
                  <div className="mobile-user-info">
                    <div className="mobile-user-avatar">{getUserInitials()}</div>
                    <div className="mobile-user-details">
                      <div className="mobile-user-name">{user.name}</div>
                      <div className="mobile-user-email">{user.email}</div>
                    </div>
                  </div>
                  <Link to="/profile" className="mobile-action-item" onClick={() => setIsMenuOpen(false)}>
                    <span className="action-icon">👤</span>
                    <div className="action-details">
                      <span className="action-title">My Profile</span>
                      <span className="action-subtitle">Manage account</span>
                    </div>
                    <span className="action-arrow">→</span>
                  </Link>
                  <Link to="/orders" className="mobile-action-item" onClick={() => setIsMenuOpen(false)}>
                    <span className="action-icon">📦</span>
                    <div className="action-details">
                      <span className="action-title">My Orders</span>
                      <span className="action-subtitle">Track & manage</span>
                    </div>
                    <span className="action-arrow">→</span>
                  </Link>
                  <Link to="/addresses" className="mobile-action-item" onClick={() => setIsMenuOpen(false)}>
                    <span className="action-icon">📍</span>
                    <div className="action-details">
                      <span className="action-title">My Addresses</span>
                      <span className="action-subtitle">Delivery locations</span>
                    </div>
                    <span className="action-arrow">→</span>
                  </Link>
                  <button onClick={handleLogout} className="mobile-action-item logout">
                    <span className="action-icon">🚪</span>
                    <div className="action-details">
                      <span className="action-title">Logout</span>
                      <span className="action-subtitle">Sign out of account</span>
                    </div>
                    <span className="action-arrow">→</span>
                  </button>
                </>
              ) : (
                <Link to="/login" className="mobile-action-item" onClick={() => setIsMenuOpen(false)}>
                  <span className="action-icon">👤</span>
                  <div className="action-details">
                    <span className="action-title">Your Account</span>
                    <span className="action-subtitle">Login or Signup</span>
                  </div>
                  <span className="action-arrow">→</span>
                </Link>
              )}

              <Link to="/help" className="mobile-action-item" onClick={() => setIsMenuOpen(false)}>
                <span className="action-icon">❓</span>
                <div className="action-details">
                  <span className="action-title">Help Center</span>
                  <span className="action-subtitle">24/7 Support</span>
                </div>
                <span className="action-arrow">→</span>
              </Link>
            </div>

            <div className="mobile-app-section">
              <h3 className="mobile-section-title">Get the App</h3>
              <div className="app-badges">
                <button className="app-badge">
                  <span className="badge-icon">📱</span>
                  <div className="badge-text">
                    <span className="badge-title">App Store</span>
                    <span className="badge-subtitle">Download on the</span>
                  </div>
                </button>
                <button className="app-badge">
                  <span className="badge-icon">🤖</span>
                  <div className="badge-text">
                    <span className="badge-title">Google Play</span>
                    <span className="badge-subtitle">Get it on</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Cart Notification */}
      <div className={`cart-notification ${showCartNotification ? 'show' : ''}`}>
        <div className="notification-content">
          <span className="notification-icon">✓</span>
          <div className="notification-text">
            <strong>Added to Cart!</strong>
            <span>Item successfully added to your shopping cart.</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;