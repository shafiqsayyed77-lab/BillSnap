/**
 * EMI Tracker Screen (EmiTracker.jsx)
 * -----------------------------------
 * Comprehensive Equated Monthly Installment (EMI) loan tracker:
 * - Separate from indefinite recurring subscriptions
 * - Fixed tenures, payment history, completed vs remaining installments
 * - Live progress bar, automated calculations, and next due date advancing
 * - Quick "Mark Paid" and "Undo Payment" actions
 * - Dashboard commitments summary & urgency filtering
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/Skeleton';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  CreditCard,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Store,
  ChevronRight,
  RotateCcw,
  Edit2,
  Trash2,
  X,
  TrendingDown,
  Layers,
  Percent,
} from 'lucide-react';

const CATEGORIES = [
  'Electronics',
  'Shopping',
  'Appliances',
  'Vehicles',
  'Education',
  'Personal Loan',
  'Home',
  'Bills',
  'Other',
];

const EmiTracker = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [emis, setEmis] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'due_soon', 'completed', 'all'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmi, setEditingEmi] = useState(null);
  const [detailEmi, setDetailEmi] = useState(null);
  const [deleteConfirmEmi, setDeleteConfirmEmi] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    lender: '',
    totalAmount: '',
    monthlyAmount: '',
    tenureMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    dueDay: 5,
    category: 'Electronics',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchEMIs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/emis');
      setEmis(res.data.emis || []);
      setSummary(res.data.summary || null);

      // If detail modal is open, refresh its data
      if (detailEmi) {
        const updatedDetail = res.data.emis.find((e) => e._id === detailEmi._id);
        if (updatedDetail) setDetailEmi(updatedDetail);
      }
    } catch (err) {
      console.error('Failed to load EMIs:', err);
      showToast('Could not load EMI loans.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEMIs();
  }, []);

  // Auto-calculate monthly EMI when total or tenure changes
  const handleAmountOrTenureChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    const numTotal = Number(field === 'totalAmount' ? value : updated.totalAmount);
    const numTenure = Number(field === 'tenureMonths' ? value : updated.tenureMonths);

    if (numTotal > 0 && numTenure > 0 && (field === 'totalAmount' || field === 'tenureMonths')) {
      updated.monthlyAmount = Math.round(numTotal / numTenure);
    }
    setFormData(updated);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingEmi(null);
    setFormData({
      name: '',
      lender: '',
      totalAmount: '',
      monthlyAmount: '',
      tenureMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      dueDay: 5,
      category: 'Electronics',
      notes: '',
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emi) => {
    setEditingEmi(emi);
    setFormData({
      name: emi.name,
      lender: emi.lender,
      totalAmount: emi.totalAmount,
      monthlyAmount: emi.monthlyAmount,
      tenureMonths: emi.tenureMonths,
      startDate: emi.startDate ? new Date(emi.startDate).toISOString().split('T')[0] : '',
      dueDay: emi.dueDay || 5,
      category: emi.category || 'Electronics',
      notes: emi.notes || '',
    });
    setShowAddModal(true);
  };

  // Submit Add or Edit with consumer-grade validation
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter the product or loan name.', 'error');
      return;
    }
    if (!formData.lender.trim()) {
      showToast('Please enter the store, bank, or lender name.', 'error');
      return;
    }

    const numTotal = Number(formData.totalAmount);
    if (isNaN(numTotal) || numTotal <= 0) {
      showToast('Total financed amount must be greater than ₹0.', 'error');
      return;
    }

    const numTenure = Number(formData.tenureMonths);
    if (isNaN(numTenure) || numTenure < 1 || numTenure > 120) {
      showToast('Loan tenure must be between 1 and 120 months.', 'error');
      return;
    }

    const numMonthly = Number(formData.monthlyAmount);
    if (isNaN(numMonthly) || numMonthly <= 0) {
      showToast('Monthly EMI amount must be greater than ₹0.', 'error');
      return;
    }

    const numDueDay = Number(formData.dueDay);
    if (isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) {
      showToast('Due day must be between day 1 and day 31.', 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingEmi) {
        await api.patch(`/emis/${editingEmi._id}`, formData);
        showToast('EMI updated successfully! 💳', 'success');
      } else {
        await api.post('/emis', formData);
        showToast('New EMI tracker added! 🎉', 'success');
      }
      setShowAddModal(false);
      setEditingEmi(null);
      await fetchEMIs();
    } catch (err) {
      console.error('Failed to save EMI:', err);
      showToast(err.response?.data?.message || 'Could not save EMI.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Mark Installment Paid
  const handleMarkPaid = async (emiId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.post(`/emis/${emiId}/pay`, {});
      showToast(res.data.message || 'Installment marked as paid! 🎉', 'success');
      await fetchEMIs();
    } catch (err) {
      console.error('Failed to record payment:', err);
      showToast(err.response?.data?.message || 'Failed to record payment.', 'error');
    }
  };

  // Undo Latest Payment
  const handleUndoPayment = async (emiId) => {
    try {
      const res = await api.post(`/emis/${emiId}/undo-pay`, {});
      showToast(res.data.message || 'Payment reverted.', 'info');
      await fetchEMIs();
    } catch (err) {
      console.error('Failed to undo payment:', err);
      showToast(err.response?.data?.message || 'Failed to undo payment.', 'error');
    }
  };

  // Delete EMI with accessible confirmation modal
  const handleDeleteEMI = (emi) => {
    setDeleteConfirmEmi(emi);
  };

  const executeDeleteEMI = async () => {
    if (!deleteConfirmEmi) return;
    try {
      setIsDeleting(true);
      await api.delete(`/emis/${deleteConfirmEmi._id}`);
      showToast(`'${deleteConfirmEmi.name}' EMI tracker deleted.`, 'info');
      setDeleteConfirmEmi(null);
      setDetailEmi(null);
      await fetchEMIs();
    } catch (err) {
      console.error('Failed to delete EMI:', err);
      showToast(err.response?.data?.message || 'Could not delete EMI.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter EMIs by activeTab
  const filteredEmis = emis.filter((e) => {
    if (activeTab === 'active') return !e.isCompleted;
    if (activeTab === 'due_soon') return !e.isCompleted && e.daysUntilDue !== null && e.daysUntilDue <= 3;
    if (activeTab === 'completed') return e.isCompleted;
    return true; // 'all'
  });

  return (
    <div className="min-h-screen bg-lilac-bg pb-36 max-w-md mx-auto px-4 pt-4 sm:pt-6">
      {/* Page Header */}
      <PageHeader
        title="EMI Tracker"
        subtitle="Manage loan commitments & installment milestones"
        backTo="/"
        action={
          <button
            onClick={handleOpenAdd}
            className="p-2.5 rounded-2xl bg-[#FFC857] text-[#2B2147] font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 active:scale-95 transition-all min-h-[44px] min-w-[44px]"
            aria-label="Add new EMI"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add EMI</span>
          </button>
        }
      />

      {/* Dashboard Commitments Summary Banner */}
      {summary && (
        <div className="mb-6 p-5 rounded-3xl bg-gradient-to-br from-[#2D214F] via-[#35255E] to-[#442F79] text-white shadow-lg shadow-[#2D214F]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#8B5CF6]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#FFC857]">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                EMI Commitments
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFC857]/20 text-[#FFD875] border border-[#FFC857]/30">
              {summary.activeCount} Active Loan{summary.activeCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider block">
                Monthly Commitment
              </span>
              <span className="text-lg font-black text-white mt-0.5 block">
                {formatCurrency(summary.totalMonthlyCommitment)}
              </span>
              <span className="text-[10px] text-white/50">per month</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider block">
                Total Remaining
              </span>
              <span className="text-lg font-black text-[#FFD875] mt-0.5 block">
                {formatCurrency(summary.totalRemainingAmount)}
              </span>
              <span className="text-[10px] text-white/50">across all EMIs</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex bg-lilac-surface p-1 rounded-2xl mb-6 border border-lilac-border gap-1 overflow-x-auto no-scrollbar">
        {[
          { key: 'active', label: `Active (${emis.filter((e) => !e.isCompleted).length})` },
          { key: 'due_soon', label: `Due Soon (${emis.filter((e) => !e.isCompleted && e.daysUntilDue !== null && e.daysUntilDue <= 3).length})` },
          { key: 'completed', label: `Completed (${emis.filter((e) => e.isCompleted).length})` },
          { key: 'all', label: `All (${emis.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === tab.key
                ? 'bg-lilac-accent text-white shadow-sm'
                : 'text-lilac-muted hover:text-lilac-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* EMI Cards List */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredEmis.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={
            activeTab === 'due_soon'
              ? 'No EMIs due soon'
              : activeTab === 'completed'
              ? 'No completed EMIs yet'
              : 'No EMI loans found'
          }
          description="Track high-value purchases, installment progress, and loan end dates with automatic calculations."
          actionText="+ Add Your First EMI"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="space-y-4">
          {filteredEmis.map((emi) => (
            <div
              key={emi._id}
              onClick={() => setDetailEmi(emi)}
              className="p-5 rounded-3xl bg-lilac-surface border border-lilac-border shadow-xs hover:border-lilac-accent/40 active:scale-[0.99] transition-all cursor-pointer relative"
            >
              {/* Header: Name, Lender & Status Pill */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-lilac-text truncate">{emi.name}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-lilac-card text-lilac-muted border border-lilac-border">
                      {emi.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-lilac-muted">
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{emi.lender}</span>
                  </div>
                </div>

                {/* Status Pill */}
                {emi.status === 'completed' ? (
                  <StatusPill status="success" label="Completed" />
                ) : emi.status === 'overdue' ? (
                  <StatusPill status="danger" label="Overdue" />
                ) : emi.status === 'due_soon' ? (
                  <StatusPill status="warning" label={`Due in ${emi.daysUntilDue}d`} />
                ) : (
                  <StatusPill status="info" label={`Due in ${emi.daysUntilDue}d`} />
                )}
              </div>

              {/* Monthly Amount & Financed Amount */}
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <span className="text-xl font-extrabold text-lilac-text">
                    {formatCurrency(emi.monthlyAmount)}
                  </span>
                  <span className="text-xs text-lilac-muted font-medium"> / month</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-lilac-muted">Total Financed: </span>
                  <span className="text-xs font-bold text-lilac-text">
                    {formatCurrency(emi.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-lilac-muted mb-1.5">
                  <span className="flex items-center gap-1 text-lilac-text">
                    <Clock className="w-3.5 h-3.5 text-lilac-accent" />
                    <span>
                      {emi.monthsCompleted} of {emi.totalTenure} installments
                    </span>
                  </span>
                  <span className="font-bold text-lilac-accent">
                    {emi.completionPercentage}% complete
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-lilac-bg overflow-hidden border border-lilac-border/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lilac-accent to-[#9F7AEA] transition-all duration-500"
                    style={{ width: `${emi.completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Paid vs Remaining Stats */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-lilac-bg/80 border border-lilac-border/60 text-xs mb-3">
                <div>
                  <span className="text-[10px] text-lilac-muted uppercase font-bold block">Paid</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(emi.totalPaid)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-lilac-muted uppercase font-bold block">Remaining</span>
                  <span className="font-bold text-lilac-text">
                    {formatCurrency(emi.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Card Footer: Next Due Date & Mark Paid Button */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-lilac-muted flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-lilac-accent" />
                  {emi.isCompleted ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Loan fully paid off 🎉
                    </span>
                  ) : (
                    <span>Next: {formatDate(emi.nextDueDate)}</span>
                  )}
                </div>

                {!emi.isCompleted && (
                  <button
                    onClick={(e) => handleMarkPaid(emi._id, e)}
                    className="px-3.5 py-2 rounded-xl bg-lilac-accent text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all min-h-[44px]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Paid</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMI Detail Modal */}
      {detailEmi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] rounded-3xl bg-lilac-surface border border-lilac-border p-6 shadow-2xl relative overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setDetailEmi(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-lilac-muted hover:bg-lilac-card transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-accent block mb-1">
                EMI Loan Details
              </span>
              <h2 className="text-xl font-extrabold text-lilac-text">{detailEmi.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-lilac-muted">
                <Store className="w-3.5 h-3.5" />
                <span>{detailEmi.lender}</span>
                <span>•</span>
                <span>{detailEmi.category}</span>
              </div>
            </div>

            {/* Key Metrics Card */}
            <div className="p-4 rounded-2xl bg-lilac-bg border border-lilac-border mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-lilac-muted block">Monthly EMI</span>
                  <span className="text-lg font-black text-lilac-text">
                    {formatCurrency(detailEmi.monthlyAmount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-lilac-muted block">Financed Total</span>
                  <span className="text-lg font-black text-lilac-text">
                    {formatCurrency(detailEmi.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-2">
                <div className="flex justify-between text-xs font-semibold text-lilac-muted mb-1">
                  <span>
                    {detailEmi.monthsCompleted} of {detailEmi.totalTenure} months completed
                  </span>
                  <span className="font-bold text-lilac-accent">
                    {detailEmi.completionPercentage}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-lilac-surface overflow-hidden border border-lilac-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lilac-accent to-[#9F7AEA]"
                    style={{ width: `${detailEmi.completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-lilac-muted pt-1">
                <span>Paid: {formatCurrency(detailEmi.totalPaid)}</span>
                <span>Remaining: {formatCurrency(detailEmi.remainingAmount)}</span>
              </div>
            </div>

            {/* Dates & Timeline info */}
            <div className="space-y-2 text-xs mb-5 p-3 rounded-2xl bg-lilac-cardSubtle border border-lilac-border/60">
              <div className="flex justify-between">
                <span className="text-lilac-muted">Start Date:</span>
                <span className="font-semibold text-lilac-text">{formatDate(detailEmi.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lilac-muted">Projected End Date:</span>
                <span className="font-semibold text-lilac-text">{formatDate(detailEmi.endDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lilac-muted">Due Day of Month:</span>
                <span className="font-semibold text-lilac-text">Day {detailEmi.dueDay}</span>
              </div>
              {!detailEmi.isCompleted && (
                <div className="flex justify-between font-bold text-lilac-accent pt-1 border-t border-lilac-border/40">
                  <span>Next Due Date:</span>
                  <span>{formatDate(detailEmi.nextDueDate)}</span>
                </div>
              )}
            </div>

            {/* Payment History Section */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-lilac-muted flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Payment History ({detailEmi.payments?.length || 0})</span>
                </h4>
                {detailEmi.payments && detailEmi.payments.length > 0 && (
                  <button
                    onClick={() => handleUndoPayment(detailEmi._id)}
                    className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 p-1 min-h-[44px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo Last Payment</span>
                  </button>
                )}
              </div>

              {detailEmi.payments && detailEmi.payments.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {detailEmi.payments
                    .slice()
                    .reverse()
                    .map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-lilac-bg border border-lilac-border text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-lilac-text block">
                            Installment #{p.installmentNumber}
                          </span>
                          <span className="text-[10px] text-lilac-muted">
                            {formatDate(p.paidAt)} • {p.note || 'Paid'}
                          </span>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-lilac-muted italic p-3 text-center bg-lilac-bg rounded-xl border border-lilac-border">
                  No installments paid yet. Tap "Mark Next Paid" below when debited!
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="space-y-2">
              {!detailEmi.isCompleted && (
                <button
                  onClick={() => handleMarkPaid(detailEmi._id)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-lilac-accent/20 min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Next Installment as Paid ({formatCurrency(detailEmi.monthlyAmount)})</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    const emiToEdit = detailEmi;
                    setDetailEmi(null);
                    handleOpenEdit(emiToEdit);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-lilac-card text-lilac-text border border-lilac-border font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-lilac-surface transition-all min-h-[44px]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Plan</span>
                </button>

                <button
                  onClick={() => handleDeleteEMI(detailEmi)}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-500/20 transition-all min-h-[44px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit EMI Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[92vh] rounded-3xl bg-lilac-surface border border-lilac-border p-6 shadow-2xl relative overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-lilac-muted hover:bg-lilac-card transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-extrabold text-lilac-text mb-1">
              {editingEmi ? 'Edit EMI Plan' : 'Add New EMI Tracker'}
            </h2>
            <p className="text-xs text-lilac-muted mb-5">
              Enter loan details to track payments and upcoming debits.
            </p>

            <form onSubmit={handleSubmitForm} className="space-y-3.5">
              {/* Product / Loan Name */}
              <div>
                <label className="block text-xs font-bold text-lilac-text mb-1">Product / EMI Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 17 Pro, Sony OLED TV"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                />
              </div>

              {/* Store / Lender */}
              <div>
                <label className="block text-xs font-bold text-lilac-text mb-1">Store / Lender *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank EasyEMI, Bajaj Finserv"
                  value={formData.lender}
                  onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                />
              </div>

              {/* Total Financed Amount & Tenure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1">Total Financed (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="60000"
                    value={formData.totalAmount}
                    onChange={(e) => handleAmountOrTenureChange('totalAmount', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1">Tenure (Months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="12"
                    value={formData.tenureMonths}
                    onChange={(e) => handleAmountOrTenureChange('tenureMonths', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Monthly EMI Amount & Due Day */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1">Monthly EMI (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="5000"
                    value={formData.monthlyAmount}
                    onChange={(e) => setFormData({ ...formData, monthlyAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1">Due Day of Month *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    placeholder="5"
                    value={formData.dueDay}
                    onChange={(e) => setFormData({ ...formData, dueDay: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Start Date & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-lilac-text mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-lilac-text mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Card ending in 4123, zero-cost EMI"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full mt-4 py-3.5 px-4 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-lilac-accent/20 min-h-[44px] disabled:opacity-50"
              >
                {formSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{editingEmi ? 'Update EMI Plan' : 'Save EMI Tracker'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Accessible Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={Boolean(deleteConfirmEmi)}
        onClose={() => setDeleteConfirmEmi(null)}
        onConfirm={executeDeleteEMI}
        isLoading={isDeleting}
        title="Delete EMI Loan Tracker?"
        message={`Are you sure you want to delete '${deleteConfirmEmi?.name || 'this EMI'}'? This will permanently remove its installment schedule and payment history.`}
        confirmText="Delete Loan"
        cancelText="Keep Loan"
        isDanger={true}
      />
    </div>
  );
};

export default EmiTracker;
