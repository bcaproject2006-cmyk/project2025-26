// In your main App.jsx or Layout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  return (
    <div className="app">
      <Navbar 
        toggleSidebar={toggleSidebar}
        toggleTheme={toggleTheme}
        darkMode={darkMode}
        sidebarOpen={sidebarOpen}
      />
      
      <div className="main-container">
        <Sidebar sidebarOpen={sidebarOpen} />
        
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="content-wrapper">
            {/* This is where your page content will go */}
            <Outlet /> {/* This renders the current page */}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;