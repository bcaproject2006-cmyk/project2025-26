import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch order');
        const data = await response.json();
        console.log('✅ Fetched order:', data);
        setOrder(data);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/invoices/${orderId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Could not download invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="order-success-page">
        <div className="container">
          <div className="success-card loading">Loading your order details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-page">
      <div className="container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>Order Placed Successfully!</h1>
          <p className="subtitle">Thank you for shopping with FreshBasket</p>

          <div className="order-details">
            <h3>Order Summary</h3>
            <p><strong>Order ID:</strong> #{orderId}</p>
            <p><strong>Date:</strong> {formatDate(order?.order_date)}</p>
            <p><strong>Total Amount:</strong> ₹
              {order?.total_amount ? Number(order.total_amount).toFixed(2) : 'N/A'}
            </p>
            <p><strong>Payment Method:</strong> 
              {order?.payment_mode === 'cod' ? 'Cash on Delivery' : (order?.payment_mode || 'Not specified')}
            </p>
            <p><strong>Delivery Address:</strong> {order?.address || order?.delivery_address || 'Not provided'}</p>
            <p className="email-note">A copy of your invoice has been sent to your email.</p>
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleDownloadInvoice}
              disabled={downloading}
            >
              {downloading ? 'Preparing...' : 'Download Invoice (PDF)'}
            </button>
            <Link to="/" className="btn btn-secondary">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;