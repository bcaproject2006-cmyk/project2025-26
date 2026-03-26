// OrderDetails.jsx – Final version with item selection, return/replace choice, reason, image upload, and return status messages
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapMarkerAlt,
  faSpinner,
  faExclamationCircle,
  faArrowLeft,
  faBoxOpen,
  faReceipt,
  faCheckCircle,
  faTimesCircle,
  faUndoAlt,
  faBan,
  faTruck,
  faClock,
  faHourglassHalf,
  faImage,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import API_BASE_URL from "../config";
import "./Orders.css";

const OrderDetails = () => {
  const { order_id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Return reason modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [returnAction, setReturnAction] = useState("return");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const reasonOptions = [
    "Damaged product",
    "Wrong item delivered",
    "Not as described",
    "Size issue",
    "Quality issue",
    "Other"
  ];

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        const [orderRes, itemsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/orders/${order_id}`, { headers }),
          axios.get(`${API_BASE_URL}/orders/${order_id}/items`, { headers }),
        ]);

        setOrder(orderRes.data);
        setItems(itemsRes.data || []);
      } catch (err) {
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to load order details.";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [order_id, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const safeNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const getOrderProgress = (status) => {
    const steps = [
      { key: "pending", label: "Pending", icon: faClock },
      { key: "processing", label: "Processing", icon: faHourglassHalf },
      { key: "out for delivery", label: "Out for Delivery", icon: faTruck },
      { key: "delivered", label: "Delivered", icon: faCheckCircle },
    ];
    const statusLower = status?.toLowerCase() || "";
    let activeIndex = steps.findIndex((s) => s.key === statusLower);
    if (["cancelled", "return requested", "return approved", "return rejected"].includes(statusLower)) {
      activeIndex = -2; // special status, timeline hidden
    }
    return { steps, activeIndex };
  };

  const { steps, activeIndex } = getOrderProgress(order?.order_status);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    const token = localStorage.getItem("token");
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/orders/${order_id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const orderRes = await axios.get(`${API_BASE_URL}/orders/${order_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrder(orderRes.data);
      alert("Order cancelled successfully.");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to cancel order.");
    } finally {
      setActionLoading(false);
    }
  };

  const openReturnModal = () => {
    setSelectedItems([]);
    setReturnAction("return");
    setReason("");
    setCustomReason("");
    setImages([]);
    setImagePreviews([]);
    setShowReturnModal(true);
  };

  const handleItemCheckbox = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const submitReturnRequest = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to return/replace.");
      return;
    }
    if (!reason) {
      alert("Please select a reason.");
      return;
    }
    if (reason === "Other" && !customReason.trim()) {
      alert("Please enter your reason.");
      return;
    }

    const token = localStorage.getItem("token");
    setSubmittingReturn(true);

    const formData = new FormData();
    formData.append("order_id", order_id);
    formData.append("action", returnAction);
    formData.append("reason", reason === "Other" ? customReason : reason);
    formData.append("selected_items", JSON.stringify(selectedItems));
    images.forEach((image) => {
      formData.append("images", image);
    });

    try {
      await axios.post(`${API_BASE_URL}/orders/${order_id}/return`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Return request submitted successfully. We will review it soon.");
      setShowReturnModal(false);
      const orderRes = await axios.get(`${API_BASE_URL}/orders/${order_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrder(orderRes.data);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to submit return request.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (loading) {
    return (
      <div className="order-loading">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-error">
        <FontAwesomeIcon icon={faExclamationCircle} size="2x" />
        <p>{error}</p>
        <Link to="/my-orders" className="btn-outline">
          Back to Orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + safeNumber(item.subtotal),
    0
  );

  const isCancellable = ["pending", "processing"].includes(
    order.order_status?.toLowerCase()
  );
  const isReturnable = order.order_status?.toLowerCase() === "delivered";

  return (
    <div className="order-page">
      {/* Return Reason Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Return / Replace Request</h3>
              <button className="modal-close" onClick={() => setShowReturnModal(false)}>
                <FontAwesomeIcon icon={faTimesCircle} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select items to return/replace:</label>
                {items.map(item => (
                  <div key={item.order_item_id} className="item-checkbox">
                    <input
                      type="checkbox"
                      id={`item-${item.order_item_id}`}
                      checked={selectedItems.includes(item.order_item_id)}
                      onChange={() => handleItemCheckbox(item.order_item_id)}
                    />
                    <div className="item-checkbox-content">
                      <div className="item-checkbox-image">
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} />
                        ) : (
                          <FontAwesomeIcon icon={faBoxOpen} />
                        )}
                      </div>
                      <label htmlFor={`item-${item.order_item_id}`}>
                        {item.product_name} <span>(₹{safeNumber(item.price).toFixed(2)} x {item.quantity})</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Action:</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="returnAction"
                      value="return"
                      checked={returnAction === "return"}
                      onChange={(e) => setReturnAction(e.target.value)}
                    /> Return for refund
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="returnAction"
                      value="replace"
                      checked={returnAction === "replace"}
                      onChange={(e) => setReturnAction(e.target.value)}
                    /> Replace with new item
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Reason:</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-control"
                >
                  <option value="">Select a reason</option>
                  {reasonOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {reason === "Other" && (
                <div className="form-group">
                  <label>Please specify:</label>
                  <textarea
                    rows="3"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter your reason here..."
                    className="form-control"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Upload images (optional, max 5):</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="form-control-file"
                />
                <div className="image-previews">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="preview-item">
                      <img src={preview} alt="preview" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="remove-image"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
                <small className="text-muted">You can upload up to 5 images.</small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={submitReturnRequest}
                disabled={submittingReturn}
              >
                {submittingReturn ? "Submitting..." : "Submit Request"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowReturnModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="order-header">
        <Link to="/my-orders" className="back-link">
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to Orders
        </Link>
        <h1>
          <FontAwesomeIcon icon={faReceipt} />
          Order #{order.order_id}
        </h1>
        <span className={`status-badge status-${order.order_status?.toLowerCase()}`}>
          {order.order_status || "Unknown"}
        </span>
      </div>

      {/* Timeline - hidden for cancelled and return statuses */}
      {!["cancelled", "return requested", "return approved", "return rejected"].includes(order.order_status?.toLowerCase()) && (
        <div className="tracking-timeline">
          {steps.map((step, index) => {
            const isActive = index <= activeIndex;
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            return (
              <div key={step.key} className="timeline-step">
                <div
                  className={`timeline-icon ${
                    isActive ? "active" : ""
                  } ${isCompleted ? "completed" : ""} ${
                    isCurrent ? "current" : ""
                  }`}
                >
                  <FontAwesomeIcon icon={step.icon} />
                </div>
                <div className="timeline-label">{step.label}</div>
                {index < steps.length - 1 && (
                  <div
                    className={`timeline-connector ${
                      index < activeIndex ? "completed" : ""
                    }`}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Status-specific messages */}
      {order.order_status?.toLowerCase() === "cancelled" && (
        <div className="cancelled-message">
          <FontAwesomeIcon icon={faTimesCircle} />
          <p>This order has been cancelled.</p>
        </div>
      )}

      {order.order_status?.toLowerCase() === "return requested" && (
        <div className="return-requested-message">
          <FontAwesomeIcon icon={faClock} />
          <p>Your return request has been submitted and is pending review.</p>
        </div>
      )}

      {order.order_status?.toLowerCase() === "return approved" && (
        <div className="return-approved-message">
          <FontAwesomeIcon icon={faCheckCircle} />
          <p>Your return request has been approved. Please proceed with returning the items.</p>
        </div>
      )}

      {order.order_status?.toLowerCase() === "return rejected" && (
        <div className="return-rejected-message">
          <FontAwesomeIcon icon={faTimesCircle} />
          <p>Your return request has been rejected. Please contact support for details.</p>
        </div>
      )}

      {/* Summary */}
      <div className="card">
        <h2>Order Summary</h2>
        <div className="summary-row">
          <span>Placed On</span>
          <strong>{formatDate(order.order_date)}</strong>
        </div>
        <div className="summary-row">
          <span>Payment</span>
          <strong>{order.payment_mode || "N/A"}</strong>
        </div>
        <div className="summary-row">
          <span>Delivery Fee</span>
          <strong>₹{safeNumber(order.delivery_fee).toFixed(2)}</strong>
        </div>
        <div className="summary-row">
          <span>Discount</span>
          <strong>- ₹{safeNumber(order.discount).toFixed(2)}</strong>
        </div>
        <div className="summary-row total">
          <span>Total Amount</span>
          <strong>₹{safeNumber(order.total_amount).toFixed(2)}</strong>
        </div>
      </div>

      {/* Address */}
      <div className="card">
        <h2>
          <FontAwesomeIcon icon={faMapMarkerAlt} />
          Shipping Address
        </h2>
        <p className="address">
          {order.delivery_address || "Address not available"}
        </p>
      </div>

      {/* Items */}
      <div className="card">
        <h2>Items Ordered</h2>
        {items.length === 0 ? (
          <p>No items found for this order.</p>
        ) : (
          items.map((item) => (
            <div key={item.order_item_id} className="item">
              <div className="item-image">
                {item.product_image ? (
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <FontAwesomeIcon icon={faBoxOpen} />
                )}
              </div>
              <div className="item-info">
                <h4>{item.product_name}</h4>
                <div className="item-meta">
                  <span>₹{safeNumber(item.price).toFixed(2)}</span>
                  <span>x {item.quantity}</span>
                </div>
              </div>
            </div>
          ))
        )}
        <div className="subtotal">
          <span>Subtotal</span>
          <strong>₹{subtotal.toFixed(2)}</strong>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="order-actions">
        {isCancellable && (
          <button
            className="btn-cancel"
            onClick={handleCancel}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faBan} />
            )}
            Cancel Order
          </button>
        )}

        {isReturnable && (
          <button
            className="btn-return"
            onClick={openReturnModal}
            disabled={actionLoading}
          >
            <FontAwesomeIcon icon={faUndoAlt} />
            Return / Replace
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;