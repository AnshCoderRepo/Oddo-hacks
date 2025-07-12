// src/components/layout/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header>
      <Link to="/">StackIt</Link>
      <nav>
        <Link to="/ask">Ask your Question</Link>
      </nav>
    </header>
  );
};