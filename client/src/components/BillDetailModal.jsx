/**
 * Purchase Memory Bill Detail Modal (BillDetailModal.jsx)
 * -------------------------------------------------------
 * Acts as a comprehensive purchase memory record for any bill:
 * - What was bought (detailed itemized list)
 * - Where it was bought (store & category)
 * - When it was bought (relative time & formatted date)
 * - How much was paid (total INR)
 * - Consumer protections (warranty status with days left, return deadline countdown)
 * - Personal notes
 * - Original receipt photo with preview
 * - Associated Split Bill status (if this bill has an active or settled split)
 * - Cross-navigation: "Split Bill", "Price History", "Timeline"
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getCategoryBadge, getDaysRemaining } from '../utils/formatters';
import StatusPill from './StatusPill';
import {
  X,
  Share2,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Receipt,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const BillDetailModal = ({ bill, onClose, onBillDeleted }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [splitData, setSplitData] = useState(null);
  const [loadingSplit, setLoadingSplit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Fetch split details for this bill if one exists
  useEffect(() => {
    if (!bill?._id) return;
    const fetchAssociatedSplit = async () => {
      try {
        setLoadingSplit(true);
        const res = await api.get('/splits');
        const match = res.data.find(
          (s) => s.billId?._id === bill._id || s.billId === bill._id
        );
        if (match) {
          setSplitData(match);
        }
      } catch (err) {
        console.warn('Could not check split for bill:', err.message);
      } finally {
        setLoadingSplit(false);
      }
    };
    fetchAssociatedSplit();
  }, [bill]);

  if (!bill) return null;

  const badge = getCategoryBadge(bill.category);
  const warrantyDays = getDaysRemaining(bill.warrantyExpiry);
  const returnDays = getDaysRemaining(bill.returnUntil);

  const getWarrantyVariant = (days) => {
    if (days < 0) return 'grey';
    if (days < 30) return 'coral';
    if (days <= 90) return 'gold';
    return 'mint';
  };

  const getReturnVariant = (days) => {
    if (days < 0) return 'grey';
    if (days <= 2) return 'coral';
    if (days <= 7) return 'gold';
    return 'mint';
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/bills/${bill._id}`);
      showToast('Bill deleted successfully.', 'success');
      if (onBillDeleted) onBillDeleted(bill._id);
      onClose();
    } catch (err) {
      console.error('Delete bill error:', err);
      showToast('Could not delete bill. Try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-lilac-surface border border-lilac-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-lilac-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${badge.bg}`}>
              <span>{badge.icon}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold font-heading text-lilac-text truncate">
                {bill.store}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-lilac-muted">
                <Calendar className="w-3 h-3 text-lilac-accent" />
                <span>{formatDate(bill.date)}</span>
                <span>•</span>
                <span className="font-semibold text-lilac-accent">{bill.category}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-lilac-muted hover:text-lilac-text hover:bg-lilac-cardSubtle active:scale-95 transition-all"
            aria-label="Close bill memory modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Total & Merchant Highlights */}
          <div className="p-4 rounded-2xl bg-lilac-bg border border-lilac-border/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-lilac-muted uppercase tracking-wider">
                Total Paid
              </span>
              <div className="text-2xl font-extrabold font-heading text-lilac-text mt-0.5">
                {formatCurrency(bill.total)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-lilac-muted uppercase tracking-wider">
                Purchase Record
              </span>
              <div className="text-xs font-bold text-lilac-text mt-0.5">
                Verified Receipt 🧾
              </div>
            </div>
          </div>

          {/* Receipt Image if available */}
          {bill.imageUrl && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
                Original Receipt Photo
              </span>
              <div
                onClick={() => setIsImageExpanded(!isImageExpanded)}
                className={`rounded-2xl overflow-hidden bg-lilac-bg border border-lilac-border cursor-pointer transition-all ${
                  isImageExpanded ? 'max-h-96' : 'max-h-48'
                } flex items-center justify-center relative group`}
              >
                <img
                  src={`http://localhost:5000${bill.imageUrl}`}
                  alt="Original bill receipt"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded-lg opacity-80 group-hover:opacity-100 flex items-center gap-1">
                  <span>{isImageExpanded ? 'Tap to collapse' : 'Tap to expand'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Consumer Protection Deadlines: Warranty & Return */}
          <div className="space-y-2">
            {bill.warrantyExpiry && (
              <div className="p-3.5 rounded-2xl bg-lilac-bg border border-lilac-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-lilac-text">
                      Warranty Coverage
                    </div>
                    <div className="text-[11px] text-lilac-muted truncate">
                      Valid until {formatDate(bill.warrantyExpiry)}
                    </div>
                  </div>
                </div>
                <StatusPill variant={getWarrantyVariant(warrantyDays)}>
                  {warrantyDays < 0
                    ? 'Expired'
                    : warrantyDays === 0
                    ? 'Expires today'
                    : `${warrantyDays}d left`}
                </StatusPill>
              </div>
            )}

            {bill.returnUntil && (
              <div className="p-3.5 rounded-2xl bg-lilac-bg border border-lilac-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-lilac-text">
                      Return Policy Window
                    </div>
                    <div className="text-[11px] text-lilac-muted truncate">
                      Exchange/Return until {formatDate(bill.returnUntil)}
                    </div>
                  </div>
                </div>
                <StatusPill variant={getReturnVariant(returnDays)}>
                  {returnDays < 0
                    ? 'Closed'
                    : returnDays === 0
                    ? 'Closes today'
                    : `${returnDays}d left`}
                </StatusPill>
              </div>
            )}
          </div>

          {/* Line Items */}
          {bill.items && bill.items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
                  Purchased Items ({bill.items.length})
                </h4>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/price-history');
                  }}
                  className="text-[11px] font-bold text-lilac-accent hover:underline flex items-center gap-1"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Price History</span>
                </button>
              </div>

              <div className="divide-y divide-lilac-border/60 bg-lilac-bg rounded-2xl border border-lilac-border overflow-hidden">
                {bill.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 text-xs">
                    <span className="font-semibold text-lilac-text truncate pr-2">
                      {item.name}
                    </span>
                    <span className="font-extrabold text-lilac-text shrink-0 font-heading">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated Split Bill Information */}
          {splitData && (
            <div className="p-3.5 rounded-2xl bg-lilac-bg border border-lilac-border space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-lilac-text font-heading">
                    Split Bill Record
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    splitData.outstanding > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60'
                  }`}
                >
                  {splitData.outstanding > 0
                    ? `₹${splitData.outstanding} Pending`
                    : 'Fully Settled'}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {splitData.people?.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-lilac-muted">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lilac-text">
                        {formatCurrency(p.share)}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          p.status === 'paid' ? 'text-emerald-600' : 'text-amber-500'
                        }`}
                      >
                        {p.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  onClose();
                  navigate('/split');
                }}
                className="w-full mt-1 py-1.5 text-center text-xs font-bold text-lilac-accent hover:underline flex items-center justify-center gap-1"
              >
                <span>Manage Split in Detail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Personal Notes */}
          {bill.notes && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted mb-1.5">
                Notes
              </h4>
              <p className="text-xs text-lilac-muted p-3 bg-lilac-bg rounded-2xl border border-lilac-border leading-relaxed">
                {bill.notes}
              </p>
            </div>
          )}

          {/* Quick Shortcuts to Timeline */}
          <button
            onClick={() => {
              onClose();
              navigate('/timeline');
            }}
            className="w-full p-3 rounded-2xl bg-lilac-bg border border-lilac-border hover:border-lilac-accent/40 active:scale-95 transition-all flex items-center justify-between text-xs text-lilac-text font-bold"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-lilac-accent" />
              <span>View in Bill Timeline</span>
            </div>
            <ChevronRight className="w-4 h-4 text-lilac-muted" />
          </button>
        </div>

        {/* Action Bar */}
        {showDeleteConfirm ? (
          <div className="pt-3 border-t border-lilac-border/60 space-y-2">
            <p className="text-xs font-bold text-rose-500 text-center">
              Are you sure you want to delete this bill record?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 rounded-xl bg-lilac-bg border border-lilac-border text-xs font-bold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 min-h-[44px]"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-lilac-border/60 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const bId = bill._id;
                onClose();
                navigate(`/split?billId=${bId}`);
              }}
              className="py-3 px-3 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-sm min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
              <span>Split Bill</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="py-3 px-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-all active:scale-95 min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillDetailModal;
