/**
 * Base Card Component (Card.jsx)
 * --------------------------------
 * Reusable container following pastel lilac fintech design guidelines.
 */

import React from 'react';

const Card = ({ children, className = '', onClick = null, hoverable = false }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-lilac-surface border border-lilac-border rounded-3xl p-5 shadow-soft transition-all duration-200 ${
        hoverable ? 'hover:border-lilac-accent/40 active:scale-[0.99] cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
