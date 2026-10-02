/**
 * Empty State Component (EmptyState.jsx)
 * --------------------------------------
 * Friendly empty states displayed when no bills, alerts, or warranties are found.
 */

import React from 'react';

const EmptyState = ({
  icon = '🧾',
  title = 'No bills found',
  description = 'Scan a receipt or add one manually to get started.',
  actionLabel = null,
  actionText = null,
  onAction = null,
  className = '',
}) => {
  const label = actionLabel || actionText;

  const renderIcon = () => {
    if (typeof icon === 'string') {
      return <div className="text-4xl mb-3 select-none animate-bounce">{icon}</div>;
    }
    if (React.isValidElement(icon)) {
      return <div className="mb-3 text-lilac-accent">{icon}</div>;
    }
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComponent = icon;
      return (
        <div className="w-14 h-14 rounded-2xl bg-lilac-cardSubtle border border-lilac-border flex items-center justify-center text-lilac-accent mb-3 shadow-inner">
          <IconComponent className="w-7 h-7 stroke-[1.8]" />
        </div>
      );
    }
    return <div className="text-4xl mb-3 select-none animate-bounce">🧾</div>;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-lilac-surface/60 border border-dashed border-lilac-border rounded-3xl ${className}`}
    >
      {renderIcon()}
      <h3 className="text-base font-bold text-lilac-text mb-1 font-heading">{title}</h3>
      <p className="text-xs text-lilac-muted max-w-xs mb-4 leading-relaxed">{description}</p>
      {label && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold text-white bg-lilac-accent hover:opacity-90 active:scale-95 transition-all rounded-xl shadow-md min-h-[44px]"
        >
          {label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
