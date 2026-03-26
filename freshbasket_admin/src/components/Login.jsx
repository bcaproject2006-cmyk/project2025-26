import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login with:', formData.email);

      const response = await fetch("http://localhost:8000/api/users/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', responseText);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || `Login failed with status ${response.status}`);
      }
// Store token and user in localStorage
localStorage.setItem("token", data.token);
localStorage.setItem("user", JSON.stringify(data.user));

if (data.user) {
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("user_id", data.user.user_id || data.user.id || "");
  localStorage.setItem("user_name", data.user.name || "");
  localStorage.setItem("user_email", data.user.email || "");
  localStorage.setItem("user_role", data.user.role || "");
}

// Optional remember email
if (formData.rememberMe) {
  localStorage.setItem("rememberedEmail", formData.email);
}
      // Save email for convenience (optional)
      if (formData.rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Call onLogin callback if provided
      if (onLogin) onLogin(data.user);

      // Navigate to dashboard
      navigate("/dashboard");

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left-panel">
        <div className="login-container">

          <div className="login-header">
            <div className="logo">
              <span className="logo-icon">🛒</span>
              <h1>FreshBasket</h1>
            </div>
            <p className="tagline">Store Management System</p>
          </div>

          <div className="login-form-container">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your admin account</p>
            </div>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">

              {/* EMAIL */}
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>

              {/* PASSWORD */}
              <div className="form-group">
                <label>Password</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={togglePasswordVisibility}
                    disabled={loading}
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>

              {/* REMEMBER + FORGOT */}
              <div className="remember-row">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span>Remember me</span>
                </label>

                <Link to="/forgot-password/users" className="forgot-link">
                  Forgot password?
                </Link>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

            </form>
          </div>
        </div>
      </div>

      {/* Right Panel - Welcome Graphics */}
      <div className="login-right-panel">
        <div className="welcome-overlay">
          <div className="welcome-content">
            <h2>FreshBasket Admin Portal</h2>
            <p>Manage your grocery store efficiently with our comprehensive dashboard</p>

            <div className="features-list">
              <div className="feature-item">
                <i className="fas fa-chart-line"></i>
                <div>
                  <h4>Real-time Analytics</h4>
                  <p>Monitor sales and performance metrics</p>
                </div>
              </div>

              <div className="feature-item">
                <i className="fas fa-boxes"></i>
                <div>
                  <h4>Inventory Management</h4>
                  <p>Track stock levels and automate ordering</p>
                </div>
              </div>

              <div className="feature-item">
                <i className="fas fa-users"></i>
                <div>
                  <h4>Customer Insights</h4>
                  <p>Understand customer behavior and preferences</p>
                </div>
              </div>

              <div className="feature-item">
                <i className="fas fa-file-invoice-dollar"></i>
                <div>
                  <h4>Billing & Invoicing</h4>
                  <p>Streamlined billing and payment processing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Grocery Elements with Emojis */}
        <div className="bg-elements">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="shopping-cart">
            <span role="img" aria-label="shopping cart">🛒</span>
          </div>
          <div className="fruit apple">
            <span role="img" aria-label="apple">🍎</span>
          </div>
          <div className="fruit orange">
            <span role="img" aria-label="orange">🍊</span>
          </div>
          <div className="fruit strawberry">
            <span role="img" aria-label="strawberry">🍓</span>
          </div>
          <div className="vegetable carrot">
            <span role="img" aria-label="carrot">🥕</span>
          </div>
          <div className="vegetable broccoli">
            <span role="img" aria-label="broccoli">🥦</span>
          </div>
          <div className="basket">
            <span role="img" aria-label="basket">🧺</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;