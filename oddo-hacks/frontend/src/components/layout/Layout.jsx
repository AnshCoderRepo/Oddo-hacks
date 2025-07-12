// src/components/layout/Layout.jsx
import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;