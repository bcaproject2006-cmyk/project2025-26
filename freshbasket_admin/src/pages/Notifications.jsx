// Notifications.jsx – Admin Notifications Management (Newest first, no ID/User columns)
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "./Orders.css"; // Reuse Orders styles
import "./Notifications.css"; // Additional specific styles

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.clear();
          navigate('/login');
          return;
        }
        if (res.status === 403) {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch notifications');
      }
      const data = await res.json();
      
      // Sort notifications by created_at descending (newest first)
      const sorted = data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setNotifications(sorted);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    const token = localStorage.getItem('token');
    const notification = notifications.find(n => n.notification_id === id);
    if (!notification) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: notification.user_id,
          message: notification.message,
          status: 'read'
        })
      });

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.notification_id === id ? { ...n, status: 'read' } : n)
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to mark as read');
      }
    } catch (err) {
      console.error('Error marking as read:', err);
      alert('Network error');
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.notification_id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Network error');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status !== 'read';
    if (filter === 'read') return n.status === 'read';
    return true;
  });

  if (loading) {
    return (
      <div className="orders-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-page">
        <div className="error-message">
          <span><i className="fas fa-exclamation-circle"></i> {error}</span>
          <button onClick={fetchNotifications}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <div className="header-title">
          <h1><i className="fas fa-bell"></i> Notifications</h1>
          <p>System notifications and alerts</p>
        </div>
      </div>

      <div className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2><i className="fas fa-list"></i> Notification List</h2>
            <span className="item-count">{filteredNotifications.length} notifications</span>
          </div>

          <div className="table-controls">
            <select
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <button
              className="btn btn-secondary"
              onClick={fetchNotifications}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <h4>No notifications</h4>
                    <p>You're all caught up!</p>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map(notif => (
                  <tr key={notif.notification_id}>
                    <td className="notification-message">{notif.message}</td>
                    <td>
                      <div className="datetime-cell">
                        <div className="order-date">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </div>
                        <div className="order-time">
                          {new Date(notif.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{
                          backgroundColor: notif.status === 'read' ? '#d1fae5' : '#fee2e2',
                          color: notif.status === 'read' ? '#059669' : '#b91c1c'
                        }}
                      >
                        {notif.status === 'read' ? '✓ Read' : '● Unread'}
                      </span>
                    </td>
                    <td className="action-buttons">
                      {notif.status !== 'read' && (
                        <button
                          className="btn-action mark-read"
                          onClick={() => markAsRead(notif.notification_id)}
                          title="Mark as Read"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      <button
                        className="btn-action delete"
                        onClick={() => deleteNotification(notif.notification_id)}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Notifications;