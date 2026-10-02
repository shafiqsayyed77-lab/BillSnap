/**
 * Recurring Subscriptions Screen (Recurring.jsx)
 * -----------------------------------------------
 * Tracks recurring subscriptions & bills (OTT, Wi-Fi, recharge, gym, rent).
 * 
 * Features:
 * 1. Monthly Total Card displaying projected monthly recurring expenses
 * 2. List of detected subscriptions with interval label & due-in-days pill
 * 3. "Mark Paid" action button that advances nextDue date by the interval
 * 4. "Add Manually" bottom sheet modal
 */

import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, formatDateInput } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/Skeleton';
import {
  RefreshCw,
  Plus,
  CheckCircle2,
  Calendar,
  X,
  CreditCard,
  Trash2,
} from 'lucide-react';

const Recurring = () => {
  const { showToast } = useToast();

  const [recurringList, setRecurringList] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Manual Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    amount: '',
    interval: 30,
    nextDue: formatDateInput(new Date()),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Recurring Items from API
  const fetchRecurring = async () => {
    try {
      setLoading(true);
      const res = await api.get('/recurring');
      setRecurringList(res.data.recurring || []);
      setMonthlyTotal(res.data.monthlyTotal || 0);
    } catch (err) {
      console.error('Failed to load recurring subscriptions:', err);
      showToast('Could not load recurring bills', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  // Mark Paid Handler
  const handleMarkPaid = async (id, name) => {
    try {
      const res = await api.patch(`/recurring/${id}`, { markPaid: true });
      showToast(`Marked ${name} as paid! Next due date updated.`, 'success');
      // Update local state with the returned updated item
      setRecurringList((prev) =>
        prev.map((item) => (item._id === id ? res.data : item))
      );
    } catch (err) {
      console.error('Error marking paid:', err);
      showToast('Could not update payment status', 'error');
    }
  };

  // Delete Recurring Item
  const handleDeleteRecurring = async (id) => {
    try {
      await api.delete(`/recurring/${id}`);
      showToast('Subscription removed.', 'success');
      setRecurringList((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error('Error deleting subscription:', err);
    }
  };

  // Submit Manual Recurring Form
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.name.trim() || !manualForm.amount) {
      showToast('Please provide a name and amount', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/recurring', {
        name: manualForm.name.trim(),
        amount: Number(manualForm.amount),
        interval: Number(manualForm.interval) || 30,
        nextDue: manualForm.nextDue,
      });

      showToast('Recurring subscription added! 🔄', 'success');
      setIsAddOpen(false);
      setManualForm({
        name: '',
        amount: '',
        interval: 30,
        nextDue: formatDateInput(new Date()),
      });
      fetchRecurring();
    } catch (err) {
      console.error('Failed to add recurring:', err);
      showToast(err.response?.data?.message || 'Could not add recurring bill', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDuePillVariant = (days) => {
    if (days <= 3) return 'coral';
    if (days <= 10) return 'gold';
    return 'mint';
  };

  const formatIntervalLabel = (days) => {
    if (days === 7) return 'Every Week';
    if (days === 30 || days === 28 || days === 31) return 'Monthly';
    if (days === 365) return 'Yearly';
    return `Every ${days} days`;
  };

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="Recurring Bills"
        subtitle="Automatic detection & payment tracking"
        showBack={true}
        rightAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-lilac-accent text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        }
      />

      {/* Monthly Total Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-tr from-[#3A2E5C] to-[#513F80] text-white shadow-soft mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#FFC857]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">
              Projected Monthly Cost
            </span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-medium">
            {recurringList.length} subscriptions
          </span>
        </div>

        <div className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight mt-1 mb-1">
          {formatCurrency(monthlyTotal)}
          <span className="text-xs font-normal text-white/70"> / month</span>
        </div>

        <p className="text-[11px] text-white/60">
          Normalized monthly total across weekly, monthly & annual recurring bills.
        </p>
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : recurringList.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="No recurring subscriptions detected yet"
          description="We scan repeat bills automatically, or you can add subscriptions manually!"
          actionLabel="Add Subscription"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {recurringList.map((item) => (
            <div
              key={item._id}
              className="p-5 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft space-y-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-lilac-text truncate font-heading">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-lilac-muted mt-0.5">
                      {formatIntervalLabel(item.interval)} • Next due: {formatDate(item.nextDue)}
                    </p>
                  </div>
                </div>

                <StatusPill variant={getDuePillVariant(item.daysUntilDue)}>
                  {item.daysUntilDue <= 0 ? 'Due Today' : `Due in ${item.daysUntilDue}d`}
                </StatusPill>
              </div>

              {/* Bottom Action Row: Amount & Mark Paid */}
              <div className="flex items-center justify-between pt-2 border-t border-lilac-border/60">
                <div className="text-base font-extrabold font-heading text-lilac-text">
                  {formatCurrency(item.amount)}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteRecurring(item._id)}
                    className="p-2 text-lilac-muted hover:text-rose-500 rounded-xl transition-all"
                    aria-label="Delete subscription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleMarkPaid(item._id, item.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs hover:bg-emerald-200 active:scale-95 transition-all min-h-[36px]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mark Paid</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Manually Modal Sheet */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-lilac-surface border border-lilac-border rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-lilac-border/60 mb-4">
              <h3 className="text-base font-bold font-heading text-lilac-text">
                Add Recurring Bill
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-2 text-lilac-muted hover:text-lilac-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-lilac-text mb-1.5">
                  Subscription / Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Jio Fiber, Gym, Rent"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1.5">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="649"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                    className="w-full px-3 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs font-bold text-lilac-text focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1.5">Interval</label>
                  <select
                    value={manualForm.interval}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, interval: Number(e.target.value) })
                    }
                    className="w-full px-3 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text font-semibold focus:outline-none"
                  >
                    <option value={7}>Weekly (7 days)</option>
                    <option value={30}>Monthly (30 days)</option>
                    <option value={90}>Quarterly (90 days)</option>
                    <option value={365}>Annual (365 days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-lilac-text mb-1.5">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={manualForm.nextDue}
                  onChange={(e) => setManualForm({ ...manualForm, nextDue: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md min-h-[44px]"
              >
                {isSubmitting ? 'Saving...' : 'Add to Recurring Tracker'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recurring;
