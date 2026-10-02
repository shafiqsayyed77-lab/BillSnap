/**
 * Main Application Component (App.jsx)
 * ------------------------------------
 * Configures client-side routing, protected navigation guards, mobile-first responsive
 * constraints (max 480px centered on desktop), and floating bottom navigation.
 * 
 * Beginner Concept:
 * React Router's <Routes> and <Route> map browser URLs to individual screen components.
 * The <ProtectedRoute> wrapper verifies that the user is authenticated with a valid JWT
 * before letting them view sensitive financial data.
 */

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import Screens
import Login from './pages/Login';
import Home from './pages/Home';
import Scan from './pages/Scan';
import Bills from './pages/Bills';
import Expenses from './pages/Expenses';
import Warranties from './pages/Warranties';
import Returns from './pages/Returns';
import Recurring from './pages/Recurring';
import Split from './pages/Split';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Timeline from './pages/Timeline';
import PriceHistory from './pages/PriceHistory';
import EmiTracker from './pages/EmiTracker';

// Import Layout Components
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Route protection wrapper:
 * Redirects unauthenticated visitors to /login
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lilac-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-lilac-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold font-heading text-lilac-muted">Loading BillSnap...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const App = () => {
  return (
    <ErrorBoundary>
      {/* Mobile-first centered desktop wrapper (max-w-[480px]) */}
      <div className="min-h-screen bg-[#F0EAF8] dark:bg-[#0D0A18] flex justify-center selection:bg-lilac-accent selection:text-white">
        <div className="w-full max-w-[480px] min-h-screen bg-lilac-bg relative shadow-2xl flex flex-col overflow-x-hidden border-x border-lilac-border/30">
          <main className="flex-1">
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bills"
                element={
                  <ProtectedRoute>
                    <Bills />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scan"
                element={
                  <ProtectedRoute>
                    <Scan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/warranties"
                element={
                  <ProtectedRoute>
                    <Warranties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/returns"
                element={
                  <ProtectedRoute>
                    <Returns />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recurring"
                element={
                  <ProtectedRoute>
                    <Recurring />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/split"
                element={
                  <ProtectedRoute>
                    <Split />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <Search />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timeline"
                element={
                  <ProtectedRoute>
                    <Timeline />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/price-history"
                element={
                  <ProtectedRoute>
                    <PriceHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emis"
                element={
                  <ProtectedRoute>
                    <EmiTracker />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Floating Pill Bottom Navigation */}
          <BottomNav />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
