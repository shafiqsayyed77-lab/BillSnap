/**
 * Optical Character Recognition (OCR) Service (ocrService.js)
 * -------------------------------------------------------------
 * Extracts text and structured receipt data (store, date, total, items) from bill images.
 * 
 * Architecture Note:
 * This functionality is encapsulated in ONE exported function: `extractBillData(imageInput)`.
 * If you decide to switch from local Tesseract.js to a cloud OCR API (such as Google Cloud
 * Vision, AWS Textract, or Mindee) in the future, you only need to change the implementation
 * inside this single function without breaking any other parts of the application!
 */

import { createWorker } from 'tesseract.js';

/**
 * Helper to parse dates in Indian formats:
 * - DD/MM/YYYY or DD-MM-YYYY
 * - "12 Oct 2026", "15 October 2026", etc.
 */
export const extractDateFromText = (text) => {
  if (!text) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const numericDate = text.match(/\b([0-3]?\d)[\/\-\.]([0-1]?\d)[\/\-\.]((?:20|19)?\d{2})\b/);
  if (numericDate) {
    let day = parseInt(numericDate[1], 10);
    let month = parseInt(numericDate[2], 10) - 1; // 0-indexed month
    let year = parseInt(numericDate[3], 10);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // "12 Oct 2026" or "12 October 2026"
  const textDate = text.match(/\b([0-3]?\d)\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+((?:20|19)?\d{2})\b/i);
  if (textDate) {
    const day = parseInt(textDate[1], 10);
    const monthStr = textDate[2].substring(0, 3).toLowerCase();
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    let year = parseInt(textDate[3], 10);
    if (year < 100) year += 2000;
    const parsed = new Date(year, months[monthStr], day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

/**
 * Extracts line items ending in a currency price.
 * Example line: "Espresso Coffee  250.00" -> { name: "Espresso Coffee", price: 250 }
 */
export const extractItemsFromText = (lines) => {
  const items = [];
  // Regex matches lines with item text followed by a numeric amount at the end
  const itemRegex = /^(.+?)\s+(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d{2})?)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip header/footer noise
    if (/(subtotal|grand total|total|tax|gst|cgst|sgst|discount|cash|card|upi|change|balance)/i.test(trimmed)) {
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
 * Extracts total bill amount from lines matching total/grand total/net amount.
 */
export const extractTotalFromText = (lines) => {
  let highestAmount = 0;
  let totalExplicit = null;

  // Search in reverse since totals are usually near the bottom of receipts
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();

    // Check for explicit total keywords
    const totalMatch = line.match(/(?:grand\s+total|net\s+amount|total\s+amount|bill\s+total|total)\s*(?:[:=]|\s)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (totalMatch) {
      totalExplicit = parseFloat(totalMatch[1].replace(',', '.'));
      break;
    }

    // Look for any isolated large amount near bottom
    const amountMatch = line.match(/(?:₹|rs\.?|inr)\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (amountMatch) {
      const val = parseFloat(amountMatch[1].replace(',', '.'));
      if (val > highestAmount) highestAmount = val;
    }
  }

  return totalExplicit !== null ? totalExplicit : (highestAmount > 0 ? highestAmount : 0);
};

/**
 * Extracts merchant/store name from the first meaningful lines.
 */
export const extractStoreFromText = (lines) => {
  for (const line of lines) {
    const trimmed = line.trim();
    // Ignore empty lines, barcodes, tax codes, dates
    if (
      trimmed.length > 2 &&
      !trimmed.match(/^[\d\s\-_./:=]+$/) &&
      !/(tax invoice|cash receipt|bill|receipt|gstin|welcome|phone|tel|fssai)/i.test(trimmed)
    ) {
      return trimmed.replace(/[^\w\s&'-]/g, '').trim();
    }
  }
  return 'Unknown Merchant';
};

/**
 * PRIMARY OCR FUNCTION:
 * Single encapsulated function extracting structured receipt data.
 * 
 * @param {string|Buffer} imageInput - Path to image file or image buffer
 * @returns {Promise<{ store: string, date: Date|null, total: number, items: Array, rawText: string }>}
 */
export const extractBillData = async (imageInput) => {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imageInput);
    await worker.terminate();

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const store = extractStoreFromText(lines);
    const date = extractDateFromText(text) || new Date();
    const total = extractTotalFromText(lines);
    const items = extractItemsFromText(lines);

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
    console.error('❌ [OCR Service] Error extracting bill data:', err.message);
    throw new Error(`OCR processing failed: ${err.message}`);
  }
};

export default { extractBillData, extractDateFromText, extractItemsFromText, extractTotalFromText, extractStoreFromText };
