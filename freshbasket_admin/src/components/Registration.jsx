import React, { useState } from 'react';
import logo from "../assets/logo/logo.png";
import { useNavigate, Link } from 'react-router-dom';
import './Registration.css';
import {
  FaLock,
  FaEnvelope,
  FaUser,
  FaPhone,
  FaEye,
  FaEyeSlash,
  FaUserTie
} from 'react-icons/fa';

const Registration = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    role: 'admin',
    status: 'active'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    
    // Password length validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    if (!formData.mobile.trim()) {
      setError('Mobile number is required');
      return false;
    }
    
    // Mobile number validation
    if (formData.mobile.length !== 10 || !/^\d+$/.test(formData.mobile)) {
      setError('Mobile number must be exactly 10 digits');
      return false;
    }
    
    return true;
  };

  // ✅ REAL REGISTER API
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔄 Sending registration request...');
      console.log('Data:', formData);
      
      const response = await fetch('http://localhost:8000/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      // Get response as text first to see what we're getting
      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📥 Parsed JSON:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        // Check if the backend returned an error message
        if (data && data.error) {
          throw new Error(data.error);
        } else if (data && data.message) {
          throw new Error(data.message);
        } else {
          throw new Error(`Registration failed (${response.status})`);
        }
      }

      // Check if registration was successful
      if (data.success === false) {
        throw new Error(data.error || 'Registration failed');
      }

      console.log('✅ Registration successful:', data);
      
      // Show success message with user-friendly text
      const successMessage = data.message || 'Registration successful!';
      setSuccess(successMessage);
      setRegistrationSuccess(true);
      
      // Clear form after successful registration
      setFormData({
        name: '',
        email: '',
        password: '',
        mobile: '',
        role: 'user',
        status: 'active'
      });

    } catch (err) {
      console.error('❌ Registration error:', err);
      
      // Handle specific error cases
      let errorMessage = err.message;
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please make sure backend is running on http://localhost:8000';
      } else if (err.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message.includes('invalid JSON')) {
        errorMessage = 'Server returned an invalid response. Please check backend logs.';
      } else if (err.message.includes('409')) {
        errorMessage = 'User already exists with this email address.';
      } else if (err.message.includes('400')) {
        errorMessage = 'Invalid data. Please check all fields and try again.';
      } else if (err.message.includes('500')) {
        errorMessage = 'Server error. Please try again later or contact support.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <div className="logo">
    <i className="fas fa-shopping-basket"></i>
            <h1>FreshBasket</h1>
          </div>
          <p className="slogan">Empowering Store Owners with Intelligent Solutions</p>
        </div>

        {registrationSuccess ? (
          <div className="success-message">
            <div className="success-icon">🎉</div>
            <h2>Registration Successful!</h2>
            <p>Welcome to FreshBasket!</p>
            <p className="success-note">
              Account Status: <span className={`status-badge ${formData.status}`}>
                {formData.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </p>
            <button 
              className="login-redirect-btn"
              onClick={() => navigate('/login')}
            >
             <b> Go to Login </b>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="registration-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message-form">{success}</div>}

            <div className="form-row">
              <div className="form-group">
                <label><FaUser className="input-icon" /> Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label><FaEnvelope className="input-icon" /> Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FaPhone className="input-icon" /> Phone Number</label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter 10-digit phone number"
                  disabled={loading}
                  maxLength="10"
                />
              </div>

              <div className="form-group">
                <label><FaUserTie className="input-icon" /> User Role</label>
                <div className="role-select-container">
                  <select 
                    name="role" 
                    value={formData.role} 
                    onChange={handleChange}
                    disabled={loading}
                  >
                    
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FaLock className="input-icon" /> Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password (min. 6 characters)"
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={togglePasswordVisibility}
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-select-container">
                  <select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-footer">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="login-link">
                Already have an account? <Link to="/login">Sign In</Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Registration;