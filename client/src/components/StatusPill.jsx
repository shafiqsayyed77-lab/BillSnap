/**
 * Status Pill Component (StatusPill.jsx)
 * --------------------------------------
 * Color-coded status badge used for warranties, returns, payment statuses, and deadlines.
 * 
 * Variants:
 * - 'mint': Safe / Active / Paid (bg #D9F3E6, text #0E7A52)
 * - 'gold': Warning / Due Soon (3-7 days)
 * - 'coral': Urgent / Expiring Soon (≤2 days) (bg #FDE3E0, text #A8301F)
 * - 'grey': Expired / Inactive
 */

import React from 'react';

const StatusPill = ({
  variant = null,
  status = null,
  label = null,
  children = null,
  className = '',
  icon = null,
}) => {
  const variantStyles = {
    mint: 'bg-[#D9F3E6] text-[#0E7A52] border-[#b7ebd0] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    gold: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    coral: 'bg-[#FDE3E0] text-[#A8301F] border-[#fac7c2] dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
    grey: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
  };

  // Map status aliases to variant keys
  let effectiveVariant = variant || 'mint';
  if (!variant && status) {
    if (status === 'success' || status === 'completed' || status === 'active') effectiveVariant = 'mint';
    else if (status === 'warning' || status === 'due_soon') effectiveVariant = 'gold';
    else if (status === 'danger' || status === 'overdue') effectiveVariant = 'coral';
    else if (status === 'info') effectiveVariant = 'purple';
    else if (status === 'grey' || status === 'expired') effectiveVariant = 'grey';
  }

  const selectedStyle = variantStyles[effectiveVariant] || variantStyles.mint;
  const content = children ?? label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${selectedStyle} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{content}</span>
    </span>
  );
};

export default StatusPill;
