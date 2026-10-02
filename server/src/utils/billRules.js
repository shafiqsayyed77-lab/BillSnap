/**
 * Bill Business Rules Utility (billRules.js)
 * -------------------------------------------
 * Applies smart business logic and consumer protection defaults to bills.
 * 
 * Rules:
 * 1) Electronics purchases typically include a standard manufacturer warranty.
 *    If no warranty expiry date is provided by the user, we auto-calculate:
 *    purchase date + 12 months (ELECTRONICS_WARRANTY_MONTHS).
 * 
 * 2) Fashion/Shopping purchases in India typically feature a 15-day return policy.
 *    If no return deadline is provided by the user, we auto-calculate:
 *    purchase date + 15 days (SHOPPING_RETURN_DAYS).
 * 
 * Critical Safeguard:
 * We NEVER overwrite values that the user has explicitly entered or adjusted.
 */

// Named constants for policy defaults
export const ELECTRONICS_WARRANTY_MONTHS = 12;
export const SHOPPING_RETURN_DAYS = 15;

/**
 * Applies default warranty and return window rules to a bill object.
 * Mutates or returns the updated bill object.
 * 
 * @param {Object} bill - The bill object (e.g. { store, date, total, category, warrantyExpiry, returnUntil, ... })
 * @returns {Object} - Bill object with smart defaults applied
 */
export const applyBillRules = (bill) => {
  if (!bill) return bill;

  // Base purchase date (default to now if invalid or missing)
  const purchaseDate = bill.date ? new Date(bill.date) : new Date();

  // Rule 1: Electronics gets 12 months warranty if none was set
  if (bill.category === 'Electronics' && !bill.warrantyExpiry) {
    const warrantyDate = new Date(purchaseDate);
    warrantyDate.setMonth(warrantyDate.getMonth() + ELECTRONICS_WARRANTY_MONTHS);
    bill.warrantyExpiry = warrantyDate;
  }

  // Rule 2: Shopping gets 15 days return window if none was set
  if (bill.category === 'Shopping' && !bill.returnUntil) {
    const returnDate = new Date(purchaseDate);
    returnDate.setDate(returnDate.getDate() + SHOPPING_RETURN_DAYS);
    bill.returnUntil = returnDate;
  }

  return bill;
};
