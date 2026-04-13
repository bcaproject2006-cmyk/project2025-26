// pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [updatingWhatsapp, setUpdatingWhatsapp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchWhatsAppStatus();
  }, [navigate]);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    const storedCustomer = localStorage.getItem('customer');
    if (!token || !storedCustomer) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get('http://localhost:8000/api/customers/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      localStorage.setItem('customer', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching profile:', error);
      try {
        setUser(JSON.parse(storedCustomer));
      } catch (e) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:8000/api/customers/whatsapp/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWhatsappOptIn(response.data.whatsapp_opt_in || false);
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      // Default to false if API fails
      setWhatsappOptIn(false);
    }
  };

  const handleWhatsAppToggle = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setUpdatingWhatsapp(true);
    const endpoint = whatsappOptIn ? 'opt-out' : 'opt-in';
    
    try {
      await axios.post(
        `http://localhost:8000/api/customers/whatsapp/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWhatsappOptIn(!whatsappOptIn);
    } catch (error) {
      console.error('Error updating WhatsApp preference:', error);
      alert('Failed to update WhatsApp preference. Please try again.');
    } finally {
      setUpdatingWhatsapp(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    navigate('/login');
  };

  if (loading) {
    return <div className="auth-page">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <span className="logo-icon">🛒</span>
            <h1>FreshBasket</h1>
          </Link>
          <h2 className="auth-title">My Profile</h2>
          <p className="auth-subtitle">Manage your account information</p>
        </div>

        <div className="auth-card">
          <div className="profile-container">
            <div className="profile-header">
              <div className="profile-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="profile-info">
                <h3 className="profile-name">{user.name}</h3>
                <p className="profile-email">{user.email}</p>
              </div>
            </div>

            <div className="profile-details">
              <div className="profile-section">
                <h4 className="profile-section-title">Account Information</h4>
                <div className="profile-field">
                  <span className="profile-label">Full Name:</span>
                  <span className="profile-value">{user.name}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Email:</span>
                  <span className="profile-value">{user.email}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Phone:</span>
                  <span className="profile-value">{user.phone_no}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Address:</span>
                  <span className="profile-value">{user.address || 'Not provided'}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Reward Points:</span>
                  <span className="profile-value" style={{ color: '#16a34a', fontWeight: 'bold' }}>
                    {user.reward_points || 0} ⭐
                  </span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Member Since:</span>
                  <span className="profile-value">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* WhatsApp Notification Preferences */}
              <div className="profile-section">
                <h4 className="profile-section-title">Notification Preferences</h4>
                <div className="profile-field whatsapp-opt-in-field">
                  <label className="whatsapp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={whatsappOptIn}
                      onChange={handleWhatsAppToggle}
                      disabled={updatingWhatsapp}
                    />
                    <span className="checkbox-text">
                      <span className="whatsapp-icon">💬</span>
                      Receive special offers and updates on WhatsApp
                    </span>
                  </label>
                  {updatingWhatsapp && <span className="updating-indicator">Updating...</span>}
                </div>
                <p className="whatsapp-note">
                  We'll send you exclusive discounts, new product alerts, and seasonal offers directly to your WhatsApp number: <strong>{user.phone_no}</strong>
                </p>
              </div>

              <div className="profile-actions">
                <Link to="/orders" className="btn btn-secondary">
                  📦 My Orders
                </Link>
                <Link to="/addresses" className="btn btn-secondary">
                  📍 My Addresses
                </Link>
                <button onClick={handleLogout} className="btn btn-danger">
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-help">
          <p>
            Need help? <Link to="/contact">Contact Support</Link> or call us at <strong>1-800-FRESH</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;