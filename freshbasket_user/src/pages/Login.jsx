// pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api'; // ✅ base URL with /api

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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

    try {
      // ✅ Correct endpoint: /api/customers/login
      const response = await axios.post(
        `${API_BASE_URL}/customers/login`,
        {
          email: formData.email,
          password: formData.password
        }
      );

      // Store authentication token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      } else {
        console.warn('No token received from server. Check backend response.');
      }

      // Store customer information
      localStorage.setItem(
        'customer',
        JSON.stringify(response.data.customer)
      );

      // Handle "remember me"
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      alert('Login successful!');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response);

      let errorMessage = 'Invalid email or password';

      if (err.response) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else {
          errorMessage = 'Login failed. Please try again.';
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your network.';
      } else {
        errorMessage = err.message;
      }

      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    alert(`Logging in with ${provider}...`);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <span className="logo-icon">🛒</span>
            <h1>FreshBasket</h1>
          </Link>
          <h2 className="auth-title">Welcome Back!</h2>
          <p className="auth-subtitle">Sign in to your account to continue shopping</p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>

              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                disabled={isLoading}
              />

              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}

              {/* General/server error message */}
              {errors.general && (
                <span className="error-message">{errors.general}</span>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">Remember me</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary auth-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : 'Sign In'}
            </button>

            {/* Sign Up Link */}
            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="auth-link">
                  Sign up here
                </Link>
              </p>
            </div>
          </form>

          {/* Right Side Illustration */}
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

        {/* Footer Help Link */}
        <div className="auth-help">
          <p>
            Need help? <Link to="/contact">Contact Support</Link> or call us at <strong>1-800-FRESH</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;