// components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./navbar.css";

const Navbar = ({ toggleSidebar, sidebarOpen, onLogout }) => {

  const navigate = useNavigate();
  const location = useLocation();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Helper to get user info from either localStorage or sessionStorage
  const getUserInfo = () => {
    // Try sessionStorage first (session-only login), then localStorage (remember me)
    const storages = [sessionStorage, localStorage];
    for (const storage of storages) {
      const userStr = storage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
          // ignore
        }
      }
    }
    return null;
  };

  const user = getUserInfo();
  const userName = user?.name || "Admin";
  const userEmail = user?.email || "admin@freshbasket.com";
  const userRole = user?.role || "Administrator";

  /* Fetch notifications from API */
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/notifications");
        const data = await res.json();
        const formatted = data
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 4)
          .map(n => ({
            id: n.notification_id,
            order_id: n.order_id,
            title: n.customer_name,
            text: n.message,
            time: new Date(n.created_at).toLocaleString(),
            unread: n.status === "unread"
          }));
        setNotifications(formatted);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    fetchNotifications();
  }, []);

  /* Close dropdowns when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Breadcrumb */
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === "/dashboard") return ["Dashboard"];
    if (path === "/products") return ["Products", "Inventory"];
    if (path === "/orders") return ["Sales", "Orders"];
    if (path === "/customers") return ["", ""];
    if (path === "/settings") return ["System", "Settings"];
    return ["Dashboard"];
  };

  const breadcrumb = getBreadcrumb();
  const unreadCount = notifications.filter(n => n.unread).length;

  /* Logout */
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.clear();
      sessionStorage.clear();
    }
    navigate("/login");
  };

  return (
    <nav className="navbar">
      {/* LEFT */}
      <div className="navbar-left">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <i className={`fas fa-${sidebarOpen ? "times" : "bars"}`}></i>
        </button>
        <div className="navbar-breadcrumb">
          {breadcrumb.map((item, index) => (
            <div key={index} className="breadcrumb-item">
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              <span className="breadcrumb-current">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="navbar-right">
        {/* Notifications */}
        <div className="notifications" ref={notificationRef}>
          <button
            className="notification-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          {notificationsOpen && (
            <div className="notifications-dropdown active">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className="notification-item"
                  onClick={() => {
                    navigate("/orders", { state: { orderId: n.order_id } });
                    setNotificationsOpen(false);
                  }}
                >
                  <div className="notification-title">{n.title}</div>
                  <div className="notification-text">{n.text}</div>
                  <div className="notification-time">{n.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* USER MENU */}
        <div className="user-menu" ref={userMenuRef}>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userRole}</span>
          </div>
          <div
            className="user-avatar"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <i className="fas fa-user-circle"></i>
          </div>
          {userMenuOpen && (
            <div className="user-dropdown active">
              <button
                className="dropdown-menu-item"
                onClick={() => {
                  navigate("/profile");
                  setUserMenuOpen(false);
                }}
              >
                <i className="fas fa-user"></i>
                My Profile
              </button>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-menu-item logout-item"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;