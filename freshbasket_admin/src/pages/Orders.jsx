// Orders.jsx – Admin with full return request management + disabled status for cancelled
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import "./Orders.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [paymentFilter, setPaymentFilter] = useState('All Payments');
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryProcessing, setDeliveryProcessing] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const paymentModes = ["Credit Card", "Debit Card", "PayPal", "Cash", "Bank Transfer"];
  const orderStatuses = [
    "pending", "processing", "out for delivery", "delivered", "cancelled",
    "return requested", "return approved", "return rejected"
  ];

  useEffect(() => {
    fetchOrders();
    fetchReturnRequests();
  }, []);

  useEffect(() => {
    if (location.state?.orderId && orders.length > 0) {
      const order = orders.find(o => o.order_id === location.state.orderId);
      if (order) handleViewOrder(order);
    }
  }, [orders, location.state]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch all customers to build a lookup map (admin only)
      let customerMap = {};
      try {
        const customersResponse = await fetch('http://localhost:8000/api/customers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (customersResponse.ok) {
          const customers = await customersResponse.json();
          customerMap = customers.reduce((map, customer) => {
            map[customer.customer_id] = customer;
            return map;
          }, {});
        }
      } catch (err) {
        console.warn('Could not fetch customer details, proceeding without names');
      }

      const response = await fetch('http://localhost:8000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          navigate('/login');
          return;
        }
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Transform orders and attach customer details from the map
      const transformedOrders = data.map((order) => {
        const customer = customerMap[order.user_id] || {};
        const { date, time } = formatDateAndTime(order.order_date);

        return {
          id: `#ORD-${order.order_id}`,
          order_id: order.order_id,
          user_id: order.user_id,
          customer: customer.name || `Customer #${order.user_id}`,
          customer_email: customer.email || '',
          customer_phone: customer.phone_no || '',
          date: date,
          time: time,
          original_date: order.order_date,
          amount: parseFloat(order.total_amount),
          payment: order.payment_mode,
          status: order.order_status?.toLowerCase() || '',
          delivery_fee: parseFloat(order.delivery_fee) || 0,
          discount: parseFloat(order.discount) || 0,
          address: order.address || '',
          returnRequest: null // will be populated when viewing
        };
      });

      setOrders(transformedOrders);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/return-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReturnRequests(data);
      }
    } catch (err) {
      console.error('Error fetching return requests:', err);
    }
  };

  const formatDateAndTime = (dateString) => {
    if (!dateString) return { date: '', time: '' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: dateString, time: '' };

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');
      const formattedTime = `${formattedHours}:${minutes} ${ampm}`;

      return { date: formattedDate, time: formattedTime };
    } catch (e) {
      return { date: dateString, time: '' };
    }
  };

  const formatIndianRupee = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return amount.toFixed(2);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Session expired. Please login again.');
        navigate('/login');
        return;
      }

      const orderId = id.replace('#ORD-', '');
      const orderToUpdate = orders.find(o => o.id === id);
      if (!orderToUpdate) {
        alert('Order not found');
        return;
      }

      // Prevent updating cancelled orders
      if (orderToUpdate.status === 'cancelled') {
        alert('Cannot update a cancelled order.');
        return;
      }

      let formattedDate = orderToUpdate.original_date;
      if (formattedDate) {
        const d = new Date(formattedDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split('T')[0];
        }
      }

      const updateData = {
        user_id: parseInt(orderToUpdate.user_id, 10) || 0,
        order_date: formattedDate,
        total_amount: parseFloat(orderToUpdate.amount) || 0,
        payment_mode: orderToUpdate.payment || '',
        order_status: newStatus,
        address: orderToUpdate.address || '',
        delivery_fee: orderToUpdate.delivery_fee || 0,
        discount: orderToUpdate.discount || 0
      };

      const response = await fetch(`http://localhost:8000/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const responseText = await response.text();

      if (response.status === 403) {
        alert('Access denied. You do not have permission to update orders.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${responseText}`);
      }

      setOrders(orders.map(order =>
        order.id === id ? { ...order, status: newStatus } : order
      ));

      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      alert(`Order status updated to ${formatStatus(newStatus)}`);
    } catch (err) {
      console.error('Error in updateStatus:', err);
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleSendForDelivery = async () => {
    if (!selectedOrder) return;
    if (['delivered', 'cancelled', 'out for delivery', 'return requested', 'return approved', 'return rejected'].includes(selectedOrder.status)) {
      alert(`This order is already ${selectedOrder.status}`);
      return;
    }

    const confirmDelivery = window.confirm(`Are you sure you want to send order ${selectedOrder.id} for delivery?`);
    if (!confirmDelivery) return;

    setDeliveryProcessing(true);
    try {
      await updateStatus(selectedOrder.id, 'out for delivery');
    } catch (err) {
      console.error('Error sending for delivery:', err);
    } finally {
      setDeliveryProcessing(false);
    }
  };

  // Return approval/rejection using dedicated endpoints
  const handleApproveReturn = async (requestId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8000/api/return-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Return request approved');
        fetchOrders();
        fetchReturnRequests();
        setShowOrderModal(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve');
      }
    } catch (err) {
      alert('Error approving return');
    }
  };

  const handleRejectReturn = async (requestId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8000/api/return-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Return request rejected');
        fetchOrders();
        fetchReturnRequests();
        setShowOrderModal(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reject');
      }
    } catch (err) {
      alert('Error rejecting return');
    }
  };

  // Updated handleViewOrder to use real data from backend (unit, category_name, product_id)
  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    const orderId = parseInt(order.id.replace('#ORD-', ''));

    try {
      const token = localStorage.getItem('token');

      const itemsResponse = await fetch(`http://localhost:8000/api/orders/${orderId}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        // Items now include product_id, unit, category_name from updated backend
        setSelectedOrderItems(items);
      } else {
        setSelectedOrderItems([]);
      }

      // Fetch return request for this order
      const returnRes = await fetch(`http://localhost:8000/api/return-requests/order/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (returnRes.ok) {
        const returnData = await returnRes.json();
        setSelectedOrder(prev => ({ ...prev, returnRequest: returnData }));
      } else {
        setSelectedOrder(prev => ({ ...prev, returnRequest: null }));
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setSelectedOrderItems([]);
    }

    setShowOrderModal(true);
  };

  const formatStatus = (status) => {
    if (!status) return 'Pending';
    return status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer && order.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.payment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_email && order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All Status' ||
      order.status === statusFilter.toLowerCase();

    const matchesPayment = paymentFilter === 'All Payments' ||
      order.payment === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const isDeliveryEnabled = () => {
    if (!selectedOrder) return false;
    return !['delivered', 'cancelled', 'out for delivery', 'return requested', 'return approved', 'return rejected'].includes(selectedOrder.status);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'delivered': return "✅";
      case 'out for delivery': return "🚚";
      case 'processing': return "🔄";
      case 'pending': return "⏰";
      case 'cancelled': return "❌";
      case 'return requested': return "↩️";
      case 'return approved': return "✅🔄";
      case 'return rejected': return "❌↩️";
      default: return "⏰";
    }
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'delivered':
        return { color: "#10b981", bg: "#d1fae5" };
      case 'out for delivery':
        return { color: "#8b5cf6", bg: "#ede9fe" };
      case 'processing':
        return { color: "#3b82f6", bg: "#dbeafe" };
      case 'pending':
        return { color: "#f59e0b", bg: "#fef3c7" };
      case 'cancelled':
        return { color: "#ef4444", bg: "#fee2e2" };
      case 'return requested':
        return { color: "#f97316", bg: "#ffedd5" };
      case 'return approved':
        return { color: "#059669", bg: "#d1fae5" };
      case 'return rejected':
        return { color: "#b91c1c", bg: "#fee2e2" };
      default:
        return { color: "#f59e0b", bg: "#fef3c7" };
    }
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-page">
        <div className="error-message">
          <span><i className="fas fa-exclamation-circle"></i> {error}</span>
          <button onClick={fetchOrders}>
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
          <h1><i className="fas fa-shopping-cart"></i> Orders Management</h1>
          <p>View and manage customer orders</p>
        </div>
      </div>

      {/* Optional: Return Requests Summary Card */}
      {returnRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="return-requests-summary">
          <h3><i className="fas fa-exclamation-triangle"></i> Pending Return Requests: {returnRequests.filter(r => r.status === 'pending').length}</h3>
        </div>
      )}

      <div className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2><i className="fas fa-list"></i> Orders List</h2>
            <span className="item-count">{filteredOrders.length} items</span>
          </div>

          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="    Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Out for Delivery</option>
              <option>Delivered</option>
              <option>Cancelled</option>
              <option>Return Requested</option>
              <option>Return Approved</option>
              <option>Return Rejected</option>
            </select>

            <select
              className="filter-select"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option>All Payments</option>
              {paymentModes.map(mode => <option key={mode}>{mode}</option>)}
            </select>

            <button
              className="btn btn-secondary"
              onClick={() => { fetchOrders(); fetchReturnRequests(); }}
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
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>AMOUNT</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <h4>No orders found</h4>
                    <p>Try adjusting your search or filter</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const config = getStatusConfig(order.status);
                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="order-id">{order.id}</span>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-avatar">
                            {order.customer ? order.customer.charAt(0).toUpperCase() : '?'}
                          </span>
                          <div>
                            <div className="customer-name">{order.customer || 'Unknown Customer'}</div>
                            {order.customer_email && (
                              <div className="customer-email">{order.customer_email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="datetime-cell">
                          <div className="order-date">{order.date}</div>
                          <div className="order-time">{order.time}</div>
                        </div>
                      </td>
                      <td>
                        <span className="order-amount">₹{formatIndianRupee(order.amount)}</span>
                      </td>
                      <td>
                        <span className={`payment-badge ${order.payment ? order.payment.toLowerCase().replace(' ', '-') : 'cash'}`}>
                          {order.payment || 'Cash'}
                        </span>
                      </td>
                      <td>
                        <div className="status-cell">
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: config.bg,
                              color: config.color
                            }}
                          >
                            {getStatusIcon(order.status)} {formatStatus(order.status)}
                          </span>
                          <select
                            value={order.status || 'pending'}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            className="status-select"
                            style={{ color: config.color }}
                            disabled={order.status === 'cancelled'} // Disable for cancelled orders
                          >
                            {orderStatuses.map(status => (
                              <option key={status} value={status}>
                                {formatStatus(status)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-action view"
                          onClick={() => handleViewOrder(order)}
                          title="View Order Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>
                <i className="fas fa-receipt"></i>
                Order Details - {selectedOrder.id}
              </h3>
              <button className="modal-close" onClick={() => setShowOrderModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              {/* Customer Information */}
              <div className="customer-info-section">
                <h4>Customer Information</h4>
                <div className="customer-details">
                  <div className="detail-line">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedOrder.customer || 'Unknown Customer'}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div className="detail-line">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedOrder.customer_email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div className="detail-line">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                  {selectedOrder.address && (
                    <div className="detail-line">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{selectedOrder.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Return Request Section (if any) */}
              {selectedOrder.returnRequest && (
                <div className="return-request-section">
                  <h4>Return Request</h4>
                  <div className="return-details">
                    <p><strong>Reason:</strong> {selectedOrder.returnRequest.reason}</p>
                    <p><strong>Status:</strong> 
                      <span className={`return-status ${selectedOrder.returnRequest.status}`}>
                        {selectedOrder.returnRequest.status}
                      </span>
                    </p>
                    <p><strong>Requested on:</strong> {new Date(selectedOrder.returnRequest.created_at).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Order Items Table – Category column removed */}
{/* Order Items Table – with Sr. No. and without product ID */}
<h4>Order Items</h4>
<div className="table-wrapper">
  <table className="data-table items-table">
    <thead>
      <tr>
        <th>Sr. No.</th>               {/* New column */}
        <th>Product</th>
                <th>Unit</th>
        <th>Qty</th>
        <th>Price (₹)</th>
        <th>Subtotal (₹)</th>
      </tr>
    </thead>
    <tbody>
      {selectedOrderItems.length === 0 ? (
        <tr>
          <td colSpan="6" className="empty-state small">
            <i className="fas fa-box-open"></i>
            <p>No items found for this order</p>
          </td>
        </tr>
      ) : (
        selectedOrderItems.map((item, index) => (
          <tr key={index}>
            <td>{index + 1}</td>        {/* Sr. No. */}
            <td>
              <div className="product-info">
                <span className="product-name">{item.product_name}</span>
                {/* Product ID span removed */}
              </div>
            </td>
            <td>{item.unit || 'pcs'}</td>
            <td>{item.quantity}</td>
            <td>₹{parseFloat(item.price).toFixed(2)}</td>
            <td>₹{parseFloat(item.subtotal).toFixed(2)}</td>
          </tr>
        ))
      )}
    </tbody>
    <tfoot>
      {/* Discount row – only show if discount > 0 */}
      {selectedOrder.discount > 0 && (
        <tr>
          <td colSpan="5">Discount</td>
          <td>-₹{formatIndianRupee(selectedOrder.discount)}</td>
        </tr>
      )}
      <tr>
        <td colSpan="5">Delivery Fee</td>
        <td>₹{formatIndianRupee(selectedOrder.delivery_fee)}</td>
      </tr>
      <tr>
        <td colSpan="5" className="total-label">Total Amount</td>
        <td className="total-value">₹{formatIndianRupee(selectedOrder.amount)}</td>
      </tr>
    </tfoot>
  </table>
</div>

              {/* Order Summary */}
              <div className="order-summary">
                <div className="summary-line">
                  <span className="summary-label">Order Date:</span>
                  <span className="summary-value">{selectedOrder.date} at {selectedOrder.time}</span>
                </div>
                <div className="summary-line">
                  <span className="summary-label">Payment Method:</span>
                  <span className="summary-value">{selectedOrder.payment || 'Cash'}</span>
                </div>
                <div className="summary-line">
                  <span className="summary-label">Order Status:</span>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: selectedOrder.status === 'delivered' ? '#d1fae5' :
                                     selectedOrder.status === 'out for delivery' ? '#ede9fe' :
                                     selectedOrder.status === 'processing' ? '#dbeafe' :
                                     selectedOrder.status === 'pending' ? '#fef3c7' :
                                     selectedOrder.status === 'return requested' ? '#ffedd5' :
                                     selectedOrder.status === 'return approved' ? '#d1fae5' :
                                     selectedOrder.status === 'return rejected' ? '#fee2e2' : '#fee2e2',
                      color: selectedOrder.status === 'delivered' ? '#10b981' :
                             selectedOrder.status === 'out for delivery' ? '#8b5cf6' :
                             selectedOrder.status === 'processing' ? '#3b82f6' :
                             selectedOrder.status === 'pending' ? '#f59e0b' :
                             selectedOrder.status === 'return requested' ? '#f97316' :
                             selectedOrder.status === 'return approved' ? '#059669' :
                             selectedOrder.status === 'return rejected' ? '#b91c1c' : '#ef4444'
                    }}
                  >
                    {getStatusIcon(selectedOrder.status)} {formatStatus(selectedOrder.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {/* Return action buttons if return request exists and is pending */}
              {selectedOrder.returnRequest?.status === 'pending' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApproveReturn(selectedOrder.returnRequest.request_id)}
                  >
                    <i className="fas fa-check"></i> Approve Return
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRejectReturn(selectedOrder.returnRequest.request_id)}
                  >
                    <i className="fas fa-times"></i> Reject Return
                  </button>
                </>
              )}

              {/* Show Send for Delivery button only for eligible statuses */}
              {isDeliveryEnabled() && (
                <button
                  className="btn btn-primary"
                  onClick={handleSendForDelivery}
                  disabled={deliveryProcessing}
                >
                  {deliveryProcessing ? 'Processing...' : 'Send for Delivery'}
                </button>
              )}

              <button
                className="btn btn-outline"
                onClick={() => setShowOrderModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;