/**
 * Return Countdown Screen (Returns.jsx)
 * --------------------------------------
 * Tracks store return & exchange policy windows with clear countdowns:
 * - Large countdown: "2 days left", "7 days left", "Return window closed", "Closes today!"
 * - Sorted by urgency (fewest days left first)
 * - Color codes:
 *     Coral -> 2 days or less
 *     Gold  -> 3 to 7 days
 *     Mint  -> more than 7 days
 *     Grey  -> expired
 * - Tap to open original bill record directly in BillDetailModal
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatDate, getDaysRemaining, formatCurrency } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/Skeleton';
import BillDetailModal from '../components/BillDetailModal';
import {
  RotateCcw,
  Clock,
  Plus,
  AlertTriangle,
  Receipt,
  Calendar,
  ChevronRight,
} from 'lucide-react';

const Returns = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBill, setActiveBill] = useState(null);

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        setLoading(true);
        const res = await api.get('/bills', { params: { limit: 100 } });
        const withReturns = res.data.bills.filter((b) => b.returnUntil);
        setBills(withReturns);
      } catch (err) {
        console.error('Failed to fetch returns:', err);
        showToast('Could not load returns data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, [showToast]);

  const getCountdownVariant = (daysLeft) => {
    if (daysLeft < 0) return 'grey';
    if (daysLeft <= 2) return 'coral';
    if (daysLeft <= 7) return 'gold';
    return 'mint';
  };

  const getCountdownText = (daysLeft) => {
    if (daysLeft < 0) return 'Return window closed';
    if (daysLeft === 0) return 'Closes today!';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  // Split into active and closed returns, and sort active returns strictly by urgency
  const activeReturns = bills
    .filter((b) => getDaysRemaining(b.returnUntil) >= 0)
    .sort((a, b) => getDaysRemaining(a.returnUntil) - getDaysRemaining(b.returnUntil));

  const expiredReturns = bills
    .filter((b) => getDaysRemaining(b.returnUntil) < 0)
    .sort((a, b) => new Date(b.returnUntil) - new Date(a.returnUntil));

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="Return Countdown"
        subtitle="Live urgency countdown for exchanges & returns"
        showBack={true}
        rightAction={
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-lilac-accent text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : activeReturns.length === 0 && expiredReturns.length === 0 ? (
        <EmptyState
          icon="🛍️"
          title="No return windows recorded"
          description="Shopping and apparel bills automatically receive a 15-day return policy countdown!"
          actionLabel="Scan Shopping Bill"
          onAction={() => navigate('/scan')}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Returns Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-lilac-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-lilac-accent" />
                <span>Active Return Windows ({activeReturns.length})</span>
              </h2>
              <span className="text-[10px] text-lilac-muted">Sorted by urgency</span>
            </div>

            {activeReturns.length === 0 ? (
              <div className="p-5 rounded-3xl bg-lilac-surface border border-lilac-border text-center text-xs text-lilac-muted">
                No active return windows currently open.
              </div>
            ) : (
              activeReturns.map((bill) => {
                const daysLeft = getDaysRemaining(bill.returnUntil);
                const variant = getCountdownVariant(daysLeft);
                const countdownLabel = getCountdownText(daysLeft);
                const isUrgent = daysLeft <= 2;

                return (
                  <div
                    key={bill._id}
                    onClick={() => setActiveBill(bill)}
                    className={`p-5 rounded-3xl bg-lilac-surface border shadow-soft space-y-4 transition-all cursor-pointer hover:border-lilac-accent/40 active:scale-[0.99] group ${
                      isUrgent
                        ? 'border-rose-300 dark:border-rose-900 ring-2 ring-rose-400/20'
                        : 'border-lilac-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base select-none">🛍️</span>
                          <h3 className="text-sm font-bold text-lilac-text font-heading group-hover:text-lilac-accent transition-colors">
                            {bill.store}
                          </h3>
                        </div>
                        <p className="text-[11px] text-lilac-muted">
                          Purchased on {formatDate(bill.date)}
                        </p>
                      </div>

                      <StatusPill variant={variant}>
                        {countdownLabel}
                      </StatusPill>
                    </div>

                    {/* Large Hero Urgency Countdown Block */}
                    <div
                      className={`p-4 rounded-2xl border flex items-center justify-between ${
                        variant === 'coral'
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                          : variant === 'gold'
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                          : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
                            variant === 'coral'
                              ? 'bg-rose-500 text-white'
                              : variant === 'gold'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          <Clock className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div
                            className={`text-lg font-extrabold font-heading ${
                              variant === 'coral'
                                ? 'text-rose-700 dark:text-rose-300'
                                : variant === 'gold'
                                ? 'text-amber-800 dark:text-amber-300'
                                : 'text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {countdownLabel}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-lilac-muted">
                            Return Until: {formatDate(bill.returnUntil)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-lilac-muted">Total</span>
                        <div className="text-base font-extrabold font-heading text-lilac-text">
                          {formatCurrency(bill.total)}
                        </div>
                      </div>
                    </div>

                    {/* Footer link to view original bill */}
                    <div className="flex items-center justify-between text-xs text-lilac-accent font-bold pt-1 border-t border-lilac-border/60">
                      <span>Tap to view original bill details</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Expired / Closed Returns Section */}
          {expiredReturns.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-lilac-muted px-1">
                Closed Return Windows ({expiredReturns.length})
              </h2>

              {expiredReturns.map((bill) => (
                <div
                  key={bill._id}
                  onClick={() => setActiveBill(bill)}
                  className="p-4 rounded-2xl bg-lilac-surface/70 border border-lilac-border/70 opacity-75 hover:opacity-100 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-lilac-text font-heading">{bill.store}</h4>
                    <span className="text-[11px] text-lilac-muted">
                      Closed on {formatDate(bill.returnUntil)}
                    </span>
                  </div>
                  <div className="text-right">
                    <StatusPill variant="grey">Return window closed</StatusPill>
                    <div className="text-xs font-bold text-lilac-text mt-1">
                      {formatCurrency(bill.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bill Detail Modal */}
      {activeBill && (
        <BillDetailModal
          bill={activeBill}
          onClose={() => setActiveBill(null)}
          onBillDeleted={(deletedId) => {
            setBills((prev) => prev.filter((b) => b._id !== deletedId));
            setActiveBill(null);
          }}
        />
      )}
    </div>
  );
};

export default Returns;
