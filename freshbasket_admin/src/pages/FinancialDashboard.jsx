import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FinancialDashboard.css';

const API_BASE = 'http://localhost:8000';

const FinancialDashboard = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [overview, setOverview] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);      // raw from API (yearly)
  const [completeYearTrend, setCompleteYearTrend] = useState([]); // padded Jan–Dec
  const [topProducts, setTopProducts] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [keyMetrics, setKeyMetrics] = useState({});
  const [topCategories, setTopCategories] = useState([]);

  // Mock data (used when API fails)
  const mockOverview = [
    { title: 'Total Revenue', value: 157890, change: '+12.5%', icon: 'rupee-sign', color: '#059669' },
    { title: 'Net Profit', value: 45670, change: '+8.3%', icon: 'chart-line', color: '#3b82f6' },
    { title: 'Orders', value: 1243, change: '+5.2%', icon: 'shopping-cart', color: '#8b5cf6' },
    { title: 'Avg. Order Value', value: 127, change: '+3.1%', icon: 'calculator', color: '#f59e0b' },
  ];

  const mockRevenueTrend = [
    { month: 'Jan', revenue: 125000, profit: 32000 },
    { month: 'Feb', revenue: 132000, profit: 35000 },
    { month: 'Mar', revenue: 141000, profit: 38000 },
    { month: 'Apr', revenue: 138000, profit: 36000 },
    { month: 'May', revenue: 152000, profit: 41000 },
    { month: 'Jun', revenue: 157890, profit: 45670 },
  ];

  const mockTopProducts = [
    { name: 'Orange', revenue: 270, growth: 0 },
    { name: 'Mango', revenue: 240, growth: 0 },
    { name: 'Pear', revenue: 240, growth: 0 },
    { name: 'Asparagus (100g)', revenue: 220, growth: 0 },
    { name: 'Iceberg Lettuce', revenue: 195, growth: 0 },
  ];

  const mockDailySummary = [
    { date: '2026-03-18', revenue: 12540, orders: 24, profit: 3762, waste: 450 },
    { date: '2026-03-17', revenue: 13820, orders: 27, profit: 4146, waste: 320 },
    { date: '2026-03-16', revenue: 11980, orders: 22, profit: 3594, waste: 280 },
    { date: '2026-03-15', revenue: 15670, orders: 31, profit: 4701, waste: 510 },
    { date: '2026-03-14', revenue: 14320, orders: 28, profit: 4296, waste: 390 },
    { date: '2026-03-13', revenue: 13150, orders: 26, profit: 3945, waste: 410 },
    { date: '2026-03-12', revenue: 11230, orders: 21, profit: 3369, waste: 230 },
  ];

  const mockKeyMetrics = {
    grossMargin: '32.5%',
    grossMarginChange: 1.2,
    operatingExpenses: '₹23,450',
    operatingExpensesChange: -0.5,
    cac: 1250,
    cacChange: 2.1,
    repeatRate: '43%',
    repeatRateChange: 3.4,
    inventoryTurnover: '4.2x',
    inventoryTurnoverChange: 0.3,
    paymentSuccess: '98.2%',
    paymentSuccessChange: 0.1,
  };

  const mockTopCategories = [
    { name: 'Vegetables', revenue: 85400, percentage: 34, growth: 12 },
    { name: 'Fruits', revenue: 62300, percentage: 25, growth: 8 },
    { name: 'Dairy', revenue: 41500, percentage: 17, growth: 15 },
    { name: 'Bakery', revenue: 28900, percentage: 12, growth: -2 },
    { name: 'Beverages', revenue: 15700, percentage: 6, growth: 5 },
  ];

  // Fetch main data when timeRange changes
  useEffect(() => {
    fetchFinancialData();
    const interval = setInterval(fetchFinancialData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Pad revenueTrend to a full year (Jan–Dec of current year)
  useEffect(() => {
    if (revenueTrend.length > 0) {
      setCompleteYearTrend(fillYearMonths(revenueTrend));
    } else {
      setCompleteYearTrend([]);
    }
  }, [revenueTrend]);

  const fetchFinancialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const overviewRes = await axios.get(`${API_BASE}/api/financial/overview?timeRange=${timeRange}`);
      setOverview(overviewRes.data);

      // For chart we always want yearly data, regardless of timeRange
      const trendRes = await axios.get(`${API_BASE}/api/financial/revenue-trend?timeRange=yearly`);
      setRevenueTrend(trendRes.data);

      const productsRes = await axios.get(`${API_BASE}/api/financial/top-products?timeRange=${timeRange}`);
      setTopProducts(productsRes.data);

      const summaryRes = await axios.get(`${API_BASE}/api/financial/daily-summary?days=7`);
      setDailySummary(summaryRes.data);

      const metricsRes = await axios.get(`${API_BASE}/api/financial/key-metrics?timeRange=${timeRange}`);
      setKeyMetrics(metricsRes.data);

      const catsRes = await axios.get(`${API_BASE}/api/financial/top-categories?timeRange=${timeRange}`);
      setTopCategories(catsRes.data);

    } catch (err) {
      console.error('Financial API error:', err);
      setOverview(mockOverview);
      setRevenueTrend(mockRevenueTrend);
      setTopProducts(mockTopProducts);
      setDailySummary(mockDailySummary);
      setKeyMetrics(mockKeyMetrics);
      setTopCategories(mockTopCategories);
      setError('Using demo data – backend API not available');
    } finally {
      setLoading(false);
    }
  };

  // Create an array of 12 months (Jan–Dec) for the current year, filling missing data with zeros
  const fillYearMonths = (data) => {
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return allMonths.map(month => {
      const found = data.find(item => item.month === month);
      return {
        month,
        revenue: found ? found.revenue : 0,
        profit: found ? found.profit : 0,
      };
    });
  };

  const formatCurrency = (amount) => 
    `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // For plain numbers (like order count) – no currency symbol
  const formatCount = (num) => {
    return parseFloat(num || 0).toLocaleString('en-IN');
  };

  const formatNumber = (num) => {
    if (num >= 100000) return `₹${(num/100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num/1000).toFixed(1)}K`;
    return `₹${num.toFixed(2)}`;
  };

  const getIconForTitle = (title) => {
    if (title.includes('Revenue')) return '💰';
    if (title.includes('Profit')) return '📊';
    if (title.includes('Orders')) return '📦';
    if (title.includes('Avg.')) return '🧾';
    return '📈';
  };

  // Chart y‑axis based on padded data
  const maxRevenue = completeYearTrend.length > 0
    ? Math.max(...completeYearTrend.map(item => item.revenue)) * 1.1
    : 1000;
  const effectiveMax = maxRevenue > 0 ? maxRevenue : 1000;
  const yAxisLabels = [];
  const step = effectiveMax / 5;
  for (let i = 0; i <= 5; i++) yAxisLabels.push(Math.round(i * step));

  const exportReport = () => {
    let csv = '';

    csv += 'Overview\n';
    csv += 'Title,Value,Change\n';
    overview.forEach(item => {
      csv += `${item.title},${item.value},${item.change}\n`;
    });
    csv += '\n';

    csv += 'Revenue Trend (Full Year)\n';
    csv += 'Month,Revenue (₹),Profit (₹)\n';
    completeYearTrend.forEach(item => {
      csv += `${item.month},${item.revenue},${item.profit}\n`;
    });
    csv += '\n';

    csv += 'Top Products\n';
    csv += 'Product,Revenue (₹),Growth (%)\n';
    topProducts.forEach(p => {
      csv += `${p.name},${p.revenue},${p.growth}\n`;
    });
    csv += '\n';

    csv += 'Daily Summary\n';
    csv += 'Date,Revenue (₹),Orders,Profit (₹),Waste (₹)\n';
    dailySummary.forEach(d => {
      csv += `${d.date},${d.revenue},${d.orders},${d.profit},${d.waste}\n`;
    });
    csv += '\n';

    csv += 'Key Metrics\n';
    csv += `Gross Margin,${keyMetrics.grossMargin || 'N/A'},Change: ${keyMetrics.grossMarginChange || 0}%\n`;
    csv += `Operating Expenses,${keyMetrics.operatingExpenses || 'N/A'},Change: ${keyMetrics.operatingExpensesChange || 0}%\n`;
    csv += `CAC,${keyMetrics.cac ? '₹'+keyMetrics.cac : 'N/A'},Change: ${keyMetrics.cacChange || 0}%\n`;
    csv += `Repeat Rate,${keyMetrics.repeatRate || 'N/A'},Change: ${keyMetrics.repeatRateChange || 0}%\n`;
    csv += `Inventory Turnover,${keyMetrics.inventoryTurnover || 'N/A'},Change: ${keyMetrics.inventoryTurnoverChange || 0}%\n`;
    csv += `Payment Success,${keyMetrics.paymentSuccess || 'N/A'},Change: ${keyMetrics.paymentSuccessChange || 0}%\n`;
    csv += '\n';

    csv += 'Top Categories\n';
    csv += 'Category,Revenue (₹),% of Total,Growth (%)\n';
    topCategories.forEach(cat => {
      csv += `${cat.name},${cat.revenue},${cat.percentage},${cat.growth}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${timeRange}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="financial-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-dashboard">
      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <h1>Financial Dashboard</h1>
          <p>Real-time profit & loss analytics</p>
        </div>
        <div className="header-actions">
          <div className="time-range-selector">
            {['daily', 'weekly', 'monthly', 'yearly'].map(range => (
              <button
                key={range}
                className={`time-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={exportReport}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{marginRight:'6px'}}>
              <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="api-warning">
          <i className="fas fa-info-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards */}
      <section className="overview-cards">
        {overview.map((item, index) => (
          <div key={index} className="card" style={{ borderLeftColor: item.color }}>
            <div className="card-icon" style={{ backgroundColor: item.color + '20', color: item.color }}>
              {getIconForTitle(item.title)}
            </div>
            <div className="card-content">
              <h3>{item.title}</h3>
              <p className="value">
                {item.title === 'Orders'
                  ? formatCount(item.value)           // plain number for orders
                  : formatCurrency(item.value)        // currency for others
                }
              </p>
              <p className={`change ${item.change.startsWith('+') ? 'positive' : 'negative'}`}>
                {item.change} vs last period
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Revenue Trend Chart – fixed yearly (Jan–Dec), no dropdown */}
      <section className="table-section full-width">
        <div className="section-header">
          <h2><i className="fas fa-chart-line"></i> Revenue & Profit Trend (Yearly)</h2>
        </div>
        <div className="chart-container">
          <div className="chart-with-axis">
            <div className="y-axis">
              {yAxisLabels.slice().reverse().map((value, idx) => (
                <div key={idx} className="y-axis-label" style={{ bottom: `${(value / effectiveMax) * 100}%` }}>
                  {formatNumber(value)}
                </div>
              ))}
            </div>
            <div className="bars-container">
              {completeYearTrend.map((item, index) => {
                const revenueHeight = (item.revenue / effectiveMax) * 280;
                const profitHeight = (item.profit / effectiveMax) * 280;
                return (
                  <div className="bar-group" key={index}>
                    <div className="bar-label">{item.month}</div>
                    <div className="bars">
                      <div
                        className="bar revenue-bar"
                        style={{ height: revenueHeight }}
                        title={`Revenue: ${formatCurrency(item.revenue)}`}
                      >
                        {item.revenue > 0 && (
                          <span className="bar-value">{formatNumber(item.revenue)}</span>
                        )}
                      </div>
                      <div
                        className="bar profit-bar"
                        style={{ height: profitHeight }}
                        title={`Profit: ${formatCurrency(item.profit)}`}
                      >
                        {item.profit > 0 && (
                          <span className="bar-value">{formatNumber(item.profit)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Legend outside chart-container */}
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-color revenue-color"></span>Revenue</div>
          <div className="legend-item"><span className="legend-color profit-color"></span>Profit</div>
        </div>
      </section>

      {/* P&L Section */}
      <div className="pl-section">
        <section className="top-products">
          <h2><i className="fas fa-cube"></i> Top Products</h2>
          <div className="product-list">
            {topProducts.map((product, idx) => (
              <div key={idx} className="product-item">
                <div className="product-info">
                  <span className="product-name">{product.name}</span>
                  <span className="product-revenue">{formatCurrency(product.revenue)}</span>
                </div>
                <div className="product-growth">
                  <span className={product.growth >= 0 ? 'positive' : 'negative'}>
                    {product.growth > 0 ? '+' : ''}{product.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="top-categories">
          <h2><i className="fas fa-tags"></i> Top Categories</h2>
          <div className="category-list">
            {topCategories.map((cat, idx) => (
              <div key={idx} className="category-item">
                <div className="category-info">
                  <span className="category-name">{cat.name}</span>
                  <span className="category-revenue">{formatCurrency(cat.revenue)}</span>
                </div>
                <div className="category-bar">
                  <div className="bar-fill" style={{ width: `${cat.percentage}%`, backgroundColor: '#059669' }}></div>
                </div>
                <div className="category-growth">
                  <span className={cat.growth >= 0 ? 'positive' : 'negative'}>
                    {cat.growth > 0 ? '+' : ''}{cat.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Daily Summary Table */}
      <section className="table-section full-width">
        <div className="section-header">
          <h2><i className="fas fa-calendar-day"></i> Daily Summary</h2>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Orders</th>
                <th>Profit</th>
                <th>Waste</th>
              </tr>
            </thead>
            <tbody>
              {dailySummary.map((day, idx) => (
                <tr key={idx}>
                  <td className="date-cell">{day.date}</td>
                  <td className="price-cell">{formatCurrency(day.revenue)}</td>
                  <td className="number-cell">{day.orders}</td>
                  <td className="price-cell">{formatCurrency(day.profit)}</td>
                  <td className="price-cell">{formatCurrency(day.waste)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FinancialDashboard;