/**
 * Scan Bill Screen (Scan.jsx)
 * ----------------------------
 * Mobile-first Bill Scanner with:
 * 1. Native camera capture (capture="environment") or gallery image upload
 * 2. Real-time OCR progress bar using Tesseract.js (via utils/ocr.js)
 * 3. Editable pre-filled bill fields (store, date, line items with add/remove, total, category)
 * 4. Client-side auto-category suggestions
 * 5. Interactive "Warranty: 12 months" chip for Electronics & "Return window: 15 days" chip for Shopping
 * 6. Multipart image upload to POST /api/bills with celebratory confetti and toast notification
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { extractBillData } from '../utils/ocr';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatDateInput } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import {
  Camera,
  Upload,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';

// Client-side category keyword map for instant suggestions
const CATEGORY_KEYWORDS = {
  Food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'pizza', 'burger', 'biryani', 'mcdonald', 'kfc', 'starbucks', 'dining'],
  Groceries: ['bigbasket', 'blinkit', 'zepto', 'dmart', 'supermarket', 'kirana', 'spencer', 'more retail', 'vegetables', 'fruits', 'milk', 'grocery'],
  Shopping: ['zudio', 'myntra', 'max', 'shoes', 'shirt', 'jeans', 'dress', 't-shirt', 'trousers', 'clothing', 'apparel', 'fashion', 'zara', 'h&m'],
  Electronics: ['reliance digital', 'croma', 'apple', 'phone', 'laptop', 'headphones', 'tv', 'charger', 'gadget', 'earbuds', 'cable', 'macbook', 'ipad', 'samsung'],
  Bills: ['netflix', 'spotify', 'jio', 'airtel', 'electricity', 'rent', 'recharge', 'broadband', 'water', 'gas', 'bill', 'bescom', 'tneb', 'wifi', 'utility'],
  Travel: ['uber', 'ola', 'irctc', 'makemytrip', 'flight', 'petrol', 'diesel', 'fuel', 'metro', 'toll', 'bus', 'train', 'taxi', 'rapido'],
  Health: ['apollo', 'pharmeasy', 'medplus', 'pharmacy', 'medicine', 'doctor', 'clinic', 'hospital', 'tablet', 'syrup', 'diagnostic'],
};

const suggestCategory = (storeName, items = []) => {
  const store = (storeName || '').toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const w of words) {
      if (store.includes(w)) return cat;
    }
  }

  for (const item of items) {
    const itemName = (item.name || '').toLowerCase();
    for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const w of words) {
        if (itemName.includes(w)) return cat;
      }
    }
  }

  return 'Other';
};

const Scan = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [store, setStore] = useState('');
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [total, setTotal] = useState('');
  const [category, setCategory] = useState('Other');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  // Smart Rules State
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [returnUntil, setReturnUntil] = useState('');

  // Duplicate Bill Detection State
  const [duplicateBill, setDuplicateBill] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Handle Image File selection and trigger OCR extraction
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setIsProcessing(true);
    setOcrProgress(0);
    setOcrStatusText('Initializing OCR engine...');

    try {
      // Call single OCR function from utils/ocr.js
      const extracted = await extractBillData(file, (progress, status) => {
        setOcrProgress(Math.round(progress * 100));
        setOcrStatusText(`Reading bill text... ${Math.round(progress * 100)}%`);
      });

      // Pre-fill extracted fields
      if (extracted.store && extracted.store !== 'Unknown Merchant') {
        setStore(extracted.store);
      }
      if (extracted.date) {
        setDate(formatDateInput(extracted.date));
      }
      if (extracted.total > 0) {
        setTotal(String(extracted.total));
      }
      if (extracted.items && extracted.items.length > 0) {
        setItems(extracted.items);
      }

      // Auto-suggest category
      const autoCat = suggestCategory(extracted.store, extracted.items);
      setCategory(autoCat);

      // Apply initial smart rules based on suggested category
      const baseDate = extracted.date || new Date();
      if (autoCat === 'Electronics') {
        const wDate = new Date(baseDate);
        wDate.setMonth(wDate.getMonth() + 12);
        setWarrantyExpiry(formatDateInput(wDate));
      } else if (autoCat === 'Shopping') {
        const rDate = new Date(baseDate);
        rDate.setDate(rDate.getDate() + 15);
        setReturnUntil(formatDateInput(rDate));
      }

      showToast('Receipt scanned successfully! Review fields below.', 'success');
    } catch (err) {
      console.error('OCR Error:', err);
      showToast('Could not auto-read all details. You can enter them manually!', 'info');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update smart rules when category changes manually
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    const baseDate = date ? new Date(date) : new Date();

    if (newCat === 'Electronics' && !warrantyExpiry) {
      const wDate = new Date(baseDate);
      wDate.setMonth(wDate.getMonth() + 12);
      setWarrantyExpiry(formatDateInput(wDate));
    }

    if (newCat === 'Shopping' && !returnUntil) {
      const rDate = new Date(baseDate);
      rDate.setDate(rDate.getDate() + 15);
      setReturnUntil(formatDateInput(rDate));
    }
  };

  // Item list helpers
  const handleAddItem = () => {
    setItems([...items, { name: '', price: 0 }]);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'price' ? Number(value) : value;
    setItems(updated);

    // If total is empty, sum the items
    if (!total || total === '0') {
      const sum = updated.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
      if (sum > 0) setTotal(String(sum));
    }
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Form Submission with Duplicate Bill Check
  const handleSaveBill = async (bypassDuplicate = false) => {
    if (!store.trim()) {
      showToast('Please enter the store or merchant name', 'error');
      return;
    }
    if (!total || isNaN(Number(total)) || Number(total) <= 0) {
      showToast('Please enter a valid bill total', 'error');
      return;
    }

    // Step 1: Check for duplicate bill unless user confirmed
    if (!bypassDuplicate) {
      try {
        const dupRes = await api.post('/bills/check-duplicate', {
          store: store.trim(),
          date: date || new Date().toISOString(),
          total: Number(total),
        });

        if (dupRes.data.isDuplicate && dupRes.data.duplicateBill) {
          setDuplicateBill(dupRes.data.duplicateBill);
          setShowDuplicateModal(true);
          return;
        }
      } catch (dupErr) {
        console.warn('Could not complete duplicate check:', dupErr.message);
      }
    }

    try {
      setIsSubmitting(true);
      setShowDuplicateModal(false);

      const formData = new FormData();
      formData.append('store', store.trim());
      formData.append('date', date || new Date().toISOString());
      formData.append('total', Number(total));
      formData.append('category', category);
      formData.append('notes', notes);
      formData.append('items', JSON.stringify(items));

      if (warrantyExpiry) {
        formData.append('warrantyExpiry', warrantyExpiry);
      }
      if (returnUntil) {
        formData.append('returnUntil', returnUntil);
      }
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await api.post('/bills', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Celebratory micro-interaction confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FFC857', '#6544C7', '#10B981'],
      });

      showToast('Bill saved successfully! 🧾', 'success');
      navigate('/');
    } catch (err) {
      console.error('Save bill error:', err);
      showToast(err.response?.data?.message || 'Failed to save bill', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveBill(false);
  };

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader title="Scan Receipt" subtitle="Snap or upload a bill to extract details" showBack={true} />

      {/* Upload & Camera Capture Card */}
      <div className="mb-6 bg-lilac-surface border border-lilac-border rounded-3xl p-5 shadow-soft">
        {imagePreview ? (
          <div className="relative rounded-2xl overflow-hidden bg-lilac-bg border border-lilac-border/60 mb-4 max-h-56 flex items-center justify-center">
            <img src={imagePreview} alt="Receipt preview" className="w-full h-full object-contain max-h-56" />
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setImagePreview(null);
              }}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all"
              aria-label="Remove photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-lilac-border rounded-2xl mb-4 bg-lilac-bg/50">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-lilac-cardSubtle text-lilac-accent flex items-center justify-center">
              <ImageIcon className="w-7 h-7" />
            </div>
            <p className="text-xs font-bold text-lilac-text mb-1">Take photo or upload receipt image</p>
            <p className="text-[11px] text-lilac-muted max-w-xs mx-auto">
              Auto-extracts merchant, amount, items & Indian dates with Tesseract.js
            </p>
          </div>
        )}

        {/* OCR Progress Bar */}
        {isProcessing && (
          <div className="mb-4 p-3.5 bg-lilac-bg rounded-2xl border border-lilac-border/80">
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-lilac-accent flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                {ocrStatusText}
              </span>
              <span className="font-bold text-lilac-text">{ocrProgress}%</span>
            </div>
            <div className="w-full h-2 bg-lilac-border/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-lilac-accent to-[#FFC857] transition-all duration-300 rounded-full"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Dual Camera & Gallery Trigger Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#FFC857] text-[#2B2147] font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm min-h-[44px]"
          >
            <Camera className="w-4 h-4" />
            <span>Use Camera</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-lilac-cardSubtle border border-lilac-border text-lilac-text font-bold text-xs hover:bg-lilac-card transition-all active:scale-95 min-h-[44px]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>

          {/* Hidden HTML Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Bill Details Form */}
      <form onSubmit={handleSubmit} className="bg-lilac-surface border border-lilac-border rounded-3xl p-5 shadow-soft space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
          Bill Details
        </h3>

        {/* Merchant / Store */}
        <div>
          <label className="block text-xs font-bold text-lilac-text mb-1.5">Store / Merchant *</label>
          <input
            type="text"
            required
            placeholder="e.g. Zudio, Croma, Swiggy"
            value={store}
            onChange={(e) => {
              setStore(e.target.value);
              // Auto suggest category as user types
              const suggested = suggestCategory(e.target.value, items);
              if (suggested !== 'Other' && category === 'Other') {
                handleCategoryChange(suggested);
              }
            }}
            className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30"
          />
        </div>

        {/* Date and Total in 2 Columns */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-lilac-text mb-1.5">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lilac-text mb-1.5">Total Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs font-bold text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30"
            />
          </div>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-xs font-bold text-lilac-text mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text font-semibold focus:outline-none focus:ring-2 focus:ring-lilac-accent/30"
          >
            <option value="Food">🍔 Food</option>
            <option value="Groceries">🛒 Groceries</option>
            <option value="Shopping">🛍️ Shopping</option>
            <option value="Electronics">⚡ Electronics</option>
            <option value="Bills">📄 Bills & Subscriptions</option>
            <option value="Travel">✈️ Travel</option>
            <option value="Health">💊 Health & Pharmacy</option>
            <option value="Other">🔖 Other</option>
          </select>
        </div>

        {/* Consumer Protection Chips */}
        {category === 'Electronics' && (
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Warranty Protection (12 Months Default)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-blue-700 dark:text-blue-300">Expires:</span>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="px-2 py-1 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 text-xs font-medium"
              />
            </div>
          </div>
        )}

        {category === 'Shopping' && (
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                Return Window (15 Days Default)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-purple-700 dark:text-purple-300">Return Until:</span>
              <input
                type="date"
                value={returnUntil}
                onChange={(e) => setReturnUntil(e.target.value)}
                className="px-2 py-1 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 text-xs font-medium"
              />
            </div>
          </div>
        )}

        {/* Line Items List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-lilac-text">Line Items ({items.length})</label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-bold text-lilac-accent hover:underline flex items-center gap-1 p-1 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={item.price || ''}
                  onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                  className="w-24 px-3 py-2 rounded-xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-lilac-text mb-1.5">Notes (Optional)</label>
          <textarea
            rows="2"
            placeholder="Add warranty notes, size details, or refund terms..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 resize-none"
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-lilac-accent/20 min-h-[44px] disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Save Bill to BillSnap</span>
            </>
          )}
        </button>
      </form>

      {/* Duplicate Bill Warning Dialog */}
      {showDuplicateModal && duplicateBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-lilac-surface border border-amber-300 dark:border-amber-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold font-heading text-lilac-text">
                  Possible duplicate bill
                </h3>
                <p className="text-xs text-lilac-muted">
                  A matching bill was found in your records.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-lilac-muted">Merchant:</span>
                <span className="font-bold text-lilac-text">{duplicateBill.store}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lilac-muted">Bill Amount:</span>
                <span className="font-extrabold text-lilac-text font-heading">
                  ₹{Number(duplicateBill.total).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-lilac-muted">Existing Date:</span>
                <span className="font-medium text-lilac-text">
                  {new Date(duplicateBill.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {duplicateBill.category && (
                <div className="flex justify-between">
                  <span className="text-lilac-muted">Category:</span>
                  <span className="font-semibold text-lilac-accent">{duplicateBill.category}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-lilac-muted leading-relaxed">
              If this is an intentional repeat purchase or separate receipt, you can continue and save anyway.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="py-3 rounded-xl bg-lilac-bg border border-lilac-border text-xs font-bold text-lilac-text hover:bg-lilac-cardSubtle active:scale-95 transition-all min-h-[44px]"
              >
                Review Bill
              </button>
              <button
                type="button"
                onClick={() => handleSaveBill(true)}
                disabled={isSubmitting}
                className="py-3 rounded-xl bg-lilac-accent text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm min-h-[44px]"
              >
                {isSubmitting ? 'Saving...' : 'Save Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scan;
