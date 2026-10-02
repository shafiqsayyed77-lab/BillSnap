/**
 * Bill Categorizer Utility (categorizer.js)
 * -----------------------------------------
 * Automatically assigns a category (Food, Groceries, Shopping, Electronics, Bills, Travel, Health, Other)
 * to a bill by analyzing the store name and line item names.
 * 
 * Beginner Concept:
 * Rule-based classification inspects the merchant name first. If no match is found,
 * it searches the purchased item names against keyword lists. If nothing matches,
 * it safely defaults to 'Other'.
 */

// Central configuration map of categories and their associated keywords
export const CATEGORY_KEYWORDS = {
  Food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'pizza', 'burger', 'biryani', 'mcdonald', 'kfc', 'starbucks', 'dining'],
  Groceries: ['bigbasket', 'blinkit', 'zepto', 'dmart', 'supermarket', 'kirana', 'spencer', 'more retail', 'vegetables', 'fruits', 'milk', 'grocery'],
  Shopping: ['zudio', 'myntra', 'max', 'shoes', 'shirt', 'jeans', 'dress', 't-shirt', 'trousers', 'clothing', 'apparel', 'fashion', 'zara', 'h&m'],
  Electronics: ['reliance digital', 'croma', 'apple', 'phone', 'laptop', 'headphones', 'tv', 'charger', 'gadget', 'earbuds', 'cable', 'macbook', 'ipad', 'samsung'],
  Bills: ['netflix', 'spotify', 'jio', 'airtel', 'electricity', 'rent', 'recharge', 'broadband', 'water', 'gas', 'bill', 'bescom', 'tneb', 'wifi', 'utility'],
  Travel: ['uber', 'ola', 'irctc', 'makemytrip', 'flight', 'petrol', 'diesel', 'fuel', 'metro', 'toll', 'bus', 'train', 'taxi', 'rapido'],
  Health: ['apollo', 'pharmeasy', 'medplus', 'pharmacy', 'medicine', 'doctor', 'clinic', 'hospital', 'tablet', 'syrup', 'diagnostic'],
};

/**
 * Categorize a bill based on store name and item descriptions.
 * 
 * @param {string} store - Name of the store or merchant
 * @param {Array<{name: string, price?: number}>} items - List of items bought
 * @returns {string} - Matching category or 'Other'
 */
export const categorize = (store = '', items = []) => {
  const normalizedStore = (store || '').toLowerCase().trim();

  // Step 1: Check store name against category keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedStore.includes(keyword)) {
        return category;
      }
    }
  }

  // Step 2: If store didn't match, check item names
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const itemName = (item.name || '').toLowerCase().trim();
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
          if (itemName.includes(keyword)) {
            return category;
          }
        }
      }
    }
  }

  // Step 3: Default fallback
  return 'Other';
};
