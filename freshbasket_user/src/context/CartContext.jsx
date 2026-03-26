// context/CartContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);        // NEW: points being redeemed
  const [pointsDiscount, setPointsDiscount] = useState(0);        // NEW: discount from points
  const [isInitialized, setIsInitialized] = useState(false);
  const [validOffers, setValidOffers] = useState({}); // Store offers from database

  // Load cart and coupon from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('freshBasketCart');
    const savedCoupon = localStorage.getItem('freshBasketCoupon');
    const savedPoints = localStorage.getItem('freshBasketPoints'); // NEW: load saved points redemption

    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing cart:', error);
        setCartItems([]);
      }
    }
    if (savedCoupon) {
      try {
        const { code, discount } = JSON.parse(savedCoupon);
        setCouponCode(code);
        setCouponDiscount(discount);
      } catch (error) {
        console.error('Error parsing coupon:', error);
      }
    }
    if (savedPoints) {
      try {
        const { points, discount } = JSON.parse(savedPoints);
        setPointsRedeemed(points);
        setPointsDiscount(discount);
      } catch (error) {
        console.error('Error parsing points:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Fetch valid offers from database
  useEffect(() => {
    fetchValidOffers();
  }, []);

  const fetchValidOffers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/loyalty/offers');
      const activeOffers = response.data.filter(offer => offer.status === 'active');
      
      // Convert offers to a lookup object
      const offersMap = {};
      activeOffers.forEach(offer => {
        offersMap[offer.offer_code.toUpperCase()] = {
          type: offer.offer_type,
          value: offer.discount_value,
          name: offer.offer_name,
          minPurchase: offer.min_purchase,
          validUntil: offer.valid_until
        };
      });
      
      setValidOffers(offersMap);
      console.log('Loaded offers from database:', offersMap);
    } catch (error) {
      console.error('Error fetching offers:', error);
      // Fallback to hardcoded coupons if API fails
      setValidOffers({
        'FRESH10': { type: 'fixed', value: 10, name: 'Fresh10' },
        'WELCOME20': { type: 'fixed', value: 20, name: 'Welcome20' },
        'SAVE30': { type: 'fixed', value: 30, name: 'Save30' },
      });
    }
  };

  // Save to localStorage whenever relevant state changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('freshBasketCart', JSON.stringify(cartItems));
      localStorage.setItem('freshBasketCoupon', JSON.stringify({ code: couponCode, discount: couponDiscount }));
      localStorage.setItem('freshBasketPoints', JSON.stringify({ points: pointsRedeemed, discount: pointsDiscount }));
    }
  }, [cartItems, couponCode, couponDiscount, pointsRedeemed, pointsDiscount, isInitialized]);

  const addToCart = useCallback((item) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    showCartNotification(item);
  }, []);

  const updateQuantity = useCallback((itemId, newQuantity) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(1, Math.min(99, newQuantity)) } : item
      )
    );
  }, []);

  const removeItem = useCallback((itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCouponCode('');
    setCouponDiscount(0);
    setPointsRedeemed(0);   // NEW: clear points when cart is cleared
    setPointsDiscount(0);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const getItemCount = useCallback(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  // Apply coupon
  const applyCoupon = useCallback((code) => {
    const upperCode = code.toUpperCase().trim();
    console.log('Attempting to apply coupon:', upperCode);
    console.log('Valid offers:', validOffers);
    
    if (validOffers[upperCode]) {
      const offer = validOffers[upperCode];
      
      // Check expiration
      if (offer.validUntil) {
        const expiryDate = new Date(offer.validUntil);
        const today = new Date();
        if (expiryDate < today) {
          console.log('Offer has expired');
          return false;
        }
      }
      
      // Check minimum purchase
      if (offer.minPurchase && offer.minPurchase !== '$0' && offer.minPurchase !== '0') {
        const minPurchase = parseFloat(offer.minPurchase.replace('$', ''));
        const subtotal = getCartTotal();
        
        if (subtotal < minPurchase) {
          alert(`This offer requires minimum purchase of ${offer.minPurchase}`);
          return false;
        }
      }
      
      // Calculate discount
      let discountAmount = 0;
      const subtotal = getCartTotal();
      
      if (offer.type === 'percentage') {
        discountAmount = (subtotal * parseFloat(offer.value)) / 100;
      } else {
        discountAmount = parseFloat(offer.value);
      }
      
      setCouponCode(upperCode);
      setCouponDiscount(discountAmount);
      console.log('Coupon applied successfully. Discount:', discountAmount);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'coupon-notification';
      notification.innerHTML = `
        <div class="notification-content success">
          <span class="notification-icon">✓</span>
          <div class="notification-text">
            <strong>Offer Applied!</strong>
            <span>${offer.name} - ₹${discountAmount.toFixed(2)} off</span>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.classList.add('show'), 10);
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 3000);
      
      return true;
    }
    
    console.log('Coupon not found in valid offers');
    return false;
  }, [validOffers, getCartTotal]);

  const removeCoupon = useCallback(() => {
    setCouponCode('');
    setCouponDiscount(0);
  }, []);

  // NEW: Apply points redemption
  const applyPoints = useCallback((points, discount) => {
    setPointsRedeemed(points);
    setPointsDiscount(discount);
  }, []);

  // NEW: Remove points redemption
  const removePoints = useCallback(() => {
    setPointsRedeemed(0);
    setPointsDiscount(0);
  }, []);

  const showCartNotification = (item) => {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">✓</span>
        <div class="notification-text">
          <strong>Added to Cart!</strong>
          <span>${item.quantity || 1} × ${item.name}</span>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        getCartTotal,
        getItemCount,
        couponCode,
        couponDiscount,
        applyCoupon,
        removeCoupon,
        pointsRedeemed,        // NEW
        pointsDiscount,        // NEW
        applyPoints,           // NEW
        removePoints,          // NEW
      }}
    >
      {children}
    </CartContext.Provider>
  );
};