// Returns.jsx – Admin Return/Replace Management
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "./Orders.css";

const Returns = () => {
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [requestItems, setRequestItems] = useState([]);
  const [requestImages, setRequestImages] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const statuses = ['pending', 'approved', 'rejected'];

  useEffect(() => {
    fetchReturnRequests();
  }, []);

  const fetchReturnRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/return-requests`, {
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
        throw new Error('Failed to fetch return requests');
      }
      const data = await res.json();
      setReturnRequests(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching return requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (requestId) => {
    const token = localStorage.getItem('token');
    try {
      const [itemsRes, imagesRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_BASE_URL}/api/return-requests/${requestId}/items`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_BASE_URL}/api/return-requests/${requestId}/images`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setRequestItems(items);
      } else {
        setRequestItems([]);
      }
      if (imagesRes.ok) {
        const images = await imagesRes.json();
        setRequestImages(images);
      } else {
        setRequestImages([]);
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    fetchRequestDetails(request.request_id);
    setShowDetailsModal(true);
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Approve this return request?')) return;
    const token = localStorage.getItem('token');
    setActionLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/return-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Return request approved');
        fetchReturnRequests();
        if (selectedRequest?.request_id === requestId) {
          setShowDetailsModal(false);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve');
      }
    } catch (err) {
      alert('Error approving return');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Reject this return request?')) return;
    const token = localStorage.getItem('token');
    setActionLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/return-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Return request rejected');
        fetchReturnRequests();
        if (selectedRequest?.request_id === requestId) {
          setShowDetailsModal(false);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reject');
      }
    } catch (err) {
      alert('Error rejecting return');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = returnRequests.filter(req => {
    const matchesSearch = searchTerm === '' ||
      req.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.order_id.toString().includes(searchTerm) ||
      req.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || req.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status) => {
    switch(status) {
      case 'pending':
        return { color: '#f97316', bg: '#ffedd5', icon: '⏳' };
      case 'approved':
        return { color: '#059669', bg: '#d1fae5', icon: '✅' };
      case 'rejected':
        return { color: '#b91c1c', bg: '#fee2e2', icon: '❌' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', icon: '❓' };
    }
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading return requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-page">
        <div className="error-message">
          <span><i className="fas fa-exclamation-circle"></i> {error}</span>
          <button onClick={fetchReturnRequests}>
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
          <h1><i className="fas fa-undo-alt"></i> Return / Replace Management</h1>
          <p>Manage customer return and replacement requests</p>
        </div>
      </div>

      {/* Pending summary card */}
      {returnRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="return-requests-summary">
          <h3><i className="fas fa-exclamation-triangle"></i> Pending Return Requests: {returnRequests.filter(r => r.status === 'pending').length}</h3>
        </div>
      )}

      <div className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2><i className="fas fa-list"></i> Return Requests</h2>
            <span className="item-count">{filteredRequests.length} requests</span>
          </div>

          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="     Search by customer, order ID, reason..."
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
              <option>Approved</option>
              <option>Rejected</option>
            </select>

            <button
              className="btn btn-secondary"
              onClick={fetchReturnRequests}
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
                <th>REQUEST ID</th>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>ACTION</th>
                <th>REASON</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <h4>No return requests found</h4>
                    <p>Try adjusting your search or filter</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const config = getStatusConfig(req.status);
                  return (
                    <tr key={req.request_id}>
                      <td><span className="order-id">#RET-{req.request_id}</span></td>
                      <td><span className="order-id">#{req.order_id}</span></td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-avatar">
                            {req.customer_name ? req.customer_name.charAt(0).toUpperCase() : '?'}
                          </span>
                          <div>
                            <div className="customer-name">{req.customer_name || 'Unknown'}</div>
                            {req.email && <div className="customer-email">{req.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="payment-badge">{req.action === 'return' ? 'Return' : 'Replace'}</span></td>
                      <td>{req.reason?.length > 30 ? req.reason.substring(0,30)+'…' : req.reason}</td>
                      <td>
                        <div className="datetime-cell">
                          <div className="order-date">{new Date(req.created_at).toLocaleDateString()}</div>
                          <div className="order-time">{new Date(req.created_at).toLocaleTimeString()}</div>
                        </div>
                      </td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: config.bg, color: config.color }}>
                          {config.icon} {req.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-action view"
                          onClick={() => handleViewRequest(req)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        {req.status === 'pending' && (
                          <>
                            <button
                              className="btn-action approve"
                              onClick={() => handleApprove(req.request_id)}
                              disabled={actionLoading}
                              title="Approve"
                              style={{ marginLeft: '5px', color: '#059669' }}
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              className="btn-action reject"
                              onClick={() => handleReject(req.request_id)}
                              disabled={actionLoading}
                              title="Reject"
                              style={{ marginLeft: '5px', color: '#b91c1c' }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-undo-alt"></i>
                Return Request #{selectedRequest.request_id} (Order #{selectedRequest.order_id})
              </h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              {/* Customer Info */}
              <div className="customer-info-section">
                <h4>Customer Information</h4>
                <div className="customer-details">
                  <div className="detail-line">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedRequest.customer_name || 'Unknown'}</span>
                  </div>
                  {selectedRequest.email && (
                    <div className="detail-line">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedRequest.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Details */}
              <div className="return-request-section">
                <h4>Request Details</h4>
                <div className="return-details">
                  <p><strong>Action:</strong> {selectedRequest.action === 'return' ? 'Return for refund' : 'Replace with new item'}</p>
                  <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                  <p><strong>Requested on:</strong> {formatDate(selectedRequest.created_at)}</p>
                  <p><strong>Status:</strong> 
                    <span className={`return-status ${selectedRequest.status}`}>
                      {selectedRequest.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <h4>Items to Return/Replace</h4>
              <div className="table-wrapper">
                <table className="data-table items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestItems.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="empty-state small">
                          <i className="fas fa-box-open"></i>
                          <p>No items found</p>
                        </td>
                      </tr>
                    ) : (
                      requestItems.map(item => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>₹{parseFloat(item.price).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Images */}
              {requestImages.length > 0 && (
                <div className="image-gallery">
                  <h4>Uploaded Images</h4>
                  <div className="image-previews">
                    {requestImages.map((img, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={`${process.env.REACT_APP_API_BASE_URL}/${img.image_path}`} alt="return" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(selectedRequest.request_id)}
                    disabled={actionLoading}
                  >
                    <i className="fas fa-check"></i> Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleReject(selectedRequest.request_id)}
                    disabled={actionLoading}
                  >
                    <i className="fas fa-times"></i> Reject
                  </button>
                </>
              )}
              <button
                className="btn btn-outline"
                onClick={() => setShowDetailsModal(false)}
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

export default Returns;