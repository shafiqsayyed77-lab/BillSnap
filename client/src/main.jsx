/**
 * Frontend Application Entry Point (main.jsx)
 * --------------------------------------------
 * Mounts React to the DOM and injects top-level context providers:
 * 1. BrowserRouter (routing)
 * 2. ThemeProvider (dark / light mode)
 * 3. AuthProvider (user session & JWT)
 * 4. ToastProvider (animated toasts)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
