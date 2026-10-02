/**
 * Split Bill Screen (Split.jsx)
 * ------------------------------
 * Manages group bill splitting with friends, colleagues, and flatmates:
 * 1. Bill picker to choose which expense to divide
 * 2. Add participants (names and shares)
 * 3. Equal or Custom share modes with live remaining unallocated balance counter
 * 4. Per-person Paid / Pending toggle
 * 5. Outstanding receivables summary
 * 6. "Remind" button generating pre-filled WhatsApp (wa.me) payment reminders
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/Skeleton';
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  MessageCircle,
  Share2,
  DollarSign,
  AlertCircle,
  Check,
} from 'lucide-react';

const Split = () => {
  const [searchParams] = useSearchParams();
  const preselectedBillId = searchParams.get('billId');
  const { showToast } = useToast();

  const [splits, setSplits] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' or 'new'

  // New Split Form State
  const [selectedBillId, setSelectedBillId] = useState(preselectedBillId || '');
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' or 'custom'
  const [people, setPeople] = useState([
    { name: 'Self', share: 0, status: 'paid' },
    { name: 'Friend 1', share: 0, status: 'pending' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Existing Splits and User's Bills
  const fetchData = async () => {
    try {
      setLoading(true);
      const [splitsRes, billsRes] = await Promise.all([
        api.get('/splits'),
        api.get('/bills', { params: { limit: 50 } }),
      ]);
      setSplits(splitsRes.data);
      setBills(billsRes.data.bills);

      if (preselectedBillId) {
        setSelectedBillId(preselectedBillId);
        setActiveTab('new');
      }
    } catch (err) {
      console.error('Failed to load splits data:', err);
      showToast('Could not load splits', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [preselectedBillId]);

  // Current selected bill object for new split
  const currentBill = bills.find((b) => b._id === selectedBillId);

  // Re-calculate equal shares when people count or selected bill changes
  useEffect(() => {
    if (splitMode === 'equal' && currentBill && people.length > 0) {
      const total = currentBill.total;
      const baseShare = Math.floor((total / people.length) * 100) / 100;
      const remainder = Math.round((total - baseShare * people.length) * 100);

      setPeople((prev) =>
        prev.map((p, idx) => ({
          ...p,
          share: idx < remainder ? baseShare + 0.01 : baseShare,
        }))
      );
    }
  }, [selectedBillId, people.length, splitMode, currentBill]);

  // Add person
  const handleAddPerson = () => {
    setPeople([
      ...people,
      { name: `Friend ${people.length + 1}`, share: 0, status: 'pending' },
    ]);
  };

  // Remove person
  const handleRemovePerson = (idx) => {
    if (people.length <= 1) {
      showToast('A split requires at least one participant', 'info');
      return;
    }
    setPeople(people.filter((_, i) => i !== idx));
  };

  // Update Person Name or Share
  const handleUpdatePerson = (idx, field, value) => {
    const updated = [...people];
    updated[idx][field] = field === 'share' ? Number(value) : value;
    setPeople(updated);
  };

  // Calculate live remaining unallocated share
  const customSum = people.reduce((acc, curr) => acc + (Number(curr.share) || 0), 0);
  const billTotal = currentBill ? currentBill.total : 0;
  const remainingPaise = Math.round((billTotal - customSum) * 100) / 100;
  const isBalanced = Math.abs(remainingPaise) < 0.05;

  // Toggle Participant Status (Paid/Pending) in an existing split
  const handleToggleStatus = async (splitId, personId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    try {
      const res = await api.patch(`/splits/${splitId}/people/${personId}`, {
        status: newStatus,
      });

      // Update local state
      setSplits((prev) => prev.map((s) => (s._id === splitId ? res.data : s)));
      showToast(
        newStatus === 'paid' ? 'Marked share as paid! 🎉' : 'Marked share as pending.',
        'success'
      );
    } catch (err) {
      console.error('Failed to update participant status:', err);
      showToast('Could not update payment status', 'error');
    }
  };

  // Send WhatsApp Reminder Link
  const handleWhatsAppRemind = (personName, share, storeName) => {
    const text = `Hi ${personName}, your share of the ${storeName || 'shared'} bill is ₹${share}. Please pay via UPI when convenient!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Create Split Form Submission
  const handleCreateSplit = async (e) => {
    e.preventDefault();

    if (!selectedBillId) {
      showToast('Please select a bill to split', 'error');
      return;
    }

    if (splitMode === 'custom' && !isBalanced) {
      showToast(`Custom shares must add up exactly to ₹${billTotal}`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/splits', {
        billId: selectedBillId,
        people,
      });

      showToast('Bill split created successfully! 👥', 'success');
      setSplits([res.data, ...splits]);
      setActiveTab('existing');
    } catch (err) {
      console.error('Failed to create split:', err);
      showToast(err.response?.data?.message || 'Could not create bill split', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total outstanding receivables across all splits
  const totalOutstanding = splits.reduce((sum, s) => sum + (s.outstanding || 0), 0);

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="Split Bills"
        subtitle="Divide expenses & send WhatsApp payment reminders"
        showBack={true}
      />

      {/* Outstanding Summary Hero Card */}
      <div className="p-5 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft mb-5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-lilac-muted">
            Total Outstanding to Collect
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-lilac-text mt-0.5">
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-lilac-cardSubtle text-lilac-accent flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Tabs: Existing Splits vs Create New Split */}
      <div className="flex bg-lilac-surface border border-lilac-border p-1 rounded-2xl mb-5 shadow-sm">
        <button
          onClick={() => setActiveTab('existing')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'existing'
              ? 'bg-lilac-accent text-white shadow-sm'
              : 'text-lilac-muted hover:text-lilac-text'
          }`}
        >
          Active Splits ({splits.length})
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'new'
              ? 'bg-lilac-accent text-white shadow-sm'
              : 'text-lilac-muted hover:text-lilac-text'
          }`}
        >
          + New Split
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : activeTab === 'existing' ? (
        /* Existing Splits List */
        splits.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No active bill splits"
            description="Split a restaurant or shopping bill with friends to track repayments."
            actionLabel="Create First Split"
            onAction={() => setActiveTab('new')}
          />
        ) : (
          <div className="space-y-4">
            {splits.map((split) => {
              const bill = split.billId || {};
              const isSettled = split.outstanding === 0;

              return (
                <div
                  key={split._id}
                  className="p-5 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-lilac-text font-heading">
                        {bill.store || 'Split Expense'}
                      </h3>
                      <p className="text-[11px] text-lilac-muted mt-0.5">
                        {formatDate(bill.date)} • Bill Total: {formatCurrency(bill.total || 0)}
                      </p>
                    </div>

                    <StatusPill variant={isSettled ? 'mint' : 'gold'}>
                      {isSettled ? 'All Paid' : `₹${split.outstanding} Unpaid`}
                    </StatusPill>
                  </div>

                  {/* Participants List */}
                  <div className="space-y-2 pt-2 border-t border-lilac-border/60">
                    {split.people.map((person) => {
                      const isPaid = person.status === 'paid';

                      return (
                        <div
                          key={person._id}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-lilac-bg border border-lilac-border/60 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-lilac-text truncate">
                              {person.name}
                            </span>
                            <span className="font-bold text-lilac-text">
                              ({formatCurrency(person.share)})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Remind via WhatsApp button if pending */}
                            {!isPaid && (
                              <button
                                onClick={() =>
                                  handleWhatsAppRemind(person.name, person.share, bill.store)
                                }
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-bold text-[10px] hover:bg-emerald-600 transition-all shadow-sm"
                                title="Send WhatsApp reminder"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Remind</span>
                              </button>
                            )}

                            {/* Paid / Pending Toggle */}
                            <button
                              onClick={() => handleToggleStatus(split._id, person._id, person.status)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-[10px] transition-all min-h-[32px] ${
                                isPaid
                                  ? 'bg-[#D9F3E6] text-[#0E7A52] border border-[#b7ebd0]'
                                  : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                              }`}
                            >
                              {isPaid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{isPaid ? 'Paid' : 'Pending'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Create New Split Form */
        <form onSubmit={handleCreateSplit} className="bg-lilac-surface border border-lilac-border rounded-3xl p-5 shadow-soft space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
            Configure New Split
          </h3>

          {/* Select Bill */}
          <div>
            <label className="block text-xs font-bold text-lilac-text mb-1.5">
              Choose Bill to Split *
            </label>
            <select
              value={selectedBillId}
              onChange={(e) => setSelectedBillId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text font-semibold focus:outline-none focus:ring-2 focus:ring-lilac-accent/30"
            >
              <option value="">-- Select a Bill --</option>
              {bills.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.store} ({formatCurrency(b.total)}) — {formatDate(b.date)}
                </option>
              ))}
            </select>
          </div>

          {currentBill && (
            <div className="p-3.5 bg-lilac-bg rounded-2xl border border-lilac-border/70 flex justify-between items-center text-xs">
              <span className="font-semibold text-lilac-muted">Total Bill Amount:</span>
              <span className="text-base font-extrabold font-heading text-lilac-text">
                {formatCurrency(currentBill.total)}
              </span>
            </div>
          )}

          {/* Split Mode Selector (Equal vs Custom) */}
          <div className="flex bg-lilac-bg p-1 rounded-2xl border border-lilac-border/60">
            <button
              type="button"
              onClick={() => setSplitMode('equal')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                splitMode === 'equal'
                  ? 'bg-lilac-surface text-lilac-text shadow-sm'
                  : 'text-lilac-muted'
              }`}
            >
              Equal Split
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('custom')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                splitMode === 'custom'
                  ? 'bg-lilac-surface text-lilac-text shadow-sm'
                  : 'text-lilac-muted'
              }`}
            >
              Custom Shares
            </button>
          </div>

          {/* Live Remaining Balance Counter in Custom Mode */}
          {splitMode === 'custom' && currentBill && (
            <div
              className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                isBalanced
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 border border-rose-200'
              }`}
            >
              <span>Remaining to allocate:</span>
              <span className="font-bold">{formatCurrency(remainingPaise)}</span>
            </div>
          )}

          {/* Participants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-lilac-text">
                Participants ({people.length})
              </label>
              <button
                type="button"
                onClick={handleAddPerson}
                className="text-xs font-bold text-lilac-accent hover:underline flex items-center gap-1 p-1 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Person</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {people.map((person, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={person.name}
                    onChange={(e) => handleUpdatePerson(idx, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none"
                  />

                  <div className="relative w-28">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-lilac-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={splitMode === 'equal'}
                      value={person.share || ''}
                      onChange={(e) => handleUpdatePerson(idx, 'share', e.target.value)}
                      className={`w-full pl-6 pr-2 py-2 rounded-xl bg-lilac-bg border border-lilac-border text-xs font-bold text-lilac-text focus:outline-none ${
                        splitMode === 'equal' ? 'opacity-80' : ''
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePerson(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                    aria-label="Remove person"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (splitMode === 'custom' && !isBalanced)}
            className="w-full py-3.5 px-4 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md min-h-[44px] disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Split...' : 'Confirm & Save Split'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Split;
