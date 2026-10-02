/**
 * Global Error Boundary (ErrorBoundary.jsx)
 * -----------------------------------------
 * Gracefully catches unexpected runtime rendering errors in React components.
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 Uncaught UI Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-lilac-bg text-lilac-text">
          <div className="max-w-sm w-full bg-lilac-surface border border-lilac-border rounded-3xl p-6 text-center shadow-soft">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold font-heading mb-2">Something went wrong</h2>
            <p className="text-xs text-lilac-muted mb-6 leading-relaxed">
              We encountered an unexpected display glitch. Don't worry, your data and bills are completely safe!
            </p>
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-lilac-accent text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              Reload BillSnap
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
