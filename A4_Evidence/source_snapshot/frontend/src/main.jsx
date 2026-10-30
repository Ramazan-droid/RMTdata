import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Pagination from './Pagination.jsx';
import Infinite from './Infinite.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <header className="top">
      <h1>Mission Archive</h1>
      <p>500 imaginary space missions. Browse them two ways.</p>
      <nav>
        <NavLink to="/pagination">Numbered pages</NavLink>
        <NavLink to="/infinite">Endless scroll</NavLink>
      </nav>
    </header>
    <main>
      <Routes>
        <Route path="/pagination" element={<Pagination />} />
        <Route path="/infinite" element={<Infinite />} />
        <Route path="*" element={<Navigate to="/pagination" replace />} />
      </Routes>
    </main>
  </BrowserRouter>
);
