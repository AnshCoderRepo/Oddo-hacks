// src/components/layout/Footer.jsx
import React from 'react';

export const Footer = () => {
  return (
    <footer className="app-footer">
      <p>© {new Date().getFullYear()} StackIt Q&A Platform</p>
    </footer>
  );
};

export default Footer;