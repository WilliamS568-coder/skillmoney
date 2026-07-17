import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Or whatever your global CSS import is
import { BrowserRouter } from 'react-router-dom'; // 1. Import this

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Wrap App inside BrowserRouter */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);