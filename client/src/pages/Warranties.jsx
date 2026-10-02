/**
 * Warranty Vault Screen (Warranties.jsx)
 * --------------------------------------
 * Secure digital vault for appliance & gadget warranty protection:
 * - Product name & Merchant store
 * - Purchase date & Warranty expiration date
 * - Days remaining countdown
 * - Color codes:
 *     Mint  -> more than 90 days
 *     Gold  -> 30 to 90 days
 *     Coral -> under 30 days (expiring soon)
 *     Grey  -> expired
 * - Original bill receipt thumbnail
 * - Direct tap to open full original bill in BillDetailModal
 * - Search & Filter by active/expired
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
  ShieldCheck,
  ShieldAlert,
  Plus,
  Calendar,
  Receipt,
  Search,
  ExternalLink,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';

const Warranties = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active' or 'expired'
  const [searchTerm, setSearchTerm] = useState('');
  const [activeBill, setActiveBill] = useState(null);

  useEffect(() => {
    const fetchWarranties = async () => {
      try {
        setLoading(true);
        const res = await api.get('/bills', { params: { limit: 100 } });
        const withWarranties = res.data.bills.filter((b) => b.warrantyExpiry);
        setBills(withWarranties);
      } catch (err) {
        console.error('Failed to fetch warranties:', err);
        showToast('Could not load warranties', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchWarranties();
  }, [showToast]);

  const getPillVariant = (daysLeft) => {
    if (daysLeft < 0) return 'grey';
    if (daysLeft < 30) return 'coral';
    if (daysLeft <= 90) return 'gold';
    return 'mint';
  };

  const activeWarranties = bills.filter((b) => getDaysRemaining(b.warrantyExpiry) >= 0);
  const expiredWarranties = bills.filter((b) => getDaysRemaining(b.warrantyExpiry) < 0);
  const expiringSoonCount = activeWarranties.filter((b) => getDaysRemaining(b.warrantyExpiry) < 30).length;

  const currentList = filter === 'active' ? activeWarranties : expiredWarranties;

  const displayedWarranties = currentList.filter((b) => {
    const q = searchTerm.toLowerCase();
    const prodName = b.items?.[0]?.name || b.store;
    return prodName.toLowerCase().includes(q) || b.store.toLowerCase().includes(q);
  });

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="Warranty Vault"
        subtitle="Digital appliance protection & coverage records"
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

      {/* Top Vault Metrics Bar */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3.5 rounded-2xl bg-lilac-surface border border-lilac-border shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
            Active Coverages
          </span>
          <div className="text-xl font-extrabold font-heading text-lilac-text mt-0.5">
            {activeWarranties.length}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-lilac-surface border border-lilac-border shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
            Expiring &lt;30 Days
          </span>
          <div className={`text-xl font-extrabold font-heading mt-0.5 ${expiringSoonCount > 0 ? 'text-rose-500' : 'text-lilac-text'}`}>
            {expiringSoonCount}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lilac-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search product or store..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-lilac-surface border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 shadow-sm"
        />
      </div>

      {/* Active / Expired Segmented Toggle */}
      <div className="flex bg-lilac-surface border border-lilac-border p-1 rounded-2xl mb-4 shadow-sm">
        <button
          onClick={() => setFilter('active')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            filter === 'active'
              ? 'bg-lilac-accent text-white shadow-sm'
              : 'text-lilac-muted hover:text-lilac-text'
          }`}
        >
          Active Vault ({activeWarranties.length})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            filter === 'expired'
              ? 'bg-lilac-accent text-white shadow-sm'
              : 'text-lilac-muted hover:text-lilac-text'
          }`}
        >
          Expired ({expiredWarranties.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : displayedWarranties.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title={`No ${filter} warranties found`}
          description={
            filter === 'active'
              ? 'Electronics and gadget bills automatically receive 12 months warranty tracking!'
              : 'You have no expired warranties.'
          }
          actionLabel="Scan Electronics Bill"
          onAction={() => navigate('/scan')}
        />
      ) : (
        <div className="space-y-3">
          {displayedWarranties.map((bill) => {
            const daysLeft = getDaysRemaining(bill.warrantyExpiry);
            const pillVariant = getPillVariant(daysLeft);
            const productName = bill.items?.[0]?.name || bill.store;

            return (
              <div
                key={bill._id}
                onClick={() => setActiveBill(bill)}
                className="p-5 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft space-y-3 hover:border-lilac-accent/40 active:scale-[0.99] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-lilac-text truncate font-heading group-hover:text-lilac-accent transition-colors">
                        {productName}
                      </h3>
                      <p className="text-[11px] text-lilac-muted mt-0.5 truncate">
                        {bill.store} • Bought {formatDate(bill.date)}
                      </p>
                    </div>
                  </div>

                  <StatusPill variant={pillVariant}>
                    {daysLeft < 0
                      ? 'Expired'
                      : daysLeft === 0
                      ? 'Expires today'
                      : `${daysLeft}d left`}
                  </StatusPill>
                </div>

                {/* Receipt Image Preview Thumbnail if available */}
                {bill.imageUrl && (
                  <div className="rounded-xl overflow-hidden bg-lilac-bg border border-lilac-border h-24 flex items-center justify-center">
                    <img
                      src={`http://localhost:5000${bill.imageUrl}`}
                      alt="Receipt thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Dates & Total Footer */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-lilac-border/60">
                  <span className="text-lilac-muted flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-lilac-accent" />
                    <span>Expiry: <strong className="text-lilac-text">{formatDate(bill.warrantyExpiry)}</strong></span>
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-lilac-text font-heading text-sm">
                      {formatCurrency(bill.total)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-lilac-accent font-bold pt-1">
                  <span>View Original Bill Record</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
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

export default Warranties;
