import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}/api`;

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // Helper to get token from either storage
  const getToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  };

  // Helper to get stored user data from login
  const getStoredUser = () => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    return null;
  };

  // Update stored user data
  const updateStoredUser = (userData) => {
    // Store in both storages to keep consistency with token
    sessionStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const fetchUserProfile = async (showRefreshLoading = true) => {
    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      navigate('/login');
      return;
    }

    if (showRefreshLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError('');

    try {
      console.log('Fetching profile with token:', token.substring(0, 20) + '...');
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile fetch failed:', response.status, errorText);

        // If token is invalid or expired, clear storage and redirect to login
        if (response.status === 401 || response.status === 403) {
          localStorage.clear();
          sessionStorage.clear();
          navigate('/login');
          return;
        }

        // For 404 (user not found), try to use stored user data from login
        if (response.status === 404) {
          const storedUser = getStoredUser();
          if (storedUser && storedUser.user_id) {
            console.warn('Profile fetch returned 404, using stored user data from login');
            setUser(storedUser);
            return;
          }
        }

        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      setUser(data);
      // Update stored user with fresh data
      updateStoredUser(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.message);

      // If fetch fails and we have stored user, fallback to it
      const storedUser = getStoredUser();
      if (storedUser && storedUser.user_id) {
        console.warn('Using stored user data due to fetch error');
        setUser(storedUser);
        setError(`${err.message}. Showing previously saved information.`);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    fetchUserProfile(false);
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  // Show error if no user data at all
  if (error && !user) {
    return (
      <div className="profile-error">
        <p>Error: {error}</p>
        <button onClick={() => navigate('/login')} className="profile-retry-btn">
          Go to Login
        </button>
      </div>
    );
  }

  // If user is still null after loading, show error
  if (!user) {
    return <div className="profile-error">No user data available. Please log in again.</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-email">{user.email}</p>
          <span className="profile-role">{user.role}</span>
          {error && (
            <div className="profile-warning">
              <span>⚠️ {error}</span>
              <button onClick={handleRefresh} disabled={isRefreshing} className="profile-refresh-btn">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="profile-details">
        <div className="profile-section">
          <h3>Personal Information</h3>
          <div className="profile-field">
            <span className="field-label">Full Name:</span>
            <span className="field-value">{user.name}</span>
          </div>
          <div className="profile-field">
            <span className="field-label">Email:</span>
            <span className="field-value">{user.email}</span>
          </div>
          <div className="profile-field">
            <span className="field-label">Mobile:</span>
            <span className="field-value">{user.mobile || 'Not provided'}</span>
          </div>
          <div className="profile-field">
            <span className="field-label">Role:</span>
            <span className="field-value">{user.role}</span>
          </div>
          <div className="profile-field">
            <span className="field-label">Status:</span>
            <span className="field-value">{user.status}</span>
          </div>
          <div className="profile-field">
            <span className="field-label">Member since:</span>
            <span className="field-value">
              {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;