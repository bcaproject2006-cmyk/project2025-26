import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faLock,
  faEdit,
  faSave,
  faTimes,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faStar,
  faTrophy,
  faHistory,
  faBell,
  faCommentDots
} from '@fortawesome/free-solid-svg-icons';
import './Profile.css';

const API_BASE_URL = 'http://localhost:8000/api';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // WhatsApp opt-in state
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [updatingWhatsapp, setUpdatingWhatsapp] = useState(false);

  // Profile form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Helper to get token from localStorage
  const getAuthToken = () => localStorage.getItem('token');

  // Fetch profile and WhatsApp status on mount
  useEffect(() => {
    const fetchProfileAndPreferences = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch customer profile
        const profileResponse = await axios.get(`${API_BASE_URL}/customers/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const userData = profileResponse.data;
        setUser({
          ...userData,
          phone_no: userData.phone_no || userData.phone || '',
          address: userData.address || '',
          reward_points: userData.reward_points || 0
        });

        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone_no || userData.phone || '',
          address: userData.address || ''
        });

        localStorage.setItem('customer', JSON.stringify(userData));

        // Fetch WhatsApp opt-in status
        try {
          const whatsappResponse = await axios.get(`${API_BASE_URL}/customers/whatsapp/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setWhatsappOptIn(whatsappResponse.data.whatsapp_opt_in || false);
        } catch (whatsappErr) {
          console.error('Error fetching WhatsApp status:', whatsappErr);
          // Default to false if endpoint fails
          setWhatsappOptIn(false);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('customer');
          navigate('/login');
        } else {
          const errorMsg = err.response?.data?.message ||
                           err.response?.data?.error ||
                           'Failed to load profile. Please refresh the page.';
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPreferences();
  }, [navigate]);

  // Handle WhatsApp opt-in toggle
  const handleWhatsAppToggle = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setUpdatingWhatsapp(true);
    const endpoint = whatsappOptIn ? 'opt-out' : 'opt-in';

    try {
      await axios.post(
        `${API_BASE_URL}/customers/whatsapp/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWhatsappOptIn(!whatsappOptIn);
      setSuccess(`WhatsApp notifications ${!whatsappOptIn ? 'enabled' : 'disabled'} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating WhatsApp preference:', err);
      setError('Failed to update WhatsApp preference. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUpdatingWhatsapp(false);
    }
  };

  // Handle input changes for profile form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate profile form
  const validateProfileForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (formData.phone && !/^[0-9+\-\s()]{10,}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    return errors;
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const errors = validateProfileForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone_no: formData.phone,
        address: formData.address
      };

      const response = await axios.put(`${API_BASE_URL}/customers/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedUser = response.data;

      const newUser = {
        ...updatedUser,
        phone_no: updatedUser.phone_no || updatedUser.phone || '',
        address: updatedUser.address || '',
        reward_points: updatedUser.reward_points !== undefined ? updatedUser.reward_points : user?.reward_points || 0
      };

      localStorage.setItem('customer', JSON.stringify(newUser));
      setUser(newUser);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = 'Current password is required';
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  // Handle password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.post(`${API_BASE_URL}/customers/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Password changed successfully!');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone_no || user?.phone || '',
      address: user?.address || ''
    });
    setFormErrors({});
    setIsEditing(false);
  };

  // Cancel password change
  const cancelPasswordChange = () => {
    setShowPasswordForm(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    const nameParts = user.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  if (loading && !user) {
    return (
      <div className="profile-loading">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-cover">
          <div className="profile-avatar-large">
            {getUserInitials()}
          </div>
        </div>
        <h1>My Profile</h1>
        <p>Manage your personal information and account settings</p>
      </div>

      <div className="profile-container">
        {/* Success/Error Messages */}
        {success && (
          <div className="alert success">
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="alert error">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{error}</span>
          </div>
        )}

        {/* Personal Information Section */}
        <div className="profile-card">
          <div className="card-header">
            <h2>
              <FontAwesomeIcon icon={faUser} />
              Personal Information
            </h2>
            {!isEditing && (
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <FontAwesomeIcon icon={faEdit} />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-group">
                <label htmlFor="name">
                  <FontAwesomeIcon icon={faUser} />
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={formErrors.name ? 'error' : ''}
                  placeholder="Enter your full name"
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <FontAwesomeIcon icon={faEnvelope} />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={formErrors.email ? 'error' : ''}
                  placeholder="Enter your email"
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  <FontAwesomeIcon icon={faPhone} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={formErrors.phone ? 'error' : ''}
                  placeholder="Enter your phone number"
                />
                {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="address">
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows="3"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your address"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                  Save Changes
                </button>
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  <FontAwesomeIcon icon={faTimes} />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-row">
                <span className="info-label">Full Name:</span>
                <span className="info-value">{user?.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone:</span>
                <span className="info-value">{user?.phone_no || user?.phone || 'Not provided'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Address:</span>
                <span className="info-value">{user?.address || 'Not provided'}</span>
              </div>
              <div className="info-row reward-points">
                <span className="info-label">
                  <FontAwesomeIcon icon={faStar} style={{ color: '#ffc107', marginRight: '5px' }} />
                  Reward Points:
                </span>
                <span className="info-value">{user?.reward_points || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notification Preferences Section - WhatsApp Opt-in */}
        <div className="profile-card notification-card">
          <div className="card-header">
            <h2>
              <FontAwesomeIcon icon={faBell} />
              Notification Preferences
            </h2>
          </div>
          <div className="notification-content">
            <div className="notification-item">
              <div className="notification-icon">
                <FontAwesomeIcon icon={faCommentDots} style={{ color: '#25D366' }} />
              </div>
              <div className="notification-info">
                <h3>WhatsApp Offers & Updates</h3>
                <p>Receive exclusive discounts, new product alerts, and seasonal offers directly on WhatsApp at <strong>{user?.phone_no || 'your registered number'}</strong>.</p>
              </div>
              <div className="notification-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={handleWhatsAppToggle}
                    disabled={updatingWhatsapp}
                  />
                  <span className="toggle-slider"></span>
                </label>
                {updatingWhatsapp && (
                  <span className="toggle-loading">
                    <FontAwesomeIcon icon={faSpinner} spin />
                  </span>
                )}
              </div>
            </div>
            <p className="notification-note">
              You can change this preference anytime. We respect your privacy and will never spam you.
            </p>
          </div>
        </div>

        {/* Password Section */}
        <div className="profile-card">
          <div className="card-header">
            <h2>
              <FontAwesomeIcon icon={faLock} />
              Security
            </h2>
            {!showPasswordForm && (
              <button className="btn-edit" onClick={() => setShowPasswordForm(true)}>
                <FontAwesomeIcon icon={faEdit} />
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm ? (
            <form onSubmit={handlePasswordSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className={passwordErrors.currentPassword ? 'error' : ''}
                  placeholder="Enter current password"
                />
                {passwordErrors.currentPassword && (
                  <span className="error-text">{passwordErrors.currentPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={passwordErrors.newPassword ? 'error' : ''}
                  placeholder="Enter new password (min. 6 characters)"
                />
                {passwordErrors.newPassword && (
                  <span className="error-text">{passwordErrors.newPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={passwordErrors.confirmPassword ? 'error' : ''}
                  placeholder="Re-enter new password"
                />
                {passwordErrors.confirmPassword && (
                  <span className="error-text">{passwordErrors.confirmPassword}</span>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                  Update Password
                </button>
                <button type="button" className="btn-secondary" onClick={cancelPasswordChange}>
                  <FontAwesomeIcon icon={faTimes} />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="card-description">
              Change your password regularly to keep your account secure.
            </p>
          )}
        </div>

        {/* Reward Points Info Card */}
        <div className="profile-card reward-card">
          <div className="card-header">
            <h2>
              <FontAwesomeIcon icon={faTrophy} />
              Loyalty Rewards
            </h2>
          </div>
          <div className="reward-content">
            <div className="reward-points-large">
              <span className="points-number">{user?.reward_points || 0}</span>
              <span className="points-label">Points Earned</span>
            </div>
            <p className="reward-description">
              Earn points on every purchase and redeem them for exciting discounts and offers.
            </p>
            <Link to="/rewards" className="btn-link">
              View Rewards Catalog
              <FontAwesomeIcon icon={faHistory} style={{ marginLeft: '5px' }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;