import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Import components
import Login from "./components/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Registration from "./components/Registration";
import Sidebar from "./components/sidebar";
import Navbar from "./components/navbar";

// Import pages
import Dashboard from "./pages/dashboard";
import Products from "./pages/products";
import Category from "./pages/Category";
import Orders from "./pages/Orders";
import Billing from "./pages/Billing";
import Customers from "./pages/Customers";
import FAQManagement from "./pages/FAQManagement";
import FinancialDashboard from "./pages/FinancialDashboard";
import WasteTracking from "./pages/WasteTracking";
import LoyaltyOffers from "./pages/LoyaltyOffers";
import StaffManagement from "./pages/StaffManagement";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Stockin from "./pages/Stockin";           // ✅ fixed capitalization
import CurrentStock from "./pages/CurrentStock";

// NEW PAGES
import Returns from "./pages/Returns";
import Notifications from "./pages/Notifications";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    const userData = localStorage.getItem('user');
    return storedAuth === 'true' && userData !== null;
  });
  
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };
  
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);
  
  const handleLogin = (userData) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const AuthenticatedLayout = () => {
    return (
      <div className={`app-container ${darkMode ? 'dark' : ''}`}>
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          user={user}
          onLogout={handleLogout}
        />
        
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          toggleTheme={toggleTheme}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          user={user}
          onLogout={handleLogout}
        />
        
        <main className={`app-content ${sidebarOpen ? "" : "collapsed"}`}>
          <Outlet />
        </main>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        } />
        
        <Route path="/register" element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Registration />
          )
        } />

        {/* Forgot password route (public) with optional type param */}
        <Route path="/forgot-password/:type?" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
        } />
        
        {/* Protected routes (authenticated) */}
        <Route path="/" element={
          isAuthenticated ? (
            <AuthenticatedLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route path="products" element={<Products />} />
          <Route path="category" element={<Category />} />
          <Route path="orders" element={<Orders />} />
          <Route path="returns" element={<Returns />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="billing" element={<Billing />} />
          <Route path="customers" element={<Customers />} />
          <Route path="faq" element={<FAQManagement />} />
          <Route path="reports" element={<FinancialDashboard />} />
          <Route path="waste" element={<WasteTracking />} />
          <Route path="loyalty" element={<LoyaltyOffers />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings onLogout={handleLogout} />} />
          <Route path="stockin" element={<Stockin />} />      {/* ✅ fixed */}
          <Route path="current-stock" element={<CurrentStock />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        
        {/* Catch-all redirect */}
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;