// components/Footer.jsx - with updated customer service links
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Footer.css';

// Icons (keep only needed ones)
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt
} from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const location = useLocation();

  const quickLinks = [
    { name: 'Home', path: '/' },
    { name: 'Categories', path: '/', section: 'categories-section' },
    { name: 'Product', path: '/products' },
    { name: 'Best Deals', path: '/', section: 'offers-section' }
  ];

  // Updated customer service links
  const customerService = [
    { name: 'Contact Us', path: '/help?section=contact' },
    { name: 'FAQ', path: '/help?section=faq' },
    { name: 'Return Policy', path: '/returns' },
    { name: 'Terms of Service', path: '/terms' }
  ];

  const companyInfo = [
    { name: 'About Us', path: '/about' }
  ];

  // Handle navigation for links that target sections on the home page
  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    if (location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: sectionId } });
    }
  };

  return (
    <footer className="footer">
      {/* Main Footer Content */}
      <div className="footer-main container">
        {/* Company Info */}
        <div className="footer-section">
          <div className="footer-logo">
            <span className="footer-logo-icon">🛒</span>
            <h2 className="footer-logo-text">FreshBasket</h2>
          </div>
          <p className="footer-description">
            Your trusted partner for fresh groceries delivered to your doorstep.
            Quality, convenience, and reliability since 2024.
          </p>
          
          {/* Contact Info */}
          <div className="footer-contact">
            <div className="contact-item">
              <FaPhone className="contact-icon" />
              <span>+91 84694 16768</span>
            </div>
            <div className="contact-item">
              <FaEnvelope className="contact-icon" />
              <span>supportfreshbasket@gmail.com</span>
            </div>
            <div className="contact-item">
              <FaMapMarkerAlt className="contact-icon" />
              <span>51 Aashirwad, Adajan, Surat - 395001</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-section">
          <h3 className="footer-heading">Quick Links</h3>
          <ul className="footer-links">
            {quickLinks.map((link, index) => (
              <li key={index}>
                {link.section ? (
                  <a
                    href="/"
                    className="footer-link"
                    onClick={(e) => handleSectionClick(e, link.section)}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link to={link.path} className="footer-link">
                    {link.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Service */}
        <div className="footer-section">
          <h3 className="footer-heading">Customer Service</h3>
          <ul className="footer-links">
            {customerService.map((link, index) => (
              <li key={index}>
                <Link to={link.path} className="footer-link">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div className="footer-section">
          <h3 className="footer-heading">Company</h3>
          <ul className="footer-links">
            {companyInfo.map((link, index) => (
              <li key={index}>
                <Link to={link.path} className="footer-link">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <p className="copyright">
            &copy; {currentYear} FreshBasket. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;