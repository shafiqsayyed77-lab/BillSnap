/**
 * Page Header Component (PageHeader.jsx)
 * --------------------------------------
 * Consistent navigation header at the top of every mobile screen.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PageHeader = ({
  title,
  subtitle = null,
  showBack = false,
  rightAction = null,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <header className={`flex items-center justify-between py-4 px-1 ${className}`}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-lilac-surface border border-lilac-border text-lilac-text hover:bg-lilac-cardSubtle active:scale-95 transition-all shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold font-heading text-lilac-text tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-lilac-muted font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {rightAction && <div className="flex items-center gap-2">{rightAction}</div>}
    </header>
  );
};

export default PageHeader;
