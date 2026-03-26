// pages/ResetPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API_BASE_URL = 'http://localhost:8000/api';

const ResetPassword = () => {
  const { token } = useParams(); // token from URL, e.g., /reset-password/:token
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      await axios.post(`${API_BASE_URL}/customers/reset-password`, {
        token,
        newPassword: formData.newPassword,
      });

      setSuccessMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      let errorMessage = 'Failed to reset password. The link may be invalid or expired.';
      if (err.response) {
        const data = err.response.data;
        errorMessage = data.message || data.error || data.detail || errorMessage;
      } else if (err.request) {
        errorMessage = 'No response from server. Check your network.';
      }
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <span className="logo-icon">🛒</span>
            <h1>FreshBasket</h1>
          </Link>
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Enter your new password below.</p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            {/* New Password */}
            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="Enter new password"
                disabled={isLoading}
              />
              {errors.newPassword && (
                <span className="error-message">{errors.newPassword}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm new password"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            {/* Success message */}
            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}

            {/* General error */}
            {errors.general && (
              <span className="error-message">{errors.general}</span>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary auth-button"
              disabled={isLoading}
            >
              {isLoading ? <span className="loading-spinner"></span> : 'Reset Password'}
            </button>

            {/* Back to Login */}
            <div className="auth-footer">
              <p>
                <Link to="/login" className="auth-link">
                  Back to Sign in
                </Link>
              </p>
            </div>
          </form>

          {/* Right Side Illustration (same as Login) */}
          <div className="auth-illustration">
            <div className="illustration-content">
              <div className="illustration-emoji">🛒🥦🍎</div>
              <h3>Fresh groceries delivered fast!</h3>
              <p>Get your favorite items delivered in 30 minutes or less</p>
              <div className="benefits">
                <div className="benefit">
                  <span className="benefit-icon">🚚</span>
                  <span>Fast Delivery</span>
                </div>
                <div className="benefit">
                  <span className="benefit-icon">🔒</span>
                  <span>Secure Payment</span>
                </div>
                <div className="benefit">
                  <span className="benefit-icon">⭐</span>
                  <span>Best Quality</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-help">
          <p>
            Need help? <Link to="/contact">Contact Support</Link> or call us at{' '}
            <strong>1-800-FRESH</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;