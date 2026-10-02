/**
 * Formatting and Utility Helpers (formatters.js)
 * ----------------------------------------------
 * Helper functions for Indian Rupee currency formatting, Indian date formats,
 * and category styling.
 * 
 * Beginner Concept:
 * Intl.NumberFormat('en-IN') handles Indian numbering system grouping (lakhs and crores, e.g. ₹1,50,000).
 */

/**
 * Format a number as Indian Rupees (₹)
 * Example: 25000 -> ₹25,000
 */
export const formatCurrency = (amount, decimals = 0) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format date to standard readable format: "12 Oct 2026"
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date for HTML date input: "YYYY-MM-DD"
 */
export const formatDateInput = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculate remaining days from today until target date.
 */
export const getDaysRemaining = (targetDate) => {
  if (!targetDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Category styling badges with curated fintech colours
 */
export const getCategoryBadge = (category) => {
  const styles = {
    Food: {
      bg: 'bg-amber-100 dark:bg-amber-950/60',
      text: 'text-amber-800 dark:text-amber-300',
      icon: '🍔',
      dot: '#F59E0B',
    },
    Groceries: {
      bg: 'bg-emerald-100 dark:bg-emerald-950/60',
      text: 'text-emerald-800 dark:text-emerald-300',
      icon: '🛒',
      dot: '#10B981',
    },
    Shopping: {
      bg: 'bg-purple-100 dark:bg-purple-950/60',
      text: 'text-purple-800 dark:text-purple-300',
      icon: '🛍️',
      dot: '#8B5CF6',
    },
    Electronics: {
      bg: 'bg-blue-100 dark:bg-blue-950/60',
      text: 'text-blue-800 dark:text-blue-300',
      icon: '⚡',
      dot: '#3B82F6',
    },
    Bills: {
      bg: 'bg-indigo-100 dark:bg-indigo-950/60',
      text: 'text-indigo-800 dark:text-indigo-300',
      icon: '📄',
      dot: '#6366F1',
    },
    Travel: {
      bg: 'bg-cyan-100 dark:bg-cyan-950/60',
      text: 'text-cyan-800 dark:text-cyan-300',
      icon: '✈️',
      dot: '#06B6D4',
    },
    Health: {
      bg: 'bg-rose-100 dark:bg-rose-950/60',
      text: 'text-rose-800 dark:text-rose-300',
      icon: '💊',
      dot: '#F43F5E',
    },
    Other: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      icon: '🔖',
      dot: '#64748B',
    },
  };

  return styles[category] || styles.Other;
};
