import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShoppingBag,
  faBoxOpen,
  faSpinner,
  faExclamationCircle,
  faChevronRight,
  faCube
} from '@fortawesome/free-solid-svg-icons';
import API_BASE_URL from '../config';
import './Orders.css';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/orders`, {
  headers: { Authorization: `Bearer ${token}` }
});

        // Sort orders by date descending (newest first)
        const sortedOrders = response.data.sort((a, b) => 
          new Date(b.order_date) - new Date(a.order_date)
        );
        setOrders(sortedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          `Error ${err.response?.status}: ${err.response?.statusText}` ||
          'Failed to load orders. Please try again later.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'status-delivered';
      case 'shipped': return 'status-shipped';
      case 'processing': return 'status-processing';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="orders-loading">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-error">
        <FontAwesomeIcon icon={faExclamationCircle} size="3x" />
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="orders-page">
      {/* Header with primary green background */}
      <div className="orders-header orders-header-green">
        <h1>
          <FontAwesomeIcon icon={faShoppingBag} />
          My Orders
        </h1>
        <p>View and track all your orders</p>
      </div>

      <div className="orders-container">
        {orders.length === 0 ? (
          <div className="no-orders">
            <FontAwesomeIcon icon={faBoxOpen} size="4x" />
            <h3>No orders yet</h3>
            <p>Looks like you haven't placed any orders.</p>
            <Link to="/shop" className="btn-shop">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.order_id} className="order-card">
                <div className="order-card__header">
                  <div className="order-card__id">
                    <span className="label">Order</span>
                    <span className="value">#{order.order_id}</span>
                  </div>
                  <span className={`order-card__status ${getStatusClass(order.order_status)}`}>
                    {order.order_status}
                  </span>
                </div>

                <div className="order-card__body">
                  <div className="order-card__info">
                    <div className="info-item">
                      <span className="info-label">Placed on</span>
                      <span className="info-value">{formatDate(order.order_date)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Total</span>
                      <span className="info-value">₹{order.total_amount?.toFixed(2)}</span>
                    </div>
                    {order.items_count && (
                      <div className="info-item">
                        <FontAwesomeIcon icon={faCube} className="info-icon" />
                        <span className="info-label">Items</span>
                        <span className="info-value">{order.items_count}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-card__footer">
                  <Link to={`/orders/${order.order_id}`} className="btn-view">
                    View Details
                    <FontAwesomeIcon icon={faChevronRight} className="btn-icon" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;