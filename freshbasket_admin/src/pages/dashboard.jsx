import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const navigate = useNavigate();

  const getToken = () => localStorage.getItem("token");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return { color: "#10b981", bg: "#d1fae5", icon: "✅" };
      case "out for delivery":
        return { color: "#8b5cf6", bg: "#ede9fe", icon: "🚚" };
      case "processing":
        return { color: "#3b82f6", bg: "#dbeafe", icon: "🔄" };
      case "pending":
        return { color: "#f59e0b", bg: "#fef3c7", icon: "⏰" };
      case "cancelled":
        return { color: "#ef4444", bg: "#fee2e2", icon: "❌" };
      case "return requested":
        return { color: "#f97316", bg: "#ffedd5", icon: "↩️" };
      default:
        return { color: "#6b7280", bg: "#f3f4f6", icon: "❓" };
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [
        ordersRes,
        customersRes,
        productsRes,
        categoriesRes,
        returnsRes,
        orderItemsRes,
      ] = await Promise.all([
        fetch("http://localhost:8000/api/orders", { headers }),
        fetch("http://localhost:8000/api/customers", { headers }),
        fetch("http://localhost:8000/api/products", { headers }),
        fetch("http://localhost:8000/api/categories", { headers }),
        fetch("http://localhost:8000/api/return-requests", { headers }),
        fetch("http://localhost:8000/api/order-items", { headers }),
      ]);

      if (ordersRes.status === 401 || customersRes.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const orders = await ordersRes.json();
      const customers = await customersRes.json();
      const products = await productsRes.json();
      const categories = await categoriesRes.json();
      const returnRequests = await returnsRes.json();
      const orderItems = await orderItemsRes.json();

      // Stats
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.total_amount || 0),
        0
      );
      const totalCustomers = customers.length;
      const totalProducts = products.length;

      setStats({
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
      });

      // Recent orders
      const sortedOrders = [...orders].sort(
        (a, b) => new Date(b.order_date) - new Date(a.order_date)
      );
      setRecentOrders(sortedOrders.slice(0, 5));

      // Pending returns
      const pending = returnRequests.filter((r) => r.status === "pending");
      setPendingReturns(pending.slice(0, 5));

      // Top products
      const productSales = {};
      orderItems.forEach((item) => {
        const pid = item.product_id;
        if (!productSales[pid]) {
          productSales[pid] = { quantity: 0, revenue: 0 };
        }
        productSales[pid].quantity += item.quantity;
        productSales[pid].revenue += parseFloat(item.subtotal || 0);
      });

      const productMap = Object.fromEntries(
        products.map((p) => [p.product_id, p])
      );

      const top = Object.entries(productSales)
        .map(([pid, data]) => ({
          product_id: parseInt(pid),
          product_name: productMap[pid]?.product_name || "Unknown",
          total_sold: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5);
      setTopProducts(top);

      // Sales data: fixed last 6 months using UTC to avoid timezone shifts
      const monthlySales = {};
      orders.forEach((order) => {
        if (!order.order_date) return;
        // Use UTC to prevent day-boundary issues
        const date = new Date(order.order_date);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const monthYear = `${year}-${String(month).padStart(2, "0")}`;
        monthlySales[monthYear] = (monthlySales[monthYear] || 0) + parseFloat(order.total_amount || 0);
      });

      // Generate last 6 months (including current month) based on UTC today
      const today = new Date();
      const utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(Date.UTC(utcToday.getFullYear(), utcToday.getMonth() - i, 1));
        const monthYear = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        const monthName = d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
        last6Months.push({
          month: monthName,
          monthYear: monthYear,
          sales: monthlySales[monthYear] || 0,
        });
      }
      setSalesData(last6Months);

      // Category distribution
      const categoryMap = Object.fromEntries(
        categories.map((c) => [c.category_id, c.category_name])
      );
      const categoryCount = {};
      products.forEach((p) => {
        const catName = categoryMap[p.category_id] || "Uncategorized";
        categoryCount[catName] = (categoryCount[catName] || 0) + 1;
      });
      const categoryArray = Object.entries(categoryCount).map(
        ([category, count]) => ({ category, count })
      );
      setCategoryData(categoryArray);
    } catch (err) {
      console.error("Dashboard data error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const describeSlice = (cx, cy, radius, startAngle, endAngle) => {
    const startX = cx + radius * Math.cos(startAngle);
    const startY = cy + radius * Math.sin(startAngle);
    const endX = cx + radius * Math.cos(endAngle);
    const endY = cy + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  const pieColors = [
    "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#6b7280", "#3b82f6"
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error-message">
          <span>
            <i className="fas fa-exclamation-circle"></i> {error}
          </span>
          <button onClick={fetchDashboardData}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="header-title">
          <h1>
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </h1>
          <p>Welcome back! Here's what's happening with your store today.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={fetchDashboardData}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <section className="stats-section">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#e6f7ff", color: "#1890ff" }}>
            <i className="fas fa-shopping-cart"></i>
          </div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalOrders)}</h3>
            <p>Total Orders</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#f6ffed", color: "#52c41a" }}>
            <i className="fas fa-rupee-sign"></i>
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(stats.totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#fff7e6", color: "#fa8c16" }}>
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalCustomers)}</h3>
            <p>Customers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#fff1f0", color: "#f5222d" }}>
            <i className="fas fa-box"></i>
          </div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalProducts)}</h3>
            <p>Products</p>
          </div>
        </div>
      </section>

      <div className="charts-row">
        {/* Bar Chart - Fixed 6 months with UTC */}
{/* Sales Trend Bar Chart */}
<div className="chart-card">
  <div className="chart-header">
    <h3>Sales Trend (Last 6 Months)</h3>
  </div>
  <div className="chart-body">
    {salesData.length === 0 ? (
      <div className="empty-state small">
        <i className="fas fa-chart-bar"></i>
        <p>No sales data available</p>
      </div>
    ) : (
      <div className="sales-chart-container">
        <svg
          className="sales-chart"
          viewBox="0 0 650 320"
          preserveAspectRatio="xMidYMid meet"
        >
          {(() => {
            const chartLeft = 70;
            const chartRight = 610;
            const chartTop = 30;
            const chartBottom = 250;
            const chartHeight = chartBottom - chartTop;
            const chartWidth = chartRight - chartLeft;

            const rawMax = Math.max(...salesData.map((d) => d.sales), 0);
            const roundedMax =
              rawMax <= 1000
                ? 1000
                : Math.ceil(rawMax / 1000) * 1000;

            const ySteps = 4;
            const barCount = salesData.length;
            const groupWidth = chartWidth / barCount;
            const barWidth = 42;

            const formatYAxis = (value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${Math.round(value / 1000)}k`;
              return value;
            };

            const formatBarValue = (value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
              return value;
            };

            return (
              <>
                {/* Horizontal Grid Lines + Y Labels */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const value = (roundedMax / ySteps) * i;
                  const y =
                    chartBottom - (value / roundedMax) * chartHeight;

                  return (
                    <g key={i}>
                      <line
                        x1={chartLeft}
                        y1={y}
                        x2={chartRight}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray={i === 0 ? "0" : "4 4"}
                      />
                      <text
                        x={chartLeft - 10}
                        y={y + 4}
                        fontSize="12"
                        fill="#6b7280"
                        textAnchor="end"
                      >
                        {formatYAxis(value)}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {salesData.map((item, i) => {
                  const x =
                    chartLeft + i * groupWidth + (groupWidth - barWidth) / 2;
                  const barHeight =
                    roundedMax === 0
                      ? 0
                      : (item.sales / roundedMax) * chartHeight;
                  const y = chartBottom - barHeight;

                  return (
                    <g key={i}>
                      {/* Value Label */}
                      <text
                        x={x + barWidth / 2}
                        y={item.sales === 0 ? chartBottom - 8 : y - 8}
                        fontSize="12"
                        fill="#4f46e5"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        ₹{formatBarValue(item.sales)}
                      </text>

                      {/* Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="#4f46e5"
                        rx="8"
                        ry="8"
                        style={{
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          e.target.setAttribute("fill", "#6366f1")
                        }
                        onMouseLeave={(e) =>
                          e.target.setAttribute("fill", "#4f46e5")
                        }
                      >
                        <title>
                          {`${item.month}: ₹${item.sales.toLocaleString(
                            "en-IN"
                          )}`}
                        </title>
                      </rect>

                      {/* X Axis Label */}
                      <text
                        x={x + barWidth / 2}
                        y={280}
                        fontSize="13"
                        fill="#374151"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {item.month}
                      </text>
                    </g>
                  );
                })}
              </>
            );
          })()}
        </svg>
      </div>
    )}
  </div>
</div>

        {/* Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Category Distribution</h3>
          </div>
          <div className="chart-body">
            {categoryData.length === 0 ? (
              <div className="empty-state small">
                <i className="fas fa-chart-pie"></i>
                <p>No category data</p>
              </div>
            ) : (
              <div className="pie-chart-container">
                <div className="pie-chart">
                  <svg viewBox="0 0 200 200">
                    {(() => {
                      const total = categoryData.reduce((sum, cat) => sum + cat.count, 0);
                      let startAngle = -Math.PI / 2;
                      return categoryData.map((cat, index) => {
                        const percentage = cat.count / total;
                        const endAngle = startAngle + 2 * Math.PI * percentage;
                        const path = describeSlice(100, 100, 80, startAngle, endAngle);
                        startAngle = endAngle;
                        return (
                          <path
                            key={cat.category}
                            d={path}
                            fill={pieColors[index % pieColors.length]}
                            stroke="white"
                            strokeWidth="2"
                          >
                            <title>{`${cat.category}: ${((cat.count / total) * 100).toFixed(1)}%`}</title>
                          </path>
                        );
                      });
                    })()}
                    <circle cx="100" cy="100" r="35" fill="white" stroke="none" />
                  </svg>
                </div>
                <div className="pie-legend">
                  {categoryData.map((cat, idx) => {
                    const total = categoryData.reduce((sum, c) => sum + c.count, 0);
                    const percent = ((cat.count / total) * 100).toFixed(1);
                    return (
                      <div key={cat.category} className="legend-item">
                        <span
                          className="legend-color"
                          style={{ backgroundColor: pieColors[idx % pieColors.length] }}
                        ></span>
                        <span className="legend-label">{cat.category}</span>
                        <span className="legend-percent">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card recent-orders">
          <div className="card-header">
            <h3><i className="fas fa-clock"></i> Recent Orders</h3>
          </div>
          <div className="card-body">
            {recentOrders.length === 0 ? (
              <div className="empty-state small"><i className="fas fa-inbox"></i><p>No recent orders</p></div>
            ) : (
              <table className="mini-table">
                <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const config = getStatusConfig(order.order_status);
                    return (
                      <tr key={order.order_id}>
                        <td><span className="order-id">#{order.order_id}</span></td>
                        <td><span className="customer-name">{order.customer_name || `Customer #${order.user_id}`}</span></td>
                        <td><span className="order-amount">{formatCurrency(order.total_amount)}</span></td>
                        <td><span className="status-badge" style={{ backgroundColor: config.bg, color: config.color }}>{config.icon} {order.order_status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dashboard-card pending-returns">
          <div className="card-header">
            <h3><i className="fas fa-undo-alt"></i> Pending Returns</h3>
          </div>
          <div className="card-body">
            {pendingReturns.length === 0 ? (
              <div className="empty-state small"><i className="fas fa-check-circle"></i><p>No pending return requests</p></div>
            ) : (
              <ul className="return-list">
                {pendingReturns.map((ret) => (
                  <li key={ret.request_id} className="return-item">
                    <div className="return-info"><span className="return-order">Order #{ret.order_id}</span><span className="return-customer">{ret.customer_name}</span></div>
                    <span className="return-action">{ret.action === "return" ? "Return" : "Replace"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="dashboard-card top-products">
          <div className="card-header">
            <h3><i className="fas fa-star"></i> Top Products</h3>
          </div>
          <div className="card-body">
            {topProducts.length === 0 ? (
              <div className="empty-state small"><i className="fas fa-box-open"></i><p>No product sales data</p></div>
            ) : (
              <table className="mini-table">
                <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.product_id}>
                      <td><div className="product-info"><span className="product-name">{product.product_name}</span></div></td>
                      <td>{formatNumber(product.total_sold)}</td>
                      <td>{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;