// pages/Settings.jsx
import React, { useState } from 'react';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    // General Settings
    storeName: 'FreshBasket',
    storeEmail: 'contact@freshbasket.com',
    storePhone: '+1 (555) 123-4567',
    storeAddress: '123 Main Street, Cityville, ST 12345',
    timezone: 'America/New_York',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    lowStockAlerts: true,
    newOrderAlerts: true,
    billingReminders: true,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5,
    
    // Appearance Settings
    theme: 'light',
    primaryColor: '#27ae60',
    sidebarStyle: 'expanded',
    density: 'comfortable',
    
    // Integration Settings
    stripeEnabled: true,
    paypalEnabled: false,
    googleAnalytics: true,
    facebookPixel: false,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveSettings = () => {
    alert('Settings saved successfully!');
    // In real app, you would make an API call here
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        storeName: 'FreshBasket',
        storeEmail: 'contact@freshbasket.com',
        storePhone: '+1 (555) 123-4567',
        storeAddress: '123 Main Street, Cityville, ST 12345',
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        lowStockAlerts: true,
        newOrderAlerts: true,
        billingReminders: true,
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordExpiry: 90,
        loginAttempts: 5,
        theme: 'light',
        primaryColor: '#27ae60',
        sidebarStyle: 'expanded',
        density: 'comfortable',
        stripeEnabled: true,
        paypalEnabled: false,
        googleAnalytics: true,
        facebookPixel: false,
      });
      alert('Settings reset to defaults!');
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    // In real app, you would clear auth token and redirect to login
    alert('Logged out successfully! Redirecting to login...');
    setIsLogoutModalOpen(false);
    // window.location.href = '/login';
  };

  const exportData = () => {
    const data = {
      storeInfo: {
        name: settings.storeName,
        email: settings.storeEmail,
        phone: settings.storePhone,
        address: settings.storeAddress,
      },
      systemSettings: {
        timezone: settings.timezone,
        currency: settings.currency,
        dateFormat: settings.dateFormat,
      },
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freshbasket-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Settings exported successfully!');
  };

  const importSettings = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedSettings = JSON.parse(event.target.result);
        if (window.confirm('Import these settings? This will overwrite current settings.')) {
          setSettings(prev => ({ ...prev, ...importedSettings }));
          alert('Settings imported successfully!');
        }
      } catch (error) {
        alert('Error importing settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  };

  const tabs = [
    { id: 'general', label: 'General', icon: 'fas fa-cog' },
    { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
    { id: 'security', label: 'Security', icon: 'fas fa-shield-alt' },
    { id: 'appearance', label: 'Appearance', icon: 'fas fa-palette' },
    { id: 'integrations', label: 'Integrations', icon: 'fas fa-plug' },
    { id: 'backup', label: 'Backup', icon: 'fas fa-database' },
    { id: 'about', label: 'About', icon: 'fas fa-info-circle' },
  ];

  return (
    <div className="settings-page">
      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="modal-overlay">
          <div className="logout-modal">
            <div className="modal-header">
              <h3><i className="fas fa-sign-out-alt"></i> Confirm Logout</h3>
              <button 
                className="close-modal"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to logout from FreshBasket Admin?</p>
              <p className="warning-text">
                <i className="fas fa-exclamation-triangle"></i> 
                Any unsaved changes will be lost.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-logout-confirm"
                onClick={confirmLogout}
              >
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="settings-header">
        <div className="header-left">
          <h1><i className="fas fa-sliders-h"></i> Settings</h1>
          <p>Configure your store preferences and system settings</p>
        </div>
        <div className="header-right">
          <button className="btn-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <div className="settings-container">
        {/* Sidebar Tabs */}
        <div className="settings-sidebar">
          <div className="sidebar-header">
            <h3><i className="fas fa-tools"></i> Settings</h3>
          </div>
          <nav className="settings-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="user-info-card">
            <div className="user-avatar">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className="user-details">
              <h4>CORIE</h4>
              <p>Administrator</p>
              <p className="user-email">admin@freshbasket.com</p>
            </div>
            <button className="btn-edit-profile">
              <i className="fas fa-edit"></i> Edit Profile
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="settings-content">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <div className="section-header">
                <h2><i className="fas fa-store"></i> Store Information</h2>
                <p>Manage your store details and basic preferences</p>
              </div>
              
              <div className="settings-form">
                <div className="form-group">
                  <label>Store Name *</label>
                  <input
                    type="text"
                    name="storeName"
                    value={settings.storeName}
                    onChange={handleInputChange}
                    placeholder="Enter store name"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Store Email *</label>
                    <input
                      type="email"
                      name="storeEmail"
                      value={settings.storeEmail}
                      onChange={handleInputChange}
                      placeholder="contact@store.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Store Phone</label>
                    <input
                      type="tel"
                      name="storePhone"
                      value={settings.storePhone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Store Address</label>
                  <textarea
                    name="storeAddress"
                    value={settings.storeAddress}
                    onChange={handleInputChange}
                    placeholder="Enter full store address"
                    rows="3"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Timezone</label>
                    <select name="timezone" value={settings.timezone} onChange={handleInputChange}>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select name="currency" value={settings.currency} onChange={handleInputChange}>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="GBP">British Pound (£)</option>
                      <option value="JPY">Japanese Yen (¥)</option>
                      <option value="CAD">Canadian Dollar (C$)</option>
                      <option value="AUD">Australian Dollar (A$)</option>
                      <option value="INR">Indian Rupee (₹)</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Date Format</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="MM/DD/YYYY"
                        checked={settings.dateFormat === 'MM/DD/YYYY'}
                        onChange={handleInputChange}
                      />
                      <span>MM/DD/YYYY (12/31/2024)</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="DD/MM/YYYY"
                        checked={settings.dateFormat === 'DD/MM/YYYY'}
                        onChange={handleInputChange}
                      />
                      <span>DD/MM/YYYY (31/12/2024)</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="YYYY-MM-DD"
                        checked={settings.dateFormat === 'YYYY-MM-DD'}
                        onChange={handleInputChange}
                      />
                      <span>YYYY-MM-DD (2024-12-31)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h2><i className="fas fa-bell"></i> Notification Settings</h2>
                <p>Configure how and when you receive notifications</p>
              </div>
              
              <div className="settings-form">
                <div className="toggle-group">
                  <h3>Notification Channels</h3>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Email Notifications</h4>
                      <p>Receive notifications via email</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={settings.emailNotifications}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>SMS Notifications</h4>
                      <p>Receive notifications via text message</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="smsNotifications"
                        checked={settings.smsNotifications}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Push Notifications</h4>
                      <p>Receive browser push notifications</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="pushNotifications"
                        checked={settings.pushNotifications}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="toggle-group">
                  <h3>Notification Types</h3>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Low Stock Alerts</h4>
                      <p>Get notified when inventory is running low</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="lowStockAlerts"
                        checked={settings.lowStockAlerts}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>New Order Alerts</h4>
                      <p>Get notified when new orders are placed</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="newOrderAlerts"
                        checked={settings.newOrderAlerts}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Billing Reminders</h4>
                      <p>Get reminders for upcoming payments</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="billingReminders"
                        checked={settings.billingReminders}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <div className="section-header">
                <h2><i className="fas fa-shield-alt"></i> Security Settings</h2>
                <p>Manage security preferences and access controls</p>
              </div>
              
              <div className="settings-form">
                <div className="toggle-group">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Two-Factor Authentication</h4>
                      <p>Add an extra layer of security to your account</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="twoFactorAuth"
                        checked={settings.twoFactorAuth}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Session Timeout (minutes)</label>
                  <input
                    type="range"
                    name="sessionTimeout"
                    min="5"
                    max="120"
                    step="5"
                    value={settings.sessionTimeout}
                    onChange={handleInputChange}
                  />
                  <div className="range-value">{settings.sessionTimeout} minutes</div>
                </div>
                
                <div className="form-group">
                  <label>Password Expiry (days)</label>
                  <select name="passwordExpiry" value={settings.passwordExpiry} onChange={handleInputChange}>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                    <option value="0">Never expire</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Maximum Login Attempts</label>
                  <select name="loginAttempts" value={settings.loginAttempts} onChange={handleInputChange}>
                    <option value="3">3 attempts</option>
                    <option value="5">5 attempts</option>
                    <option value="10">10 attempts</option>
                    <option value="0">Unlimited</option>
                  </select>
                </div>
                
                <div className="security-actions">
                  <button className="btn-change-password">
                    <i className="fas fa-key"></i> Change Password
                  </button>
                  <button className="btn-view-logs">
                    <i className="fas fa-history"></i> View Security Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="section-header">
                <h2><i className="fas fa-palette"></i> Appearance Settings</h2>
                <p>Customize the look and feel of your dashboard</p>
              </div>
              
              <div className="settings-form">
                <div className="form-group">
                  <label>Theme</label>
                  <div className="theme-selector">
                    <label className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={settings.theme === 'light'}
                        onChange={handleInputChange}
                        hidden
                      />
                      <div className="theme-preview light-theme">
                        <div className="theme-header"></div>
                        <div className="theme-content"></div>
                      </div>
                      <span>Light</span>
                    </label>
                    
                    <label className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={settings.theme === 'dark'}
                        onChange={handleInputChange}
                        hidden
                      />
                      <div className="theme-preview dark-theme">
                        <div className="theme-header"></div>
                        <div className="theme-content"></div>
                      </div>
                      <span>Dark</span>
                    </label>
                    
                    <label className={`theme-option ${settings.theme === 'auto' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="auto"
                        checked={settings.theme === 'auto'}
                        onChange={handleInputChange}
                        hidden
                      />
                      <div className="theme-preview auto-theme">
                        <div className="theme-header"></div>
                        <div className="theme-content"></div>
                      </div>
                      <span>Auto</span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Primary Color</label>
                  <div className="color-picker">
                    <input
                      type="color"
                      name="primaryColor"
                      value={settings.primaryColor}
                      onChange={handleInputChange}
                    />
                    <span className="color-value">{settings.primaryColor}</span>
                  </div>
                  <div className="color-presets">
                    {['#27ae60', '#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c'].map(color => (
                      <button
                        key={color}
                        className="color-preset"
                        style={{ backgroundColor: color }}
                        onClick={() => setSettings({...settings, primaryColor: color})}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Sidebar Style</label>
                    <select name="sidebarStyle" value={settings.sidebarStyle} onChange={handleInputChange}>
                      <option value="expanded">Expanded</option>
                      <option value="collapsed">Collapsed</option>
                      <option value="floating">Floating</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Display Density</label>
                    <select name="density" value={settings.density} onChange={handleInputChange}>
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                      <option value="spacious">Spacious</option>
                    </select>
                  </div>
                </div>
                
                <div className="preview-section">
                  <h3>Preview</h3>
                  <div className="preview-card" style={{ 
                    borderLeftColor: settings.primaryColor,
                    backgroundColor: settings.theme === 'dark' ? '#2d3748' : 'white',
                    color: settings.theme === 'dark' ? '#e2e8f0' : '#2d3748'
                  }}>
                    <div className="preview-header">
                      <h4>Sample Card</h4>
                      <button className="preview-btn" style={{ backgroundColor: settings.primaryColor }}>
                        Action
                      </button>
                    </div>
                    <p>This is how your interface elements will look with the selected theme.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integration Settings */}
          {activeTab === 'integrations' && (
            <div className="settings-section">
              <div className="section-header">
                <h2><i className="fas fa-plug"></i> Integration Settings</h2>
                <p>Manage third-party integrations and APIs</p>
              </div>
              
              <div className="settings-form">
                <div className="toggle-group">
                  <h3>Payment Gateways</h3>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <div className="integration-header">
                        <div className="integration-logo stripe">
                          <i className="fas fa-credit-card"></i>
                        </div>
                        <div>
                          <h4>Stripe</h4>
                          <p>Credit card processing</p>
                        </div>
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="stripeEnabled"
                        checked={settings.stripeEnabled}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <div className="integration-header">
                        <div className="integration-logo paypal">
                          <i className="fab fa-paypal"></i>
                        </div>
                        <div>
                          <h4>PayPal</h4>
                          <p>Online payment processing</p>
                        </div>
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="paypalEnabled"
                        checked={settings.paypalEnabled}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="toggle-group">
                  <h3>Analytics & Tracking</h3>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <div className="integration-header">
                        <div className="integration-logo google">
                          <i className="fab fa-google"></i>
                        </div>
                        <div>
                          <h4>Google Analytics</h4>
                          <p>Website traffic analytics</p>
                        </div>
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="googleAnalytics"
                        checked={settings.googleAnalytics}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <div className="integration-header">
                        <div className="integration-logo facebook">
                          <i className="fab fa-facebook"></i>
                        </div>
                        <div>
                          <h4>Facebook Pixel</h4>
                          <p>Advertising tracking</p>
                        </div>
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="facebookPixel"
                        checked={settings.facebookPixel}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="api-keys">
                  <h3>API Keys</h3>
                  <div className="api-key-item">
                    <div className="api-key-info">
                      <h4>Stripe API Key</h4>
                      <div className="api-key-value">
                        <code>sk_live_••••••••••••••••••••••••</code>
                      </div>
                    </div>
                    <button className="btn-copy-key">
                      <i className="fas fa-copy"></i> Copy
                    </button>
                  </div>
                  
                  <div className="api-key-item">
                    <div className="api-key-info">
                      <h4>Google Analytics ID</h4>
                      <div className="api-key-value">
                        <code>UA-••••••••-1</code>
                      </div>
                    </div>
                    <button className="btn-copy-key">
                      <i className="fas fa-copy"></i> Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <div className="settings-section">
              <div className="section-header">
                <h2><i className="fas fa-database"></i> Backup & Export</h2>
                <p>Manage data backups and system exports</p>
              </div>
              
              <div className="settings-form">
                <div className="backup-options">
                  <div className="backup-card">
                    <div className="backup-icon">
                      <i className="fas fa-download"></i>
                    </div>
                    <div className="backup-info">
                      <h3>Export Settings</h3>
                      <p>Export current settings to a JSON file</p>
                    </div>
                    <button className="btn-export" onClick={exportData}>
                      <i className="fas fa-file-export"></i> Export Settings
                    </button>
                  </div>
                  
                  <div className="backup-card">
                    <div className="backup-icon">
                      <i className="fas fa-upload"></i>
                    </div>
                    <div className="backup-info">
                      <h3>Import Settings</h3>
                      <p>Import settings from a JSON file</p>
                    </div>
                    <label className="btn-import">
                      <input
                        type="file"
                        accept=".json"
                        onChange={importSettings}
                        hidden
                      />
                      <i className="fas fa-file-import"></i> Import Settings
                    </label>
                  </div>
                </div>
                
                <div className="backup-schedule">
                  <h3>Automatic Backups</h3>
                  <div className="form-group">
                    <label>Backup Frequency</label>
                    <select>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="disabled" selected>Disabled</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Backup Retention</label>
                    <select>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>
                </div>
                
                <div className="backup-history">
                  <h3>Recent Backups</h3>
                  <div className="backup-list">
                    <div className="backup-item">
                      <div className="backup-details">
                        <h4>Manual Backup</h4>
                        <p>2024-06-15 14:30:25</p>
                      </div>
                      <div className="backup-size">1.2 MB</div>
                      <button className="btn-restore">
                        <i className="fas fa-redo"></i> Restore
                      </button>
                    </div>
                    
                    <div className="backup-item">
                      <div className="backup-details">
                        <h4>System Backup</h4>
                        <p>2024-06-14 02:00:00</p>
                      </div>
                      <div className="backup-size">1.1 MB</div>
                      <button className="btn-restore">
                        <i className="fas fa-redo"></i> Restore
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Settings */}
          {activeTab === 'about' && (
            <div className="settings-section">
              <div className="section-header">
                <h2><i className="fas fa-info-circle"></i> About & System Info</h2>
                <p>System information and application details</p>
              </div>
              
              <div className="about-content">
                <div className="app-info-card">
                  <div className="app-logo">
                    <i className="fas fa-shopping-basket"></i>
                  </div>
                  <div className="app-details">
                    <h2>FreshBasket Admin</h2>
                    <p className="app-version">Version 2.1.0</p>
                    <p className="app-description">
                      Complete grocery store management system with inventory, 
                      sales, customer, and staff management capabilities.
                    </p>
                  </div>
                </div>
                
                <div className="system-info">
                  <h3>System Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">App Version</span>
                      <span className="info-value">2.1.0</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Last Updated</span>
                      <span className="info-value">June 15, 2024</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Database Version</span>
                      <span className="info-value">3.4.1</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">License</span>
                      <span className="info-value">Commercial</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Support</span>
                      <span className="info-value">support@freshbasket.com</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Website</span>
                      <span className="info-value">www.freshbasket.com</span>
                    </div>
                  </div>
                </div>
                
                <div className="quick-links">
                  <h3>Quick Links</h3>
                  <div className="links-grid">
                    <a href="#" className="link-card">
                      <i className="fas fa-book"></i>
                      <span>Documentation</span>
                    </a>
                    <a href="#" className="link-card">
                      <i className="fas fa-question-circle"></i>
                      <span>Help Center</span>
                    </a>
                    <a href="#" className="link-card">
                      <i className="fas fa-comments"></i>
                      <span>Contact Support</span>
                    </a>
                    <a href="#" className="link-card">
                      <i className="fas fa-file-contract"></i>
                      <span>Terms of Service</span>
                    </a>
                    <a href="#" className="link-card">
                      <i className="fas fa-shield-alt"></i>
                      <span>Privacy Policy</span>
                    </a>
                    <a href="#" className="link-card">
                      <i className="fas fa-code-branch"></i>
                      <span>Changelog</span>
                    </a>
                  </div>
                </div>
                
                <div className="system-actions">
                  <button className="btn-check-updates">
                    <i className="fas fa-sync-alt"></i> Check for Updates
                  </button>
                  <button className="btn-clear-cache">
                    <i className="fas fa-trash"></i> Clear Cache
                  </button>
                  <button className="btn-system-logs">
                    <i className="fas fa-file-alt"></i> View System Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="settings-actions">
            <button className="btn-reset" onClick={handleResetSettings}>
              <i className="fas fa-undo"></i> Reset to Defaults
            </button>
            <button className="btn-save" onClick={handleSaveSettings}>
              <i className="fas fa-save"></i> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;