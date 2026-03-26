// src/pages/ProductDetails.jsx - FINAL (with stock/out of stock logic)
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart: addToCartContext } = useContext(CartContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // New state for stock information
  const [stockInfo, setStockInfo] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8000/api/products/${id}`);
        
        const formattedProduct = {
          id: response.data.product_id,
          name: response.data.product_name,
          price: parseFloat(response.data.price || 0),
          originalPrice: response.data.original_price ? parseFloat(response.data.original_price) : null,
          category: response.data.category,
          image: response.data.image,
          discount: response.data.discount || 0,
          unit: response.data.unit || 'piece',
          description: response.data.description || '',
          isFresh: response.data.is_fresh || true,
          isOrganic: response.data.is_organic || false,
        };
        
        setProduct(formattedProduct);
        
        // Fetch related products
        if (response.data.category_id) {
          const relatedRes = await axios.get(`http://localhost:8000/api/products`);
          const related = relatedRes.data
            .filter(p => p.category_id === response.data.category_id && p.product_id !== response.data.product_id)
            .slice(0, 4)
            .map(p => ({
              id: p.product_id,
              name: p.product_name,
              price: parseFloat(p.price),
              image: p.image,
              category: p.category,
              unit: p.unit || 'piece',
            }));
          setRelatedProducts(related);
        }
      } catch (err) {
        setError('Failed to load product details. Please try again.');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Fetch current stock data for this product
  useEffect(() => {
    const fetchStock = async () => {
      if (!id) return;
      setStockLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/api/current-stock', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        // Find stock info for this product
        const productStock = res.data.find(item => item.product_id === parseInt(id)) || null;
        setStockInfo(productStock);
      } catch (err) {
        console.error('Error fetching stock:', err);
        setStockError('Could not load stock information');
      } finally {
        setStockLoading(false);
      }
    };
    fetchStock();
  }, [id]);

  const handleQuantityChange = (change) => {
    setQuantity(prev => {
      const newQty = prev + change;
      // Max quantity limited by available stock if known
      const maxQty = stockInfo ? Math.min(99, Math.floor(stockInfo.current_stock)) : 99;
      return Math.max(1, Math.min(maxQty, newQty));
    });
  };

  const handleQuantityInput = (e) => {
    const value = parseInt(e.target.value) || 1;
    const maxQty = stockInfo ? Math.min(99, Math.floor(stockInfo.current_stock)) : 99;
    setQuantity(Math.max(1, Math.min(maxQty, value)));
  };

  const addToCart = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    try {
      addToCartContext({ ...product, quantity });
    } catch (err) {
      alert('Failed to add to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const buyNow = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    try {
      addToCartContext({ ...product, quantity });
      navigate('/cart');
    } catch (err) {
      alert('Failed to proceed. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Determine stock status
  const availableStock = stockInfo ? Math.floor(stockInfo.current_stock) : 0;
  const inStock = !stockLoading && stockInfo && availableStock > 0;
  const stockStatusMessage = stockLoading
    ? 'Checking stock...'
    : stockError
    ? 'Stock info unavailable'
    : inStock
    ? `In Stock (${availableStock} available)`
    : 'Out of Stock';

  if (loading) {
    return (
      <div className="product-details-loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-details-error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Product Not Found</h3>
          <p>{error || 'The product you are looking for does not exist.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/products')}>
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const getProductImage = () => {
    if (product.image) {
      if (product.image.startsWith('http') || 
          product.image.startsWith('data:image') ||
          product.image.startsWith('/')) {
        return product.image;
      } else if (product.image.includes('.jpg') || 
               product.image.includes('.png') ||
               product.image.includes('.jpeg') ||
               product.image.includes('.webp') ||
               product.image.includes('.gif')) {
        return `http://localhost:8000/${product.image.replace(/^\/+/, '')}`;
      } else if (product.image.length > 10) {
        return `http://localhost:8000/api/images/${product.image}`;
      }
    }
    return null;
  };

  return (
    <div className="product-details-page">
      {/* Breadcrumb */}
      <div className="container">
        <nav className="breadcrumb-nav">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">›</span>
          <Link to="/products" className="breadcrumb-link">Products</Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{product.name}</span>
        </nav>
      </div>

      <div className="container">
        <div className="product-details-wrapper">
          {/* Product Gallery */}
          <div className="product-gallery-section">
            <div className="product-image-main">
              <div className="image-container">
                {getProductImage() ? (
                  <img 
                    src={getProductImage()} 
                    alt={product.name}
                    className="product-main-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const emojiSpan = document.createElement('span');
                      emojiSpan.className = 'product-emoji-large';
                      emojiSpan.textContent = product.category && product.category.includes('Fruit') ? '🍎' : '🛒';
                      e.target.parentElement.appendChild(emojiSpan);
                    }}
                  />
                ) : (
                  <span className="product-emoji-large">
                    {product.category && product.category.includes('Fruit') ? '🍎' : '🛒'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="product-info-section">
            <div className="product-header">
              <h1 className="product-title">{product.name}</h1>
              
              <div className="product-meta">
                {/* Stock status badge */}
                <div className="stock-status">
                  {stockLoading ? (
                    <span className="stock-loading">⏳ Checking...</span>
                  ) : inStock ? (
                    <span className="stock-in">✅ In Stock</span>
                  ) : (
                    <span className="stock-out">❌ Out of Stock</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="product-pricing-container">
              <div className="price-display">
                <div className="current-price">₹{product.price.toFixed(2)}</div>
                {product.originalPrice && product.originalPrice > product.price && (
                  <div className="price-comparison">
                    <span className="original-price">₹{product.originalPrice.toFixed(2)}</span>
                    {product.discount > 0 && (
                      <span className="discount-amount">Save ₹{(product.originalPrice - product.price).toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="unit-info">
                <span className="unit">per {product.unit}</span>
                <span className="tax-info">(Inclusive of all taxes)</span>
              </div>
            </div>

            {/* Product Description */}
            <div className="product-description-container">
              <h3 className="section-title">Product Description</h3>
              <div className="description-content">
                <p>{product.description || `Fresh, high-quality ${product.name.toLowerCase()} delivered to your doorstep. Perfect for your daily needs.`}</p>
                
                <div className="product-features">
                  <h4>Key Features:</h4>
                  <ul>
                    <li>100% Fresh and Natural</li>
                    <li>Rich in nutrients and vitamins</li>
                    <li>No artificial preservatives</li>
                    <li>Perfect for daily consumption</li>
                    {product.isOrganic && <li>Certified Organic Product</li>}
                  </ul>
                </div>
              </div>
            </div>

            {/* Quantity Selection - disable if out of stock */}
            <div className="quantity-container">
              <label className="quantity-label">Select Quantity:</label>
              <div className="quantity-control-group">
                <div className="quantity-control">
                  <button 
                    className="quantity-btn decrement" 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={!inStock || quantity <= 1}
                  >
                    <span>−</span>
                  </button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={handleQuantityInput}
                    min="1" 
                    max={inStock ? Math.min(99, Math.floor(availableStock)) : 1}
                    className="quantity-input"
                    disabled={!inStock}
                  />
                  <button 
                    className="quantity-btn increment" 
                    onClick={() => handleQuantityChange(1)}
                    disabled={!inStock || quantity >= (inStock ? Math.min(99, Math.floor(availableStock)) : 1)}
                  >
                    <span>+</span>
                  </button>
                </div>
                <div className="quantity-preview">
                  Total: <span className="total-price">₹{(product.price * quantity).toFixed(2)}</span>
                </div>
              </div>
              {/* Stock availability message */}
              {!stockLoading && !stockError && (
                <div className="stock-message">
                  {inStock ? (
                    <span className="stock-available">{availableStock} units available</span>
                  ) : (
                    <span className="stock-unavailable">Currently out of stock</span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-container">
              <button
                className={`btn btn-primary btn-lg add-to-cart ${isAddingToCart ? 'loading' : ''}`}
                onClick={addToCart}
                disabled={!inStock || isAddingToCart}
              >
                {isAddingToCart ? (
                  <>
                    <span className="spinner-small"></span>
                    Adding...
                  </>
                ) : !inStock ? (
                  'Out of Stock'
                ) : (
                  'Add to Cart'
                )}
              </button>
              
              <button
                className="btn btn-secondary btn-lg buy-now"
                onClick={buyNow}
                disabled={!inStock || isAddingToCart}
              >
                Buy Now
              </button>
            </div>

            {/* Delivery & Benefits */}
            <div className="benefits-container">
              <div className="benefits-grid">
                <div className="benefit-item">
                  <div className="benefit-icon">🚚</div>
                  <div className="benefit-content">
                    <h4>Free Delivery</h4>
                    <p>In just 5 hours</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <div className="benefit-icon">🔄</div>
                  <div className="benefit-content">
                    <h4>Easy Returns</h4>
                    <p>Return within 30 Minutes</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <div className="benefit-icon">💎</div>
                  <div className="benefit-content">
                    <h4>Quality Guaranteed</h4>
                    <p>Freshness assured</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Specifications */}
            <div className="specifications-container">
              <h3 className="section-title">Product Specifications</h3>
              <div className="specifications-list">
                <div className="spec-item">
                  <span className="spec-label">Unit</span>
                  <span className="spec-value">1 {product.unit}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Shelf Life</span>
                  <span className="spec-value">5-7 days</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Storage</span>
                  <span className="spec-value">Cool & dry place</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="related-products-section">
            <div className="section-header">
              <h2 className="section-title">You May Also Like</h2>
              <Link to="/products" className="view-all-link">
                View All Products →
              </Link>
            </div>
            
            <div className="related-products-grid">
              {relatedProducts.map((related) => (
                <div 
                  key={related.id} 
                  className="related-product-card"
                  onClick={() => navigate(`/product/${related.id}`)}
                >
                  <div className="related-product-image">
                    {related.image ? (
                      <img 
                        src={related.image} 
                        alt={related.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const emojiSpan = document.createElement('span');
                          emojiSpan.className = 'product-emoji-small';
                          emojiSpan.textContent = '🛒';
                          e.target.parentElement.appendChild(emojiSpan);
                        }}
                      />
                    ) : (
                      <span className="product-emoji-small">🛒</span>
                    )}
                  </div>
                  
                  <div className="related-product-info">
                    <div className="related-product-category">{related.category}</div>
                    <h3 className="related-product-name">{related.name}</h3>
                    
                    <div className="related-product-pricing">
                      <span className="price">₹{related.price.toFixed(2)}</span>
                      <span className="unit">/{related.unit}</span>
                    </div>
                    
                    <button 
                      className="btn btn-sm add-to-cart-quick"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCartContext({ ...related, quantity: 1 });
                        alert(`Added ${related.name} to cart!`);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;