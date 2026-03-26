// pages/Products.jsx - FINAL (with out of stock badge)
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import './Products.css';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Stock map: product_id -> current_stock
  const [stockMap, setStockMap] = useState({});

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [filters, setFilters] = useState({
    isFresh: false,
    isOrganic: false,
    discount: false,
    rating: 0,
  });

  // Fetch categories, products and stock
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, productsRes, stockRes] = await Promise.all([
          axios.get('http://localhost:8000/api/categories'),
          axios.get('http://localhost:8000/api/products'),
          axios.get('http://localhost:8000/api/current-stock')
        ]);

        const formattedCategories = [
          { category_id: null, category_name: 'All Categories' },
          ...categoriesRes.data
        ];
        setCategories(formattedCategories);

        const categoryMap = {};
        categoriesRes.data.forEach(cat => {
          categoryMap[cat.category_id] = cat.category_name;
        });

        const formattedProducts = productsRes.data.map(product => {
          const categoryName = categoryMap[product.category_id] || 'Uncategorized';
          
          let productImage = '🛒';
          if (product.image) {
            if (product.image.startsWith('http') || 
                product.image.startsWith('data:image') ||
                product.image.startsWith('/')) {
              productImage = product.image;
            } else if (product.image.includes('.jpg') || 
                     product.image.includes('.png') ||
                     product.image.includes('.jpeg') ||
                     product.image.includes('.webp') ||
                     product.image.includes('.gif')) {
              if (!product.image.startsWith('http')) {
                productImage = `http://localhost:8000/${product.image.replace(/^\/+/, '')}`;
              } else {
                productImage = product.image;
              }
            } else if (product.image.length > 10) {
              productImage = `http://localhost:8000/api/images/${product.image}`;
            }
          }

          // Rating is no longer used, but we keep it for potential future use
          const baseRating = product.rating || (4.0 + Math.random() * 1.0);
          const reviews = product.reviews || Math.floor(Math.random() * 100) + 50;
          
          return {
            id: product.product_id,
            name: product.product_name,
            category: categoryName,
            category_id: product.category_id,
            price: parseFloat(product.price),
            // Keep originalPrice for sorting by discount, but not display it
            originalPrice: product.original_price ? parseFloat(product.original_price) : parseFloat(product.price) * 1.2,
            unit: product.unit || 'piece',
            image: productImage,
            rating: baseRating,
            reviews: reviews,
            isFresh: product.is_fresh || Math.random() > 0.5,
            isOrganic: product.is_organic || Math.random() > 0.6,
            discount: product.discount || (Math.random() > 0.4 ? Math.floor(Math.random() * 30) + 10 : 0),
            description: product.description || '',
            quantity: product.quantity || 100
          };
        });

        setProducts(formattedProducts);

        // Build stock map
        const stockMapTemp = {};
        stockRes.data.forEach(item => {
          stockMapTemp[item.product_id] = item.current_stock;
        });
        setStockMap(stockMapTemp);
      } catch (err) {
        setError('Failed to load products. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // URL params and filtering
  useEffect(() => {
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    
    if (category) setSelectedCategory(category);
    if (search) setSearchQuery(search);
    if (sort) setSortBy(sort);
  }, [searchParams]);

  useEffect(() => {
    let result = [...products];

    if (searchQuery) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All Categories') {
      result = result.filter(product => product.category === selectedCategory);
    }

    result = result.filter(product =>
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    if (filters.isFresh) result = result.filter(product => product.isFresh);
    if (filters.isOrganic) result = result.filter(product => product.isOrganic);
    if (filters.discount) result = result.filter(product => product.discount > 0);
    if (filters.rating > 0) result = result.filter(product => product.rating >= filters.rating);

    switch (sortBy) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'discount': result.sort((a, b) => b.discount - a.discount); break;
      case 'newest': result.sort((a, b) => b.id - a.id); break;
      default: result.sort((a, b) => b.reviews - a.reviews); break;
    }

    setFilteredProducts(result);
  }, [products, searchQuery, selectedCategory, priceRange, filters, sortBy]);

  const handleProductClick = (productId, e) => {
    if (e.target.closest('.product-actions') || 
        e.target.closest('.wishlist-btn') ||
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'SPAN') {
      return;
    }
    navigate(`/product/${productId}`);
  };

  const handleFilterChange = (filterName) => {
    setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
  };

  const handleRatingFilter = (rating) => {
    setFilters(prev => ({ ...prev, rating: prev.rating === rating ? 0 : rating }));
  };

  const handlePriceChange = (e) => {
    const value = parseInt(e.target.value);
    if (e.target.name === 'min') {
      setPriceRange([value, priceRange[1]]);
    } else {
      setPriceRange([priceRange[0], value]);
    }
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setSearchParams(prev => {
      prev.set('sort', e.target.value);
      return prev;
    });
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category.category_name);
    setSearchParams(prev => {
      if (category.category_name === 'All Categories') {
        prev.delete('category');
      } else {
        prev.set('category', category.category_name);
      }
      return prev;
    });
    setShowMobileFilters(false);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchParams(prev => {
      if (value) prev.set('search', value);
      else prev.delete('search');
      return prev;
    });
  };

  const clearFilters = () => {
    setSelectedCategory('All Categories');
    setSearchQuery('');
    setPriceRange([0, 1000]);
    setFilters({ isFresh: false, isOrganic: false, discount: false, rating: 0 });
    setSortBy('popular');
    setSearchParams({});
  };

  const handleAddToCart = (product, e) => {
    e.stopPropagation();
    // Check if in stock
    const available = stockMap[product.id] || 0;
    if (available <= 0) {
      alert('This product is out of stock.');
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      unit: product.unit,
      quantity: 1
    });
    alert(`✓ ${product.name} added to cart!`);
  };

  const handleBuyNow = (product, e) => {
    e.stopPropagation();
    const available = stockMap[product.id] || 0;
    if (available <= 0) {
      alert('This product is out of stock.');
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      unit: product.unit,
      quantity: 1
    });
    navigate('/checkout');
  };

  const handleImageError = (e, product) => {
    e.target.style.display = 'none';
    const parent = e.target.parentElement;
    const existingEmoji = parent.querySelector('.product-emoji');
    if (!existingEmoji) {
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'product-emoji';
      if (product.category.includes('Vegetable') || product.name.includes('Mushroom')) {
        emojiSpan.textContent = '🥦';
      } else if (product.category.includes('Fruit') || product.name.includes('Blueberr')) {
        emojiSpan.textContent = '🍓';
      } else if (product.category.includes('Dairy')) {
        emojiSpan.textContent = '🥛';
      } else if (product.category.includes('Bakery')) {
        emojiSpan.textContent = '🍞';
      } else {
        emojiSpan.textContent = '🛒';
      }
      parent.appendChild(emojiSpan);
    }
  };

  return (
    <div className="products-page">
      {/* Header */}
      <div className="products-header">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <span className="current">Products</span>
            {selectedCategory !== 'All Categories' && (
              <>
                <span>›</span>
                <span className="current">{selectedCategory}</span>
              </>
            )}
          </div>
          <h1 className="page-title">
            {searchQuery ? `Search: "${searchQuery}"` : selectedCategory}
            <span className="product-count"> ({filteredProducts.length} products)</span>
          </h1>
          <p className="page-subtitle">
            Discover fresh groceries and daily essentials at the best prices
          </p>
        </div>
      </div>

      <div className="products-content container">
        {/* Mobile Filter Toggle */}
        <div className="mobile-filter-toggle">
          <button 
            className="btn btn-secondary filter-toggle-btn"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <span>🔍</span>
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
            {Object.values(filters).filter(Boolean).length > 0 && (
              <span className="filter-count">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <div className="products-layout">
          {/* Filters Sidebar */}
          <div className={`filters-sidebar ${showMobileFilters ? 'mobile-show' : ''}`}>
            <div className="filters-header">
              <h3>Filters</h3>
              <button className="clear-filters" onClick={clearFilters}>Clear All</button>
              <button className="close-filters" onClick={() => setShowMobileFilters(false)}>✕</button>
            </div>

            <div className="filter-section">
              <h4 className="filter-title">Search Products</h4>
              <div className="search-filter">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="search-input"
                />
                <span className="search-icon"></span>
              </div>
            </div>

            <div className="filter-section">
              <h4 className="filter-title">Categories</h4>
              <div className="categories-list">
                {categories.map((category, index) => (
                  <button
                    key={index}
                    className={`category-filter-btn ${selectedCategory === category.category_name ? 'active' : ''}`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category.category_name}
                    <span className="category-count">
                      {category.category_name === 'All Categories' 
                        ? products.length 
                        : products.filter(p => p.category === category.category_name).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4 className="filter-title">Price Range</h4>
              <div className="price-filter">
                <div className="price-range-display">
                  <span>₹{priceRange[0].toFixed(2)}</span>
                  <span>to</span>
                  <span>₹{priceRange[1].toFixed(2)}</span>
                </div>
                <div className="price-slider">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[0]}
                    onChange={handlePriceChange}
                    name="min"
                    className="slider"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={handlePriceChange}
                    name="max"
                    className="slider"
                  />
                </div>
                <div className="price-limits">
                  <span>₹0</span>
                  <span>₹1000+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Products Main Content */}
          <div className="products-main">
            {/* Toolbar */}
            <div className="products-toolbar">
              <div className="toolbar-left">
                <span className="results-count">
                  Showing {filteredProducts.length} of {products.length} products
                </span>
              </div>
              <div className="toolbar-right">
                <div className="view-toggle">
                  <button
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                  ><span>▦</span></button>
                  <button
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                  ><span>☰</span></button>
                </div>
                <div className="sort-by">
                  <label htmlFor="sort-select">Sort by:</label>
                  <select id="sort-select" value={sortBy} onChange={handleSortChange} className="sort-select">
                    <option value="popular">Most Popular</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="discount">Best Discount</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading / Error / Empty states */}
            {loading && (
              <div className="loading-products">
                <div className="loading-spinner"></div>
                <p>Loading products...</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <div className="error-icon">⚠️</div>
                <h3>Error Loading Products</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && filteredProducts.length > 0 ? (
              <div className={`products-${viewMode}`}>
                {filteredProducts.map(product => {
                  const availableStock = stockMap[product.id] || 0;
                  const inStock = availableStock > 0;
                  return (
                    <div 
                      key={product.id} 
                      className="product-item clickable"
                      onClick={(e) => handleProductClick(product.id, e)}
                    >
                      <div className="product-card">
                        {/* Product Image - fills container, no wishlist button */}
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
                              {product.category.includes('Vegetable') || product.name.includes('Mushroom') ? '🥦' : 
                               product.category.includes('Fruit') || product.name.includes('Blueberr') ? '🍓' : '🛒'}
                            </span>
                          )}
                          {/* Out of Stock Badge */}
                          {!inStock && (
                            <span className="out-of-stock-badge">Out of Stock</span>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="product-info">
                          <div className="product-category">{product.category}</div>
                          <h3 className="product-name">{product.name}</h3>
                          
                          {/* Rating section removed */}

                          {/* Pricing - only current price shown */}
                          <div className="product-pricing">
                            <span className="current-price">₹{product.price.toFixed(2)}</span>
                            <span className="unit-price">/{product.unit}</span>
                          </div>

                          {/* Actions */}
                          <div className="product-actions">
                            <button
                              className="btn btn-primary add-to-cart"
                              onClick={(e) => handleAddToCart(product, e)}
                              disabled={!inStock}
                            >
                              {inStock ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                            <button 
                              className="btn btn-secondary buy-now"
                              onClick={(e) => handleBuyNow(product, e)}
                              disabled={!inStock}
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !loading && !error ? (
              <div className="no-products">
                <div className="no-products-icon">😕</div>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search term</p>
                <button className="btn btn-primary" onClick={clearFilters}>
                  Clear All Filters
                </button>
              </div>
            ) : null}

            {/* Pagination */}
            {!loading && !error && filteredProducts.length > 0 && (
              <div className="pagination">
                <button className="pagination-btn prev" disabled>← Previous</button>
                <div className="pagination-numbers">
                  <button className="page-number active">1</button>
                  <button className="page-number">2</button>
                  <button className="page-number">3</button>
                  <span className="page-ellipsis">...</span>
                  <button className="page-number">10</button>
                </div>
                <button className="pagination-btn next">Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;