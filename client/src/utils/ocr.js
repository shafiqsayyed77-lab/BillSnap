/**
 * Optical Character Recognition (OCR) Engine (ocr.js)
 * ----------------------------------------------------
 * Runs client-side optical character recognition in the browser using Tesseract.js.
 * 
 * Modular Architecture:
 * This module exports ONE primary function:
 *   `extractBillData(imageFile, onProgress)`
 * returning { store, date, total, items, rawText }.
 * 
 * NOTE FOR BEGINNERS:
 * If you decide to replace client-side Tesseract.js with a dedicated cloud OCR API
 * (such as Google Cloud Vision, Mindee, or AWS Textract), you ONLY need to update
 * the implementation inside this single function. The rest of the React UI components
 * will continue to work without a single line changed!
 */

import { createWorker } from 'tesseract.js';

/**
 * Extracts dates formatted in Indian styles:
 * - DD/MM/YYYY or DD-MM-YYYY
 * - "12 Oct 2026" or "15 October 2026"
 */
const parseDate = (text) => {
  if (!text) return null;

  // 1. Match numeric dates: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const numericMatch = text.match(/\b([0-3]?\d)[\/\-\.]([0-1]?\d)[\/\-\.]((?:20|19)?\d{2})\b/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1; // 0-based month
    let year = parseInt(numericMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Match text dates: "12 Oct 2026", "5 November 2026"
  const textMatch = text.match(/\b([0-3]?\d)\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+((?:20|19)?\d{2})\b/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthStr = textMatch[2].substring(0, 3).toLowerCase();
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    let year = parseInt(textMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, months[monthStr], day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

/**
 * Extracts line items ending in an amount/price.
 * Example: "Paneer Butter Masala  350.00" -> { name: "Paneer Butter Masala", price: 350 }
 */
const parseItems = (lines) => {
  const items = [];
  const itemRegex = /^(.+?)\s+(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip common receipt noise / tax lines
    if (/(subtotal|grand total|total|tax|gst|cgst|sgst|discount|cash|card|upi|balance|change|round off)/i.test(trimmed)) {
      continue;
    }
    const match = trimmed.match(itemRegex);
    if (match) {
      const name = match[1].replace(/[-_.*#]/g, '').trim();
      const price = parseFloat(match[2].replace(',', '.'));
      if (name.length > 2 && price > 0) {
        items.push({ name, price });
      }
    }
  }

  return items;
};

/**
 * Extracts the grand total from lines containing keywords:
 * 'total', 'grand total', 'net amount', 'bill total'.
 */
const parseTotal = (lines) => {
  let highestAmount = 0;
  let explicitTotal = null;

  // Search in reverse from the bottom of the bill
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();

    // Check for explicit total keywords
    const match = line.match(/(?:grand\s+total|net\s+amount|bill\s+total|total\s+amount|total)\s*(?:[:=]|\s)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (match) {
      explicitTotal = parseFloat(match[1].replace(',', '.'));
      break;
    }

    // Keep track of the highest solitary amount found near bottom
    const amtMatch = line.match(/(?:₹|rs\.?|inr)\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (amtMatch) {
      const val = parseFloat(amtMatch[1].replace(',', '.'));
      if (val > highestAmount) highestAmount = val;
    }
  }

  return explicitTotal !== null ? explicitTotal : (highestAmount > 0 ? highestAmount : 0);
};

/**
 * Extracts the store/merchant name from the first meaningful line.
 */
const parseStore = (lines) => {
  for (const line of lines) {
    const trimmed = line.trim();
    // Ignore barcode digits, dates, invoice headers
    if (
      trimmed.length > 2 &&
      !trimmed.match(/^[\d\s\-_./:=]+$/) &&
      !/(tax invoice|cash receipt|bill|receipt|gstin|welcome|phone|tel|fssai|counter)/i.test(trimmed)
    ) {
      return trimmed.replace(/[^\w\s&'-]/g, '').trim();
    }
  }
  return 'Unknown Merchant';
};

/**
 * PRIMARY OCR FUNCTION:
 * Performs OCR on an image file (File or Blob) using Tesseract.js and parses the text into
 * structured bill fields.
 * 
 * @param {File|Blob|string} imageFile - The image to scan
 * @param {Function} [onProgress] - Optional progress callback receiving status & progress (0 to 1)
 * @returns {Promise<{ store: string, date: Date|null, total: number, items: Array, rawText: string }>}
 */
export const extractBillData = async (imageFile, onProgress = null) => {
  let worker = null;

  try {
    // Initialize Tesseract worker
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(m.progress || 0, m.status);
        }
      },
    });

    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const store = parseStore(lines);
    const date = parseDate(text) || new Date();
    const total = parseTotal(lines);
    const items = parseItems(lines);

    return {
      store,
      date,
      total,
      items,
      rawText: text,
    };
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
    console.error('❌ [OCR] Recognition failed:', err);
    throw new Error(`Failed to extract text from bill: ${err.message}`);
  }
};

export default { extractBillData };
