import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import './LoyaltyOffers.css';

const LoyaltyOffers = () => {
  const navigate = useNavigate();
  const { applyCoupon, cartItems } = useContext(CartContext);
  
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [copiedCode, setCopiedCode] = useState('');
  const [applyingOffer, setApplyingOffer] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // active, expired, all

  // Fetch offers from the offers table
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/loyalty/offers');
        
        // Format all offers
        const formattedOffers = response.data.map((offer, index) => {
          // Format discount display
          let discountDisplay = '';
          if (offer.offer_type === 'percentage') {
            discountDisplay = `${offer.discount_value}% OFF`;
          } else if (offer.offer_type === 'fixed') {
            discountDisplay = `₹${offer.discount_value} OFF`;
          } else {
            discountDisplay = offer.discount_value;
          }

          // Format validity text
          let validUntilText = 'Limited Time';
          let isExpired = false;
          
          if (offer.valid_until) {
            const expiryDate = new Date(offer.valid_until);
            const today = new Date();
            const diffTime = expiryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
              isExpired = true;
              validUntilText = 'Expired';
            } else if (diffDays === 0) {
              validUntilText = 'Ends Today';
            } else if (diffDays === 1) {
              validUntilText = 'Tomorrow Only';
            } else if (diffDays <= 7) {
              validUntilText = `${diffDays} days left`;
            } else {
              validUntilText = `Until ${expiryDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
              })}`;
            }
          }

          // Add min purchase info if exists
          if (offer.min_purchase && offer.min_purchase !== '$0' && offer.min_purchase !== '0' && !isExpired) {
            validUntilText = `Min. ${offer.min_purchase} • ${validUntilText}`;
          }

          // Select icon based on offer type or name
          const icons = ['🎉', '🔥', '🎁', '💰', '🚚', '⭐', '💎', '🏷️', '🥳', '✨'];
          const iconIndex = (offer.offer_name.length + index) % icons.length;
          
          // Select color based on offer type
          const colors = {
            percentage: '#FF6B35',
            fixed: '#2ED573',
            bogo: '#9B5DE5',
            default: '#118AB2'
          };
          
          let offerColor = colors.default;
          if (offer.offer_type === 'percentage') offerColor = colors.percentage;
          else if (offer.offer_type === 'fixed') offerColor = colors.fixed;
          else if (offer.offer_name.toLowerCase().includes('bogo')) offerColor = colors.bogo;

          return {
            id: offer.offer_code,
            code: offer.offer_code,
            name: offer.offer_name,
            discount: discountDisplay,
            type: offer.offer_type,
            discountValue: offer.discount_value,
            minPurchase: offer.min_purchase,
            validUntil: offer.valid_until,
            validUntilText: validUntilText,
            icon: icons[iconIndex],
            color: offerColor,
            bgColor: `${offerColor}10`,
            totalOffers: offer.total_offers,
            redeemed: offer.redeemed || 0,
            status: isExpired ? 'expired' : offer.status,
            isExpired: isExpired
          };
        });

        setOffers(formattedOffers);
      } catch (error) {
        console.error('Error fetching offers:', error);
        showToastMessage('Failed to load offers', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, []);

  // Show toast message
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Handle apply offer to cart
  const handleApplyOffer = (offer) => {
    setApplyingOffer(offer.code);
    
    // Apply the coupon
    const success = applyCoupon(offer.code);
    console.log('Apply coupon result:', success);
    
    if (success) {
      showToastMessage(`✨ ${offer.name} applied! You saved ${offer.discount}`, 'success');
      
      // Navigate to cart after showing message
      setTimeout(() => {
        setApplyingOffer(null);
        navigate('/cart');
      }, 1500);
    } else {
      showToastMessage(`Could not apply offer "${offer.code}"`, 'error');
      setApplyingOffer(null);
    }
  };

  // Copy offer code to clipboard
  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToastMessage('Code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // Calculate remaining offers
  const getRemainingOffers = (offer) => {
    if (!offer.totalOffers) return null;
    const remaining = offer.totalOffers - offer.redeemed;
    return remaining;
  };

  // Filter offers based on active tab
  const getFilteredOffers = () => {
    if (activeTab === 'active') {
      return offers.filter(offer => offer.status === 'active' && !offer.isExpired);
    } else if (activeTab === 'expired') {
      return offers.filter(offer => offer.status === 'expired' || offer.isExpired);
    } else {
      return offers;
    }
  };

  const filteredOffers = getFilteredOffers();
  const activeCount = offers.filter(o => o.status === 'active' && !o.isExpired).length;
  const expiredCount = offers.filter(o => o.status === 'expired' || o.isExpired).length;

  return (
    <div className="loyalty-offers-page">
      {/* Toast Notification */}
      {showToast && (
        <div className={`toast-notification ${toastType}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toastType === 'success' ? '✓' : '⚠'}
            </span>
            <span className="toast-message">{toastMessage}</span>
          </div>
          <div className="toast-progress"></div>
        </div>
      )}

      {/* Hero Section */}
      <section className="offers-hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <span className="hero-badge">🎁 Exclusive Deals</span>
              <h1 className="hero-title">Loyalty Rewards & Special Offers</h1>
              <p className="hero-subtitle">
                Unlock exclusive discounts and earn points with every purchase
              </p>
              {cartItems.length > 0 && (
                <button 
                  className="hero-cart-btn"
                  onClick={() => navigate('/cart')}
                >
                  View Cart ({cartItems.length} items) →
                </button>
              )}
            </div>
            {/* Hero stats section removed as requested */}
          </div>
        </div>
        <div className="hero-pattern"></div>
      </section>

      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">›</span>
          <Link to="/cart" className="breadcrumb-link">Cart</Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">Offers & Coupons</span>
        </div>

        {/* Main Content */}
        <section className="offers-main">
          {/* Header with Tabs */}
          <div className="offers-header">
            <div className="header-left">
              <h2 className="offers-title">Available Offers</h2>
              <p className="offers-subtitle">Apply these codes at checkout to save money</p>
            </div>
            <div className="offers-tabs">
              <button 
                className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Active ({activeCount})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'expired' ? 'active' : ''}`}
                onClick={() => setActiveTab('expired')}
              >
                Expired ({expiredCount})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({offers.length})
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading amazing offers for you...</p>
            </div>
          )}

          {/* No Offers State */}
          {!loading && filteredOffers.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">🎁</span>
              <h3>No Offers Available</h3>
              <p>Check back soon for new exciting deals and discounts!</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/products')}
              >
                Browse Products
              </button>
            </div>
          )}

          {/* Offers Grid */}
          {!loading && filteredOffers.length > 0 && (
            <div className="offers-grid">
              {filteredOffers.map((offer) => (
                <div 
                  key={offer.id} 
                  className={`offer-card ${offer.status === 'expired' || offer.isExpired ? 'expired' : ''} ${applyingOffer === offer.code ? 'applying' : ''}`}
                  style={{ '--offer-color': offer.color }}
                >
                  {/* Offer Header */}
                  <div className="offer-header">
                    <div className="offer-icon-wrapper" style={{ backgroundColor: offer.bgColor }}>
                      <span className="offer-icon">{offer.icon}</span>
                    </div>
                    <div className="offer-badges">
                      {!offer.isExpired && offer.status === 'active' && (
                        <span className="badge active-badge">ACTIVE</span>
                      )}
                      {(offer.status === 'expired' || offer.isExpired) && (
                        <span className="badge expired-badge">EXPIRED</span>
                      )}
                      {getRemainingOffers(offer) !== null && getRemainingOffers(offer) <= 10 && offer.status === 'active' && !offer.isExpired && (
                        <span className="badge limited-badge">
                          Only {getRemainingOffers(offer)} left!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Offer Content */}
                  <div className="offer-content">
                    <h3 className="offer-name">{offer.name}</h3>
                    <div className="offer-discount">{offer.discount}</div>
                    
                    {offer.minPurchase && offer.minPurchase !== '$0' && offer.minPurchase !== '0' && (
                      <div className="offer-min-purchase">
                        🛒 Min. purchase: {offer.minPurchase}
                      </div>
                    )}

                    <div className="offer-validity">
                      <span className="validity-icon">⏰</span>
                      <span className="validity-text">{offer.validUntilText}</span>
                    </div>

                    {/* Offer Code */}
                    <div className="offer-code-section">
                      <div className="code-label">Use code:</div>
                      <div className="code-wrapper">
                        <span className="offer-code">{offer.code}</span>
                        <button
                          className="copy-btn"
                          onClick={(e) => handleCopyCode(offer.code, e)}
                          disabled={offer.status === 'expired' || offer.isExpired || applyingOffer === offer.code}
                          title="Copy code"
                        >
                          {copiedCode === offer.code ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Offer Actions */}
                  <div className="offer-actions">
                    {(offer.status === 'expired' || offer.isExpired) ? (
                      <button className="expired-btn" disabled>
                        Expired
                      </button>
                    ) : (
                      <button
                        className="apply-btn"
                        onClick={() => handleApplyOffer(offer)}
                        disabled={applyingOffer === offer.code}
                      >
                        {applyingOffer === offer.code ? (
                          <>
                            <span className="btn-spinner"></span>
                            Applying...
                          </>
                        ) : (
                          'Apply Offer'
                        )}
                      </button>
                    )}
                  </div>

                  {/* Progress Bar for Limited Offers */}
                  {offer.totalOffers && offer.status === 'active' && !offer.isExpired && (
                    <div className="offer-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${(offer.redeemed / offer.totalOffers) * 100}%`,
                            backgroundColor: offer.color
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {offer.redeemed}/{offer.totalOffers} claimed
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How It Works Section */}
        <section className="how-it-works">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Three simple steps to save money</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Copy Code</h3>
              <p>Click the copy button to save the offer code to your clipboard</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Add to Cart</h3>
              <p>Shop for your favorite products and add them to your cart</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Apply at Checkout</h3>
              <p>Paste the code in the coupon section and enjoy your savings</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-container">
            <h2 className="cta-title">Ready to Start Saving?</h2>
            <p className="cta-text">
              Browse our products and apply these offers at checkout for instant savings
            </p>
            <div className="cta-buttons">
              <button 
                className="btn btn-primary btn-large"
                onClick={() => navigate('/products')}
              >
                Shop Now
              </button>
              {cartItems.length > 0 && (
                <button 
                  className="btn btn-outline btn-large"
                  onClick={() => navigate('/cart')}
                >
                  Go to Cart ({cartItems.length})
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoyaltyOffers;