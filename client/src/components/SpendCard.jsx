/**
 * Spend Card Component (SpendCard.jsx)
 * ------------------------------------
 * High-impact signature financial dashboard component featuring:
 * 1. Spend total in Indian Rupees (₹)
 * 2. Gold budget progress bar (#FFC857)
 * 3. Proportional category split visual bar
 * 4. Signature torn-receipt zigzag bottom edge (CSS gradient teeth)
 */

import React from 'react';
import { formatCurrency } from '../utils/formatters';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

const SpendCard = ({
  total = 0,
  budget = 25000,
  percentUsed = 0,
  categoryBreakdown = [],
  monthLabel = 'This Month',
}) => {
  // Cap visual progress at 100% for bar, but display exact percentage
  const clampedProgress = Math.min(100, Math.max(0, percentUsed));
  const remaining = Math.max(0, budget - total);
  const isOverBudget = total > budget;
  const isNearLimit = percentUsed >= 80 && !isOverBudget;

  // Category color mapping for the proportional split bar
  const categoryColors = {
    Food: '#F59E0B',        // amber
    Groceries: '#10B981',   // emerald
    Shopping: '#8B5CF6',    // purple
    Electronics: '#3B82F6', // blue
    Bills: '#6366F1',       // indigo
    Travel: '#06B6D4',      // cyan
    Health: '#F43F5E',      // rose
    Other: '#94A3B8',       // slate
  };

  return (
    <div className="relative mb-6">
      {/* Receipt Card with torn jagged bottom edge */}
      <div className="receipt-zigzag-bottom bg-lilac-surface border border-lilac-border rounded-t-3xl p-6 shadow-soft transition-all duration-300">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none">🧾</span>
            <span className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
              {monthLabel}
            </span>
          </div>

          {/* Budget Health Badge */}
          {isOverBudget ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FDE3E0] text-[#A8301F] border border-[#fac7c2]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Exceeded
            </span>
          ) : isNearLimit ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              <AlertTriangle className="w-3.5 h-3.5" />
              {Math.round(percentUsed)}% Used
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#D9F3E6] text-[#0E7A52] border border-[#b7ebd0]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              On Track
            </span>
          )}
        </div>

        {/* Big Monetary Spend Display */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-lilac-muted mb-1">Total Expenses</div>
          <div className="text-3xl sm:text-4xl font-extrabold font-heading text-lilac-text tracking-tight flex items-baseline gap-1">
            <span>{formatCurrency(total)}</span>
            <span className="text-xs font-normal text-lilac-muted">
              / {formatCurrency(budget)}
            </span>
          </div>
        </div>

        {/* Gold Budget Progress Bar */}
        <div className="space-y-1.5 mb-5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-lilac-muted">Budget Spent</span>
            <span className="font-bold text-lilac-text">{percentUsed}%</span>
          </div>
          <div className="w-full h-3 bg-lilac-border/60 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isOverBudget
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-[#FFD875] to-[#FFC857] shadow-sm'
              }`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-lilac-muted pt-0.5">
            <span>{isOverBudget ? 'Over by ' + formatCurrency(total - budget) : 'Left: ' + formatCurrency(remaining)}</span>
            <span>Target: {formatCurrency(budget)}</span>
          </div>
        </div>

        {/* Proportional Category Split Bar */}
        {categoryBreakdown && categoryBreakdown.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-lilac-border/60">
            <div className="text-[11px] font-semibold text-lilac-muted uppercase tracking-wider">
              Category Distribution
            </div>
            {/* Multi-segmented colored horizontal bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-lilac-border/40">
              {categoryBreakdown.map((cat, idx) => {
                const widthPct = Math.max(3, cat.percentage);
                const color = categoryColors[cat.category] || categoryColors.Other;
                return (
                  <div
                    key={idx}
                    title={`${cat.category}: ${cat.percentage}%`}
                    style={{ width: `${widthPct}%`, backgroundColor: color }}
                    className="h-full transition-all duration-500"
                  />
                );
              })}
            </div>

            {/* Quick mini legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {categoryBreakdown.slice(0, 4).map((cat, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-lilac-text">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: categoryColors[cat.category] || categoryColors.Other }}
                  />
                  <span>{cat.category}</span>
                  <span className="text-lilac-muted">({cat.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpendCard;
