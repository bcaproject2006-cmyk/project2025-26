// pages/Home.jsx - Final (clean, matches product page style, with scroll targets)
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import './Home.css';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timer, setTimer] = useState(30 * 60);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useContext(CartContext);
  const [todayOrders, setTodayOrders] = useState(null);

  // Handle scroll from footer links
  useEffect(() => {
    if (location.state?.scrollTo) {
      const element = document.getElementById(location.state.scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Clear the state to prevent repeated scrolling
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, navigate]);

  const fallbackSlides = [
    {
      title: 'Fresh Groceries Delivered',
      subtitle: 'In 30 Minutes or Less',
      description: 'Get farm-fresh produce delivered straight to your doorstep. Quality guaranteed.',
      bgColor: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
      image: '🛒',
      cta: 'Shop Now',
      link: '/products'
    },
    {
      title: 'Summer Sale!',
      subtitle: 'Up to 50% OFF',
      description: 'Massive discounts on fresh produce and premium groceries.',
      bgColor: 'linear-gradient(135deg, #FF6B35 0%, #FF9800 100%)',
      image: '🔥',
      cta: 'View Deals',
      link: '/products'
    },
    {
      title: 'Organic Selection',
      subtitle: 'Certified Organic Produce',
      description: 'Curated selection of 100% natural, pesticide-free fruits & vegetables.',
      bgColor: 'linear-gradient(135deg, #388E3C 0%, #66BB6A 100%)',
      image: '🥬',
      cta: 'Explore Organic',
      link: '/products'
    }
  ];

  const features = [
    { icon: '⚡', title: '30-Min Delivery', desc: 'Lightning-fast delivery guaranteed' },
    { icon: '🌟', title: 'Premium Quality', desc: 'Fresh from farm to your table' },
    { icon: '💎', title: 'Best Prices', desc: 'Price match guarantee on all items' },
    { icon: '🛡️', title: 'Safe & Secure', desc: '100% secure payments & packaging' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, allProductsRes, offersRes] = await Promise.all([
          axios.get('http://localhost:8000/api/categories'),
          axios.get('http://localhost:8000/api/products'),
          axios.get('http://localhost:8000/api/loyalty/offers')
        ]);

        const formattedCategories = categoriesRes.data.map((cat, index) => {
          const productCount = allProductsRes.data.filter(
            product => product.category_id === cat.category_id
          ).length;
          return {
            id: cat.category_id,
            name: cat.category_name,
            icon: ['🥬','🥦','🍎','🍒','🍱','🥗','🧃','🧻'][index % 8],
            color: ['#FF4757','#2ED573','#FFA502','#FF6B8B','#06D6A0','#118AB2','#9B5DE5','#8338EC'][index % 8],
            bgColor: ['#FF475710','#2ED57310','#FFA50210','#FF6B8B10','#06D6A010','#118AB210','#9B5DE510','#8338EC10'][index % 8],
            items: productCount
          };
        });
        setCategories(formattedCategories);

        const enhancedProducts = allProductsRes.data.map(product => {
          const baseRating = product.rating || (4.0 + Math.random() * 1.0);
          const reviews = product.reviews || Math.floor(Math.random() * 100) + 50;
          const isFresh = product.is_fresh || Math.random() > 0.5;
          const isOrganic = product.is_organic || Math.random() > 0.6;
          const discount = product.discount || (Math.random() > 0.4 ? Math.floor(Math.random() * 30) + 10 : 0);
          const originalPrice = product.original_price
            ? parseFloat(product.original_price)
            : parseFloat(product.price) * 1.2;

          let productImage = '🛒';
          if (product.image) {
            if (product.image.startsWith('http') || product.image.startsWith('data:image') || product.image.startsWith('/')) {
              productImage = product.image;
            } else if (product.image.includes('.jpg') || product.image.includes('.png') || product.image.includes('.jpeg')) {
              productImage = `http://localhost:8000/uploads/${product.image.replace(/^\/+/, '')}`;
            } else if (product.image.length > 10) {
              productImage = `http://localhost:8000/api/images/${product.image}`;
            } else {
              productImage = product.image;
            }
          }

          return {
            id: product.product_id,
            name: product.product_name,
            category_id: product.category_id,
            price: parseFloat(product.price),
            originalPrice,
            unit: product.unit || 'piece',
            image: productImage,
            rating: baseRating,
            reviews,
            isFresh,
            isOrganic,
            discount,
            description: product.description || '',
          };
        });

        const categoryProducts = [];
        for (let cat of categoriesRes.data) {
          const categoryProds = enhancedProducts.filter(
            product => product.category_id === cat.category_id
          );
          if (categoryProds.length > 0) {
            categoryProducts.push({
              categoryName: cat.category_name,
              categoryId: cat.category_id,
              products: categoryProds
            });
          }
        }
        setProducts(categoryProducts);

        const activeOffers = offersRes.data.filter(offer => offer.status === 'active');
        const formattedOffers = activeOffers.map((offer, index) => {
          let discountDisplay = '';
          if (offer.offer_type === 'percentage') {
            discountDisplay = `${offer.discount_value}% OFF`;
          } else if (offer.offer_type === 'fixed') {
            // Replace any dollar sign with rupee
            const fixedValue = offer.discount_value.toString().replace('$', '₹');
            discountDisplay = `${fixedValue} OFF`;
          } else {
            discountDisplay = offer.discount_value;
          }

          let validUntilText = 'Limited Time';
          if (offer.valid_until) {
            const today = new Date().toISOString().split('T')[0];
            if (offer.valid_until === today) {
              validUntilText = 'Today Only';
            } else {
              const expiryDate = new Date(offer.valid_until);
              validUntilText = `Until ${expiryDate.toLocaleDateString()}`;
            }
          }
          if (offer.min_purchase && offer.min_purchase !== '$0' && offer.min_purchase !== '₹0') {
            // Replace any dollar sign with rupee for display
            const minPurchase = offer.min_purchase.toString().replace('$', '₹');
            validUntilText = `Min. ${minPurchase}`;
          }

          const icons = ['🎉', '👋', '🚚', '🎁'];
          const colors = ['#FF6B35', '#2ED573', '#118AB2', '#9B5DE5'];

          return {
            id: offer.offer_code,
            title: offer.offer_name,
            discount: discountDisplay,
            code: offer.offer_code,
            color: colors[index % colors.length],
            validUntil: validUntilText,
            icon: icons[index % icons.length]
          };
        });
        setOffers(formattedOffers);

        if (activeOffers.length > 0) {
          const slidesFromOffers = activeOffers.map((offer, index) => {
            let emoji = '🎁';
            if (offer.offer_type === 'percentage') emoji = '🔥';
            else if (offer.offer_type === 'fixed') emoji = '💰';
            else if (offer.offer_name.toLowerCase().includes('free')) emoji = '🚚';
            else if (offer.offer_name.toLowerCase().includes('bogo')) emoji = '🍱';

            const gradients = [
              'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
              'linear-gradient(135deg, #FF6B35 0%, #FF9800 100%)',
              'linear-gradient(135deg, #388E3C 0%, #66BB6A 100%)',
              'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
              'linear-gradient(135deg, #7B1FA2 0%, #9C27B0 100%)',
              'linear-gradient(135deg, #C2185B 0%, #E91E63 100%)'
            ];

            // Prepare description with currency replaced
            let description = '';
            if (offer.min_purchase && offer.min_purchase !== '$0' && offer.min_purchase !== '₹0') {
              const minPurchase = offer.min_purchase.toString().replace('$', '₹');
              description = `Minimum purchase: ${minPurchase}. Use code: ${offer.offer_code}`;
            } else {
              description = `Use code: ${offer.offer_code} at checkout`;
            }

            return {
              title: offer.offer_name,
              subtitle: offer.offer_type === 'percentage' ? `${offer.discount_value}% OFF` : `${offer.discount_value} OFF`,
              description: description,
              bgColor: gradients[index % gradients.length],
              image: emoji,
              cta: 'Grab Deal',
              link: '/products'
            };
          });
          setHeroSlides(slidesFromOffers);
        } else {
          setHeroSlides(fallbackSlides);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setHeroSlides(fallbackSlides);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchTodayOrders = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        'http://localhost:8000/api/orders/today/count',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setTodayOrders(res.data.count);

    } catch (error) {
      console.error("Error fetching today's orders:", error);
      setTodayOrders(2500); // fallback
    }
  };

  useEffect(() => {
    fetchTodayOrders();
  }, []);

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => (prev + 1) % heroSlides.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const nextSlide = useCallback(() => {
    if (isTransitioning || heroSlides.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, heroSlides.length]);

  const prevSlide = useCallback(() => {
    if (isTransitioning || heroSlides.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(prev => (prev - 1 + heroSlides.length) % heroSlides.length);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, heroSlides.length]);

  const handleCategoryClick = (categoryName) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  const handleViewCategoryProducts = (categoryName) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  const handleProductClick = (productId, e) => {
    if (e.target.closest('.product-actions') || e.target.closest('.btn-wishlist') || e.target.tagName === 'BUTTON') {
      return;
    }
    navigate(`/product/${productId}`);
  };

  const handleAddToCart = (product, e) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      unit: product.unit,
      quantity: 1
    });
    alert(`✓ ${product.name} added to cart!`);
  };

  const handleBuyNow = (product, e) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      unit: product.unit,
      quantity: 1
    });
    navigate('/checkout');
  };

  const handleImageError = (e, product) => {
    e.target.style.display = 'none';
    const parent = e.target.parentElement;
    if (!parent.querySelector('.product-emoji')) {
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'product-emoji';
      if (product.name.toLowerCase().includes('potato')) emojiSpan.textContent = '🥔';
      else if (product.name.toLowerCase().includes('onion')) emojiSpan.textContent = '🧅';
      else if (product.name.toLowerCase().includes('tomato')) emojiSpan.textContent = '🍅';
      else if (product.name.toLowerCase().includes('cabbage')) emojiSpan.textContent = '🥬';
      else emojiSpan.textContent = '🛒';
      parent.appendChild(emojiSpan);
    }
  };

  return (
    <div className="home">
      {/* Hero Section - Dynamic from Offers */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-slides">
            {heroSlides.map((slide, index) => (
              <div
                key={index}
                className={`hero-slide ${index === currentSlide ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
                style={{ background: slide.bgColor }}
                aria-hidden={index !== currentSlide}
              >
                <div className="slide-content">
                  <div className="slide-text">
                    <span className="slide-badge">Limited Offer</span>
                    <h1 className="slide-title">{slide.title}</h1>
                    <h2 className="slide-subtitle">{slide.subtitle}</h2>
                    <p className="slide-description">{slide.description}</p>
                    <div className="slide-actions">
                      <Link to={slide.link} className="btn btn-primary btn-lg">
                        {slide.cta}
                        <span className="btn-icon">→</span>
                      </Link>
                      <Link to="/products" className="btn btn-outline">
                        Browse All
                      </Link>
                    </div>
                  </div>
                  <div className="slide-visual">
                    <div className="visual-container">
                      <span className="visual-emoji">{slide.image}</span>
                      <div className="visual-glow"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-controls">
            <button 
              className="hero-nav btn-nav prev" 
              onClick={prevSlide}
              aria-label="Previous slide"
              disabled={isTransitioning || heroSlides.length === 0}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div className="hero-indicators">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  className={`hero-indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setCurrentSlide(index);
                      setIsTransitioning(false);
                    }, 300);
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                  disabled={isTransitioning}
                >
                  <div className="indicator-progress"></div>
                </button>
              ))}
            </div>

            <button 
              className="hero-nav btn-nav next" 
              onClick={nextSlide}
              aria-label="Next slide"
              disabled={isTransitioning || heroSlides.length === 0}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Realistic Stats Bar */}
        <div className="stats-bar">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <div className="stat-value">In 30 mins</div>
                  <div className="stat-label">Fast Delivery</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🚚</div>
                <div className="stat-content">
                  <div className="stat-value">
                    {todayOrders !== null ? `${todayOrders.toLocaleString()}+` : '...'}
                  </div>
                  <div className="stat-label">Orders Today</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">😊</div>
                <div className="stat-content">
                  <div className="stat-value">100+</div>
                  <div className="stat-label">Happy Customers</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🏪</div>
                <div className="stat-content">
                  <div className="stat-value">1</div>
                  <div className="stat-label">Local Store</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section (target for footer) */}
      <section className="section categories-section" id="categories-section">
        <div className="container">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">Browse our wide selection of fresh products</p>
            </div>
            <Link to="/products" className="btn-link">
              View All Products
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="loading-categories">
              <div className="loading-spinner"></div>
              <p>Loading categories...</p>
            </div>
          ) : (
            <div className="categories-grid">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="category-card"
                  style={{ '--category-color': category.color }}
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <div
                    className="category-icon"
                    style={{ backgroundColor: category.bgColor }}
                  >
                    <span className="category-emoji">{category.icon}</span>
                    <div className="category-glow"></div>
                  </div>
                  <div className="category-content">
                    <h3 className="category-name">{category.name}</h3>
                    <span className="category-items">
                      {category.items} {category.items === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="category-hover">
                    <span>Shop Now →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <br></br>

      {/* Offers Section (target for footer) */}
      <section className="section offers-section" id="offers-section">
        <div className="container">
          <div className="section-header">
            <div className="section-title-group">
              <div className="title-with-badge">
                <h2 className="section-title">Special Offers</h2>
                <span className="title-badge">Limited Time</span>
              </div>
              <p className="section-subtitle">Exclusive deals just for you</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-offers">
              <div className="loading-spinner"></div>
              <p>Loading offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="no-offers">
              <p>No active offers at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="offers-grid">
              {offers.map((offer) => (
                <div 
                  key={offer.id} 
                  className="offer-card"
                  style={{ '--offer-color': offer.color }}
                >
                  <div className="offer-header">
                    <span className="offer-icon">{offer.icon}</span>
                    <span className="offer-badge">{offer.validUntil}</span>
                  </div>
                  <div className="offer-content">
                    <h3 className="offer-title">{offer.title}</h3>
                    <div className="offer-discount">{offer.discount}</div>
                    <div className="offer-code">
                      Use code: <span className="code-text">{offer.code}</span>
                    </div>
                  </div>
                  <button className="btn btn-outline offer-btn">
                    Apply Code
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="section products-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Featured Products by Category</h2>
            <Link to="/products" className="btn-link">
              View All Products →
            </Link>
          </div>

          {loading ? (
            <div className="loading-products-table">
              <div className="loading-spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="no-products-found">
              <p>No products available at the moment.</p>
            </div>
          ) : (
            products.map((categoryGroup, index) => (
              <div key={index} className="category-products-section">
                <div className="category-header-row">
                  <h3 className="category-title">{categoryGroup.categoryName}</h3>
                  <button
                    className="btn-view-all"
                    onClick={() => handleViewCategoryProducts(categoryGroup.categoryName)}
                  >
                    View All {categoryGroup.products.length} products →
                  </button>
                </div>

                <div className="featured-products-grid">
                  {categoryGroup.products.slice(0, 4).map(product => (
                    <div
                      key={product.id}
                      className="product-item clickable"
                      onClick={(e) => handleProductClick(product.id, e)}
                    >
                      <div className="product-card">
                        {/* 1. BADGES REMOVED */}
                        {/* 2. WISHLIST BUTTON REMOVED */}

                        <div className="product-image">
                          {product.image && product.image !== '🛒' ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="product-img"
                              loading="lazy"
                              onError={(e) => handleImageError(e, product)}
                            />
                          ) : (
                            <span className="product-emoji">
                              {product.name.toLowerCase().includes('potato') ? '🥔' :
                               product.name.toLowerCase().includes('onion') ? '🧅' :
                               product.name.toLowerCase().includes('tomato') ? '🍅' :
                               product.name.toLowerCase().includes('cabbage') ? '🥬' : '🛒'}
                            </span>
                          )}
                        </div>

                        <div className="product-info">
                          <div className="product-category">{categoryGroup.categoryName}</div>
                          <h3 className="product-name">{product.name}</h3>

                          {/* 3. RATING REMOVED */}

                          <div className="product-pricing">
                            <span className="current-price">₹{product.price.toFixed(2)}</span>
                            <span className="unit-price">/{product.unit}</span>
                            {/* 4. ORIGINAL PRICE REMOVED */}
                          </div>

                          <div className="product-actions">
                            <button
                              className="btn btn-primary add-to-cart"
                              onClick={(e) => handleAddToCart(product, e)}
                            >
                              Add to Cart
                            </button>
                            <button
                              className="btn btn-secondary buy-now"
                              onClick={(e) => handleBuyNow(product, e)}
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header center">
            <div className="section-title-group">
              <h2 className="section-title">Why Choose FreshBasket</h2>
              <p className="section-subtitle">Experience grocery shopping reimagined</p>
            </div>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-container">
                  <span className="feature-icon">{feature.icon}</span>
                  <div className="feature-shine"></div>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;