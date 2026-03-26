// pages/Checkout.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import axios from 'axios';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { 
    cartItems, 
    getCartTotal, 
    couponDiscount, 
    clearCart,
    pointsRedeemed,
    pointsDiscount 
  } = useContext(CartContext);

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const addressFormRef = useRef(null);

  const subtotal = getCartTotal();
  const deliveryFee = subtotal > 499 ? 0 : 40;
  const totalDiscount = couponDiscount + pointsDiscount;
  const finalTotal = subtotal + deliveryFee - totalDiscount;

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      try {
        setCustomer(JSON.parse(storedCustomer));
      } catch (e) {
        console.error('Failed to parse customer data', e);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate, loading]);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setNewAddress((prev) => ({ ...prev, [name]: value }));
    if (addressErrors[name]) {
      setAddressErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const validateAddress = () => {
    const errors = {};
    const requiredFields = ['street', 'city', 'state', 'zip'];
    requiredFields.forEach((field) => {
      if (!newAddress[field].trim()) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });
    if (newAddress.zip && !/^\d{6}$/.test(newAddress.zip)) {
      errors.zip = 'Pincode must be 6 digits';
    }
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangeLocation = () => {
    if (!useDifferentAddress) {
      setUseDifferentAddress(true);
      setTimeout(() => {
        addressFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      addressFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Prepare final payload (with points redemption)
  const getOrderPayload = () => {
    const shipping_address = useDifferentAddress
      ? `${newAddress.street}, ${newAddress.city}, ${newAddress.state} - ${newAddress.zip}`
      : customer.address || '';

    return {
      user_id: customer.customer_id,
      payment_mode: paymentMethod,
      order_status: 'pending',
      total_amount: finalTotal,
      delivery_fee: deliveryFee,
      discount: couponDiscount,
      points_redeemed: pointsRedeemed,
      points_discount: pointsDiscount,
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity
      })),
      shipping_address: shipping_address,
    };
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!customer) {
      alert('You must be logged in to place an order.');
      navigate('/login');
      return;
    }

    if (useDifferentAddress && !validateAddress()) {
      return;
    }

    setIsPlacingOrder(true);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    const payload = getOrderPayload();

    if (paymentMethod === 'cod') {
      try {
        const response = await axios.post(
          'http://localhost:8000/api/orders',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        clearCart();
        navigate(`/order-success/${response.data.order_id}`);
      } catch (error) {
        console.error('❌ COD order error:', error);
        if (error.response) {
          if (error.response.status === 403) {
            alert('Your session has expired. Please log in again.');
            localStorage.removeItem('token');
            localStorage.removeItem('customer');
            navigate('/login');
            return;
          }
          if (error.response.data.error === 'Insufficient reward points') {
            alert('You do not have enough reward points for this redemption.');
          } else {
            alert('Failed to place order. Please try again.');
          }
        } else {
          alert('Failed to place order. Please try again.');
        }
      } finally {
        setIsPlacingOrder(false);
      }
    } else if (paymentMethod === 'razorpay') {
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          alert('Failed to load payment gateway. Please try again.');
          setIsPlacingOrder(false);
          return;
        }

        const orderResponse = await axios.post(
          'http://localhost:8000/api/create-razorpay-order',
          {
            amount: finalTotal * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { id: razorpayOrderId, amount, currency } = orderResponse.data;

        const options = {
          key: 'rzp_test_SJrzOIAKUajcX4',
          amount: amount,
          currency: currency,
          name: 'FreshBasket',
          description: 'Order Payment',
          order_id: razorpayOrderId,
          handler: async (response) => {
            try {
              const verificationResponse = await axios.post(
                'http://localhost:8000/api/verify-razorpay-payment',
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderPayload: payload,
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              clearCart();
              navigate(`/order-success/${verificationResponse.data.order_id}`);
            } catch (verifyError) {
              console.error('Payment verification failed:', verifyError);
              if (verifyError.response?.data?.error === 'Insufficient reward points') {
                alert('You do not have enough reward points for this redemption.');
              } else {
                alert('Payment verification failed. Please contact support.');
              }
              setIsPlacingOrder(false);
            }
          },
          prefill: {
            name: customer.name,
            email: customer.email,
            contact: customer.phone_no,
          },
          theme: {
            color: '#4CAF50',
          },
          modal: {
            ondismiss: () => {
              setIsPlacingOrder(false);
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (error) {
        console.error('Razorpay error:', error);
        alert('Failed to initiate payment. Please try again.');
        setIsPlacingOrder(false);
      }
    }
  };

  if (loading) {
    return <div className="checkout-container">Loading your information...</div>;
  }

  if (!customer) {
    return (
      <div className="checkout-container">
        <p>Please log in to proceed with checkout.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <header className="checkout-header">
        <h1 className="checkout-title">FreshBasket</h1>
        <p className="checkout-tagline">Fresh Groceries Delivered</p>
      </header>

      <div className="delivery-bar">
        <span className="delivery-label">📦 DELIVER TO</span>
        <span className="delivery-location">
          {useDifferentAddress
            ? 'New Address (to be filled)'
            : customer.address
            ? customer.address.split(',')[0]
            : 'No default address on file'}
        </span>
        <button className="change-link" onClick={handleChangeLocation}>
          Change
        </button>
      </div>

      <div className="checkout-grid">
        <div className="checkout-main">
          <section className="checkout-section">
            <h2 className="section-title">1. Customer Information</h2>
            <div className="customer-card">
              <p><strong>Name:</strong> {customer.name}</p>
              <p><strong>Email:</strong> {customer.email}</p>
              <p><strong>Phone:</strong> {customer.phone_no}</p>
            </div>
          </section>

          <section className="checkout-section">
            <h2 className="section-title">2. Delivery Address</h2>
            <div className="address-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={useDifferentAddress}
                  onChange={(e) => setUseDifferentAddress(e.target.checked)}
                />
                <span>Use a different delivery address</span>
              </label>
            </div>

            {!useDifferentAddress ? (
              <div className="address-card">
                {customer.address ? (
                  <p>{customer.address}</p>
                ) : (
                  <p>No default address available. Please use the "Change" link to add a new address.</p>
                )}
              </div>
            ) : (
              <form className="address-form" ref={addressFormRef}>
                <div className="form-group">
                  <label htmlFor="street">Street Address *</label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={newAddress.street}
                    onChange={handleAddressChange}
                    className={addressErrors.street ? 'error' : ''}
                  />
                  {addressErrors.street && <span className="error-message">{addressErrors.street}</span>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City *</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={newAddress.city}
                      onChange={handleAddressChange}
                      className={addressErrors.city ? 'error' : ''}
                    />
                    {addressErrors.city && <span className="error-message">{addressErrors.city}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State *</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={newAddress.state}
                      onChange={handleAddressChange}
                      className={addressErrors.state ? 'error' : ''}
                    />
                    {addressErrors.state && <span className="error-message">{addressErrors.state}</span>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="zip">Pincode *</label>
                    <input
                      type="text"
                      id="zip"
                      name="zip"
                      value={newAddress.zip}
                      onChange={handleAddressChange}
                      className={addressErrors.zip ? 'error' : ''}
                    />
                    {addressErrors.zip && <span className="error-message">{addressErrors.zip}</span>}
                  </div>
                </div>
              </form>
            )}
          </section>

          <section className="checkout-section">
            <h2 className="section-title">3. Payment Method</h2>
            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Cash on Delivery</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Online (Cards / UPI / Net Banking)</span>
              </label>
            </div>
          </section>
        </div>

        <aside className="checkout-sidebar">
          <section className="summary-section">
            <h2 className="section-title">Order Summary</h2>
            <div className="summary-items">
              {cartItems.map((item) => (
                <div key={item.id} className="summary-item">
                  <span className="item-name">
                    {item.name} <span className="item-qty">x{item.quantity}</span>
                  </span>
                  <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {deliveryFee > 0 && (
                <div className="summary-item">
                  <span className="item-name">Delivery Fee</span>
                  <span className="item-price">₹{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="summary-item discount">
                  <span className="item-name">Coupon Discount</span>
                  <span className="item-price">-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="summary-item discount">
                  <span className="item-name">Points Discount ({pointsRedeemed} pts)</span>
                  <span className="item-price">-₹{pointsDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span className={deliveryFee === 0 ? 'free' : ''}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
              </span>
            </div>
            {couponDiscount > 0 && (
              <div className="summary-row discount">
                <span>Coupon Discount</span>
                <span>-₹{couponDiscount.toFixed(2)}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="summary-row discount">
                <span>Points Discount</span>
                <span>-₹{pointsDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-total">
              <span>Total</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>

            <button
              className={`place-order-btn ${isPlacingOrder ? 'loading' : ''}`}
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </button>
            <p className="secure-checkout">🔒 Secure Checkout</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;