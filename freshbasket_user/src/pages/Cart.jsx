import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import axios from 'axios';
import './Cart.css';

const Cart = () => {
  const {
    cartItems,
    updateQuantity,
    removeItem,
    clearCart,
    getCartTotal,
    getItemCount,
    couponCode,
    couponDiscount,
    applyCoupon,
    removeCoupon,
    pointsRedeemed,
    pointsDiscount,
    applyPoints,        // ✅ Use the correct function names from context
    removePoints,
  } = useContext(CartContext);
  
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [offersCount, setOffersCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Points redemption state
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointsInput, setPointsInput] = useState('');
  const [pointsError, setPointsError] = useState('');

  // Fetch offers count and customer points
  useEffect(() => {
    fetchOffersCount();
    fetchCustomerPoints();
  }, []);

  const fetchCustomerPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get('http://localhost:8000/api/customers/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailablePoints(response.data.reward_points || 0);
    } catch (error) {
      console.error('Error fetching points:', error);
    }
  };

  const fetchOffersCount = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/loyalty/offers');
      const activeOffers = response.data.filter(offer => offer.status === 'active');
      setOffersCount(activeOffers.length);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setOffersCount(0);
    }
  };

  // Apply points
  const handleApplyPoints = () => {
    const points = parseInt(pointsInput, 10);
    if (isNaN(points) || points <= 0) {
      setPointsError('Please enter a valid number');
      return;
    }
    if (points > availablePoints) {
      setPointsError(`You only have ${availablePoints} points available`);
      return;
    }
    const discount = points / 10; // 10 points = ₹1
    // Prevent discount from exceeding subtotal
    const subtotal = getCartTotal();
    if (discount > subtotal) {
      setPointsError(`Discount cannot exceed subtotal (₹${subtotal.toFixed(2)})`);
      return;
    }
    applyPoints(points, discount);   // ✅ Use context function
    setPointsError('');
    setPointsInput('');
    showToast(`${points} points applied! You saved ₹${discount.toFixed(2)}`);
  };

  const handleRemovePoints = () => {
    removePoints();                  // ✅ Use context function
    setPointsInput('');
    showToast('Points redemption removed');
  };

  // Update coupon input when couponCode changes
  useEffect(() => {
    if (couponCode) {
      setCouponInput(couponCode);
      showToast(`Coupon ${couponCode} applied! You saved ₹${couponDiscount.toFixed(2)}`);
    } else {
      setCouponInput('');
    }
  }, [couponCode, couponDiscount]);

  const showToast = (message) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Calculate totals
  const subtotal = getCartTotal();
  const deliveryFee = subtotal > 499 ? 0 : 40;
  const totalDiscount = couponDiscount + pointsDiscount;
  const total = subtotal + deliveryFee - totalDiscount;
  const savings = subtotal - total + (deliveryFee === 0 ? 40 : 0);

  // Handle quantity change
  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      updateQuantity(itemId, newQuantity);
    }
  };

  // Handle remove item
  const handleRemoveItem = (itemId, itemName) => {
    if (window.confirm(`Remove ${itemName} from your cart?`)) {
      removeItem(itemId);
      showToast(`${itemName} removed from cart`);
    }
  };

  // Apply coupon
  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      alert('Please enter a coupon code');
      return;
    }
    const success = applyCoupon(couponInput);
    if (!success) {
      alert('Invalid coupon code. Please try again.');
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      navigate('/checkout');
      setIsCheckingOut(false);
    }, 500);
  };

  // Handle continue shopping
  const handleContinueShopping = () => {
    navigate('/products');
  };

  // Handle view offers
  const handleViewOffers = () => {
    navigate('/loyalty-offers');
  };

  // Get savings percentage
  const getSavingsPercentage = () => {
    if (subtotal === 0) return 0;
    return ((savings / subtotal) * 100).toFixed(1);
  };

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Shopping Cart</span>
          </div>

          <div className="empty-cart">
            <div className="empty-cart-content">
              <div className="empty-cart-animation">
                <span className="empty-cart-icon">🛒</span>
                <div className="empty-cart-circle"></div>
              </div>
              <h2>Your cart is feeling lonely</h2>
              <p>Looks like you haven't added any items to your cart yet.</p>
              <button className="btn btn-primary btn-large" onClick={handleContinueShopping}>
                Start Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="success-toast">
          <div className="toast-content">
            <span className="toast-icon">✓</span>
            <span className="toast-message">{toastMessage}</span>
          </div>
          <div className="toast-progress"></div>
        </div>
      )}

      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">Shopping Cart</span>
        </div>

        {/* Cart Header */}
        <div className="cart-header">
          <div className="header-left">
            <h1 className="cart-title">Shopping Cart</h1>
            <span className="cart-subtitle">{getItemCount()} {getItemCount() === 1 ? 'item' : 'items'}</span>
          </div>
          <button className="clear-cart-btn" onClick={clearCart}>
            <span className="clear-icon">🗑️</span> Clear Cart
          </button>
        </div>

        {/* Main Cart Layout */}
        <div className="cart-layout">
          {/* Cart Items Section */}
          <div className="cart-items-section">
            <div className="items-card">
              <div className="items-header">
                <h2>Your Items</h2>
                <span className="items-count">{getItemCount()} items</span>
              </div>

              <div className="cart-items-list">
                {cartItems.map((item) => {
                  const itemTotal = item.price * item.quantity;
                  const savedAmount = item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0;
                  
                  return (
                    <div key={item.id} className="cart-item">
                      <div className="item-image-wrapper">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="item-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML += '<span class="item-fallback-icon">🛒</span>';
                            }}
                          />
                        ) : (
                          <span className="item-fallback-icon">🛒</span>
                        )}
                      </div>

                      <div className="item-details">
                        <div className="item-header">
                          <div>
                            <h3 className="item-name">{item.name}</h3>
                            <span className="item-category">{item.category || 'Fresh Grocery'}</span>
                          </div>
                          <button 
                            className="item-remove-btn"
                            onClick={() => handleRemoveItem(item.id, item.name)}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="item-price-info">
                          <div className="current-price">₹{item.price.toFixed(2)}</div>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <div className="original-price">₹{item.originalPrice.toFixed(2)}</div>
                          )}
                          <div className="item-unit">/{item.unit || 'piece'}</div>
                        </div>

                        {savedAmount > 0 && (
                          <div className="item-savings">You save ₹{savedAmount.toFixed(2)}</div>
                        )}

                        <div className="item-actions">
                          <div className="quantity-selector">
                            <button 
                              className="quantity-btn minus"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              −
                            </button>
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                              min="1"
                              max="99"
                              className="quantity-input"
                            />
                            <button 
                              className="quantity-btn plus"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={item.quantity >= 99}
                            >
                              +
                            </button>
                          </div>
                          <div className="item-total">
                            <span className="total-label">Total:</span>
                            <span className="total-value">₹{itemTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="continue-shopping">
                <button className="continue-btn" onClick={handleContinueShopping}>
                  <span className="continue-icon">←</span>
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="order-summary-section">
            <div className="summary-card">
              <h2 className="summary-title">Order Summary</h2>

              {/* Price Breakdown */}
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="price-row">
                  <span>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="free-delivery">FREE</span>
                  ) : (
                    <span>₹{deliveryFee.toFixed(2)}</span>
                  )}
                </div>
                {couponDiscount > 0 && (
                  <div className="price-row discount">
                    <span>
                      Coupon Discount
                      <span className="coupon-badge">{couponCode}</span>
                    </span>
                    <span>-₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="price-row discount">
                    <span>
                      Points Discount
                      <span className="coupon-badge">{pointsRedeemed} pts</span>
                    </span>
                    <span>-₹{pointsDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="price-divider"></div>
                <div className="price-row total">
                  <span>Total</span>
                  <span className="total-amount">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Savings Summary */}
              {savings > 0 && (
                <div className="savings-banner">
                  <span className="savings-icon">💰</span>
                  <div className="savings-text">
                    <strong>You save ₹{savings.toFixed(2)}</strong>
                    <span>({getSavingsPercentage()}% off)</span>
                  </div>
                </div>
              )}

              {/* Reward Points Redemption */}
              <div className="points-section">
                <div className="points-header">
                  <span className="points-icon">⭐</span>
                  <span className="points-label">Your Points: {availablePoints}</span>
                </div>

                {!pointsRedeemed ? (
                  <div className="points-input-container">
                    <div className="points-input-group">
                      <input
                        type="number"
                        placeholder="Enter points to redeem"
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value)}
                        className="points-input"
                        min="1"
                        max={availablePoints}
                        disabled={subtotal === 0}
                      />
                      <button 
                        className="apply-points-btn"
                        onClick={handleApplyPoints}
                        disabled={!pointsInput || subtotal === 0}
                      >
                        Apply
                      </button>
                    </div>
                    {pointsError && <span className="error-message">{pointsError}</span>}
                    <small className="points-note">10 points = ₹1 discount</small>
                  </div>
                ) : (
                  <div className="points-applied">
                    <div className="applied-points-box">
                      <span className="applied-points-icon">✓</span>
                      <div className="applied-points-info">
                        <span className="applied-points-code">{pointsRedeemed} points applied</span>
                        <span className="applied-points-savings">-₹{pointsDiscount.toFixed(2)}</span>
                      </div>
                      <button className="remove-points-btn" onClick={handleRemovePoints}>Remove</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Coupon Section */}
              <div className="coupon-section">
                <div className="coupon-header">
                  <div className="coupon-title">
                    <span className="coupon-icon">🏷️</span>
                    <span>Have a coupon?</span>
                  </div>
                  <button className="view-offers-link" onClick={handleViewOffers}>
                    🔥 {offersCount} Offers
                  </button>
                </div>

                {couponCode ? (
                  <div className="coupon-applied-row">
                    <div className="coupon-applied-message">
                      <span className="message-icon">✓</span>
                      <span className="message-text">
                        Coupon <strong>{couponCode}</strong> applied
                      </span>
                      <span className="message-amount">-₹{couponDiscount.toFixed(2)}</span>
                    </div>
                    <button className="remove-coupon-btn" onClick={removeCoupon}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="coupon-row">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="coupon-input"
                    />
                    <button className="apply-coupon-btn" onClick={handleApplyCoupon}>
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <button 
                className={`checkout-btn ${isCheckingOut ? 'loading' : ''}`}
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <span className="btn-spinner"></span>
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>

              {/* Security Badges */}
              <div className="security-badges">
                <div className="security-badge">
                  <span className="badge-icon">🔒</span>
                  <span>SSL Secure</span>
                </div>
                <div className="security-badge">
                  <span className="badge-icon">🛡️</span>
                  <span>100% Safe</span>
                </div>
                <div className="security-badge">
                  <span className="badge-icon">✓</span>
                  <span>Trusted</span>
                </div>
              </div>
            </div>

            {/* Delivery Info Card */}
            <div className="delivery-card">
              <h3>Delivery Information</h3>
              <div className="delivery-info-list">
                <div className="delivery-info-item">
                  <span className="info-icon">🚚</span>
                  <div className="info-content">
                    <strong>Free Delivery</strong>
                    <p>On orders above ₹499</p>
                  </div>
                </div>
                <div className="delivery-info-item">
                  <span className="info-icon">⏱️</span>
                  <div className="info-content">
                    <strong>Delivery within 30 mins</strong>
                    <p>In selected areas</p>
                  </div>
                </div>
                <div className="delivery-info-item">
                  <span className="info-icon">🔄</span>
                  <div className="info-content">
                    <strong>2-Hour Returns</strong>
                    <p>No questions asked</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;