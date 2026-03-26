// components/Layout.jsx
import React, { useEffect, useRef } from 'react';

const Layout = ({ children }) => {
  const mainRef = useRef(null);

  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (navbar && mainRef.current) {
      const navbarHeight = navbar.offsetHeight;
      mainRef.current.style.paddingTop = `${navbarHeight}px`;
    }

    const handleResize = () => {
      if (navbar && mainRef.current) {
        const navbarHeight = navbar.offsetHeight;
        mainRef.current.style.paddingTop = `${navbarHeight}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <main ref={mainRef}>{children}</main>;
};

export default Layout;