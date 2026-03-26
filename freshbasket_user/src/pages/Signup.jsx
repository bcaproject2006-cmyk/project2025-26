// pages/Signup.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import axios from 'axios';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    addressLine: '',
    city: '',
    pincode: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    newsletter: true
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
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
    if (serverError) setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number is invalid (10 digits required)';
    }
    if (formData.pincode.trim() && !/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter and one number';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
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
    setServerError('');

    // Combine address fields
    const addressParts = [];
    if (formData.addressLine.trim()) addressParts.push(formData.addressLine.trim());
    if (formData.city.trim()) addressParts.push(formData.city.trim());
    if (formData.pincode.trim()) addressParts.push(formData.pincode.trim());
    const combinedAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

    const payload = {
      name: formData.name,
      email: formData.email,
      phone_no: formData.phone,
      address: combinedAddress,
      password: formData.password   // Ensure backend expects field name 'password'
    };

    // 👇 Check the browser console to see the exact payload
    console.log('Submitting payload:', payload);

    try {
      const response = await axios.post('http://localhost:8000/api/customers', payload);
      alert(response.data.message || 'Account created successfully!');
      navigate('/login');
    } catch (error) {
      console.error('Signup error:', error);
      console.log('Error response:', error.response);

      let errorMessage = 'Registration failed. Please try again.';
      if (error.response) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your network.';
      } else {
        errorMessage = error.message;
      }
      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#FF4444', '#FF8800', '#FFBB33', '#00C851', '#007E33'];

    return {
      strength,
      label: labels[strength],
      color: colors[strength],
      width: `${strength * 25}%`
    };
  };

  const strength = passwordStrength();

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <span className="logo-icon">🛒</span>
            <h1>FreshBasket</h1>
          </Link>
          <h2 className="auth-title">Create Your Account</h2>
          <p className="auth-subtitle">Join FreshBasket for the best grocery shopping experience</p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            {serverError && (
              <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                {serverError}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="form-label">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
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
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addressLine" className="form-label">Address Line</label>
                <input
                  type="text"
                  id="addressLine"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Street address, P.O. Box"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city" className="form-label">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your city"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pincode" className="form-label">Pincode</label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className={`form-input ${errors.pincode ? 'error' : ''}`}
                  placeholder="6-digit pincode"
                  disabled={isLoading}
                />
                {errors.pincode && <span className="error-message">{errors.pincode}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
                <span className="password-strength" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Create a strong password"
                disabled={isLoading}
              />
              {formData.password && (
                <div className="password-meter">
                  <div 
                    className="password-meter-bar" 
                    style={{ width: strength.width, backgroundColor: strength.color }}
                  ></div>
                </div>
              )}
              {errors.password && <span className="error-message">{errors.password}</span>}
              <div className="password-hints">
                <span className={`hint ${formData.password.length >= 8 ? 'valid' : ''}`}>• At least 8 characters</span>
                <span className={`hint ${/[A-Z]/.test(formData.password) ? 'valid' : ''}`}>• One uppercase letter</span>
                <span className={`hint ${/[0-9]/.test(formData.password) ? 'valid' : ''}`}>• One number</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">
                  I agree to the{' '}
                  <Link to="/terms" className="inline-link">Terms of Service</Link> and{' '}
                  <Link to="/privacy" className="inline-link">Privacy Policy</Link>
                </span>
              </label>
              {errors.agreeTerms && (
                <span className="error-message" style={{ marginLeft: '30px', display: 'block' }}>
                  {errors.agreeTerms}
                </span>
              )}
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="newsletter"
                  checked={formData.newsletter}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">
                  Send me updates on new products, offers, and tips
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary auth-button"
              disabled={isLoading}
            >
              {isLoading ? <span className="loading-spinner"></span> : 'Create Account'}
            </button>

            <div className="auth-divider">
              <span>Already have an account?</span>
            </div>

            <div className="auth-footer">
              <p>
                Sign in to your existing account{' '}
                <Link to="/login" className="auth-link">Sign in here</Link>
              </p>
            </div>
          </form>

          <div className="auth-illustration">
            <div className="illustration-content">
              <div className="illustration-emoji">🎉🛍️📦</div>
              <h3>Welcome to FreshBasket!</h3>
              <p>Join thousands of happy customers who shop with us</p>
            </div>
          </div>
        </div>

        <div className="auth-help">
          <p>
            By creating an account, you agree to our{' '}
            <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;