// pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API_BASE_URL = 'http://localhost:8000/api';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmail = () => {
    if (!formData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: 'Email is invalid' });
      return false;
    }
    return true;
  };

  const validateOTP = () => {
    if (!formData.otp.trim()) {
      setErrors({ otp: 'OTP is required' });
      return false;
    }
    if (!/^\d{6}$/.test(formData.otp)) {
      setErrors({ otp: 'OTP must be 6 digits' });
      return false;
    }
    return true;
  };

  const validatePasswords = () => {
    const newErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateEmail()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      await axios.post(`${API_BASE_URL}/customers/forgot-password`, {
        email: formData.email
      });
      
      setStep(2);
      setCountdown(60);
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Send OTP error:', err);
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateOTP()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      await axios.post(`${API_BASE_URL}/customers/verify-otp`, {
        email: formData.email,
        otp: formData.otp
      });
      
      setStep(3);
    } catch (err) {
      console.error('Verify OTP error:', err);
      let errorMessage = 'Invalid OTP. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePasswords()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      await axios.post(`${API_BASE_URL}/customers/reset-password`, {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword
      });
      
      alert('Password reset successfully! Redirecting to login...');
      navigate('/login');
    } catch (err) {
      console.error('Reset password error:', err);
      let errorMessage = 'Failed to reset password. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      await axios.post(`${API_BASE_URL}/customers/forgot-password`, {
        email: formData.email
      });
      
      setCountdown(60);
      // restart countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Resend OTP error:', err);
      let errorMessage = 'Failed to resend OTP.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
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
          <h2 className="auth-title">Reset Your Password</h2>
          <p className="auth-subtitle">
            {step === 1 && 'Enter your email to receive a reset link'}
            {step === 2 && 'Enter the OTP sent to your email'}
            {step === 3 && 'Create your new password'}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-form">
            {/* Step Indicator */}
            <div className="step-indicator">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="step">
                  <div className={`step-circle ${step >= stepNum ? 'active' : ''}`}>
                    {stepNum}
                  </div>
                  <span className="step-label">
                    {stepNum === 1 && 'Email'}
                    {stepNum === 2 && 'Verify'}
                    {stepNum === 3 && 'Reset'}
                  </span>
                  {stepNum < 3 && <div className={`step-line ${step > stepNum ? 'active' : ''}`}></div>}
                </div>
              ))}
            </div>

            {/* Step 1: Email */}
            {step === 1 && (
              <div className="form-step">
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
                    placeholder="Enter your registered email"
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <span className="error-message">{errors.email}</span>
                  )}
                </div>

                {errors.general && (
                  <span className="error-message">{errors.general}</span>
                )}

                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="btn btn-primary auth-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : 'Send Reset Link'}
                </button>
              </div>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <div className="form-step">
                <div className="form-group">
                  <label htmlFor="otp" className="form-label">
                    Enter 6-digit OTP
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="resend-link"
                      disabled={countdown > 0 || isLoading}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </label>
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    className={`form-input ${errors.otp ? 'error' : ''}`}
                    placeholder="Enter OTP"
                    maxLength="6"
                    disabled={isLoading}
                  />
                  {errors.otp && (
                    <span className="error-message">{errors.otp}</span>
                  )}
                  <p className="hint-text">
                    We've sent a 6-digit code to {formData.email}
                  </p>
                </div>

                {errors.general && (
                  <span className="error-message">{errors.general}</span>
                )}

                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  className="btn btn-primary auth-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Back
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <div className="form-step">
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

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password
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

                {errors.general && (
                  <span className="error-message">{errors.general}</span>
                )}

                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="btn btn-primary auth-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : 'Reset Password'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Back
                </button>
              </div>
            )}

            <div className="auth-footer">
              <p>
                Remember your password?{' '}
                <Link to="/login" className="auth-link">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

          <div className="auth-illustration">
            <div className="illustration-content">
              <div className="illustration-emoji">🔐</div>
              <h3>Secure Password Reset</h3>
              <p>We take your account security seriously</p>
              <div className="security-tips">
                <div className="tip">
                  <span className="tip-icon">✅</span>
                  <span>Your password is encrypted</span>
                </div>
                <div className="tip">
                  <span className="tip-icon">✅</span>
                  <span>OTP expires in 10 minutes</span>
                </div>
                <div className="tip">
                  <span className="tip-icon">✅</span>
                  <span>We never share your data</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-help">
          <p>Need help? <Link to="/contact">Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;