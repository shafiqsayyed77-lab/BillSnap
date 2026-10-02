/**
 * Smart Search Natural Language Query Parser (queryParser.js)
 * -----------------------------------------------------------
 * Converts human natural language queries (e.g., "How much did I spend on shoes this year?")
 * into structured database filter criteria:
 * { keyword, category, dateFrom, dateTo, minAmount, maxAmount }
 * 
 * Beginner Concept:
 * Users don't always think in database SQL/NoSQL terms. They type sentences like:
 * - "Food orders over ₹500"
 * - "Electronics last 6 months"
 * - "How much did I spend on shoes this year?"
 * 
 * This service parses temporal expressions, amounts, categories, and keywords.
 * It also provides an LLM integration stub (parseQueryWithLLM) so that an external AI model
 * (like OpenAI or Gemini) can be plugged in without rewriting business logic!
 */

import { CATEGORY_KEYWORDS } from '../utils/categorizer.js';

// Words that don't contribute to filtering criteria
const FILLER_WORDS = new Set([
  'how', 'much', 'did', 'i', 'spend', 'on', 'in', 'at', 'for', 'the', 'my',
  'a', 'an', 'orders', 'order', 'bills', 'bill', 'receipts', 'receipt',
  'purchases', 'purchase', 'show', 'me', 'find', 'all', 'what', 'was', 'is',
  'get', 'list', 'please', 'tell', 'total', 'of'
]);

/**
 * Deterministic rule-based query parser.
 * 
 * @param {string} text - User's search input string
 * @returns {Object} { keyword, category, dateFrom, dateTo, minAmount, maxAmount }
 */
export const parseQuery = (text = '') => {
  const result = {
    intent: 'spend_query', // 'spend_query' | 'biggest_purchase' | 'highest_category' | 'due_soon' | 'budget_status'
    keyword: null,
    category: null,
    store: null,
    dateFrom: null,
    dateTo: null,
    minAmount: null,
    maxAmount: null,
  };

  if (!text || typeof text !== 'string') return result;

  let query = text.toLowerCase().trim();
  const now = new Date();

  // -------------------------------------------------------------
  // 0. SPECIAL INTENT DETECTION (Ask BillSnap Questions)
  // -------------------------------------------------------------
  if (
    query.includes('biggest purchase') ||
    query.includes('largest purchase') ||
    query.includes('highest purchase') ||
    query.includes('biggest expense') ||
    query.includes('largest bill') ||
    query.includes('biggest bill')
  ) {
    result.intent = 'biggest_purchase';
  } else if (
    query.includes('which category costs me the most') ||
    query.includes('what category costs me the most') ||
    query.includes('category costs me the most') ||
    query.includes('highest category') ||
    query.includes('top category') ||
    query.includes('biggest category') ||
    query.includes('most expensive category')
  ) {
    result.intent = 'highest_category';
  } else if (
    query.includes('due soon') ||
    query.includes('upcoming bills') ||
    query.includes('bills due') ||
    query.includes('bills are due') ||
    query.includes('what is due')
  ) {
    result.intent = 'due_soon';
  } else if (
    query.includes('budget left') ||
    query.includes('remaining budget') ||
    query.includes('budget remaining')
  ) {
    result.intent = 'budget_status';
  }

  // -------------------------------------------------------------
  // 1. DATE / TIME FILTER DETECTION
  // -------------------------------------------------------------

  // "this year"
  if (query.includes('this year')) {
    result.dateFrom = new Date(now.getFullYear(), 0, 1);
    result.dateTo = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    query = query.replace('this year', '');
  }
  // "last year"
  else if (query.includes('last year')) {
    result.dateFrom = new Date(now.getFullYear() - 1, 0, 1);
    result.dateTo = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    query = query.replace('last year', '');
  }
  // "this month"
  else if (query.includes('this month')) {
    result.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    result.dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    query = query.replace('this month', '');
  }
  // "last month"
  else if (query.includes('last month')) {
    result.dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    result.dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    query = query.replace('last month', '');
  }

  // "last N days" or "last N months"
  const lastNDaysMatch = query.match(/last\s+(\d+)\s+days?/);
  if (lastNDaysMatch) {
    const days = parseInt(lastNDaysMatch[1], 10);
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    result.dateFrom = from;
    result.dateTo = new Date(now);
    query = query.replace(lastNDaysMatch[0], '');
  }

  const lastNMonthsMatch = query.match(/last\s+(\d+)\s+months?/);
  if (lastNMonthsMatch) {
    const months = parseInt(lastNMonthsMatch[1], 10);
    const from = new Date(now);
    from.setMonth(from.getMonth() - months);
    result.dateFrom = from;
    result.dateTo = new Date(now);
    query = query.replace(lastNMonthsMatch[0], '');
  }

  // Named months: January, February, etc.
  const monthsMap = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  for (const [monthName, monthIndex] of Object.entries(monthsMap)) {
    const monthRegex = new RegExp(`\\b${monthName}\\b`, 'i');
    if (monthRegex.test(query)) {
      // Determine year: if requested month is after current month, likely last year, otherwise current year
      const year = monthIndex > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
      result.dateFrom = new Date(year, monthIndex, 1);
      result.dateTo = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
      query = query.replace(monthRegex, '');
      break;
    }
  }

  // -------------------------------------------------------------
  // 2. AMOUNT FILTER DETECTION ("over/above/under/below ₹N")
  // -------------------------------------------------------------

  // Over / Above / More than / Greater than
  const minAmountMatch = query.match(/(?:over|above|more than|greater than|min|minimum)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  if (minAmountMatch) {
    result.minAmount = parseFloat(minAmountMatch[1]);
    query = query.replace(minAmountMatch[0], '');
  }

  // Under / Below / Less than
  const maxAmountMatch = query.match(/(?:under|below|less than|max|maximum)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  if (maxAmountMatch) {
    result.maxAmount = parseFloat(maxAmountMatch[1]);
    query = query.replace(maxAmountMatch[0], '');
  }

  // -------------------------------------------------------------
  // 3. CATEGORY DETECTION
  // -------------------------------------------------------------
  const canonicalCategories = [
    'Food', 'Shopping', 'Electronics', 'Groceries', 'Bills', 'Travel', 'Health', 'Other'
  ];

  // Direct category name check
  for (const cat of canonicalCategories) {
    const catRegex = new RegExp(`\\b${cat}\\b`, 'i');
    if (catRegex.test(query)) {
      result.category = cat;
      query = query.replace(catRegex, '');
      break;
    }
  }

  // Keyword to category mapping check (e.g., "shoes" -> Shopping, "headphones" -> Electronics)
  if (!result.category) {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
        if (kwRegex.test(query)) {
          result.category = cat;
          // Keep keyword as search term too, or consume it
          break;
        }
      }
      if (result.category) break;
    }
  }

  // -------------------------------------------------------------
  // 4. KEYWORD EXTRACTION (Strip filler words & punctuation)
  // -------------------------------------------------------------
  const words = query
    .replace(/[₹?,!.:;()#@$^*[\]{}|\\/]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));

  if (words.length > 0) {
    result.keyword = words.join(' ');
  }

  return result;
};

/**
 * Async stub for parsing queries using a Large Language Model (e.g. OpenAI / Google Gemini).
 * Can be swapped in when USE_LLM_PARSER=true.
 */
export const parseQueryWithLLM = async (text) => {
  // TODO: Connect external LLM API (e.g., Gemini 1.5 or OpenAI GPT-4o-mini).
  // Example prompt:
  // "Extract structured financial filters from: '${text}'.
  // Return JSON schema: { keyword, category, dateFrom, dateTo, minAmount, maxAmount }"
  console.log(`[LLM Parser Stub] Falling back to rule-based engine for query: "${text}"`);
  return parseQuery(text);
};

/**
 * Primary exported parser function.
 * Evaluates the USE_LLM_PARSER environment flag to route parsing.
 * 
 * @param {string} text - User query
 * @returns {Promise<Object>} Extracted filters
 */
export const parse = async (text) => {
  if (process.env.USE_LLM_PARSER === 'true') {
    return await parseQueryWithLLM(text);
  }
  return parseQuery(text);
};

export default { parseQuery, parseQueryWithLLM, parse };
