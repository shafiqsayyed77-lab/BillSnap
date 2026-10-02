/**
 * Price History Screen (PriceHistory.jsx)
 * ----------------------------------------
 * Displays price fluctuation tracking across repeat purchases:
 * - Product name
 * - Previous price vs Current price (e.g. ₹295 → ₹275)
 * - Savings / Difference indicator (Saved ₹20 or +₹15)
 * - Purchase dates & Store names
 * - Direct link to view the original bill
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
import BillDetailModal from '../components/BillDetailModal';
import {
  TrendingDown,
  TrendingUp,
  Search,
  ArrowRight,
  Sparkles,
  Calendar,
  Store,
  Receipt,
  X,
  Plus,
} from 'lucide-react';

const PriceHistory = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeBill, setActiveBill] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await api.get('/bills/price-history');
        setPriceHistory(res.data.priceHistory || []);
      } catch (err) {
        console.error('Failed to load price history:', err);
        showToast('Could not load price history', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [showToast]);

  const handleOpenBill = async (billId) => {
    try {
      const res = await api.get(`/bills/${billId}`);
      setActiveBill(res.data);
    } catch (err) {
      showToast('Could not open bill details', 'error');
    }
  };

  const filteredHistory = priceHistory.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.store.toLowerCase().includes(q)
    );
  });

  const totalSaved = priceHistory
    .filter((p) => p.savings > 0)
    .reduce((sum, p) => sum + p.savings, 0);

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="Price History"
        subtitle="Track product price changes across receipts"
        showBack={true}
        rightAction={
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-lilac-accent text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>
        }
      />

      {/* Top Savings Hero Banner */}
      {totalSaved > 0 && (
        <div className="mb-4 p-4 rounded-3xl bg-gradient-to-br from-[#D9F3E6] via-[#E6F8EF] to-[#CEF0E0] dark:from-[#0E3524] dark:via-[#13442F] dark:to-[#175239] border border-[#A6E6C5] dark:border-[#1E6847] shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E7A52] dark:text-[#A6E6C5]">
                Smart Price Tracking
              </span>
              <div className="text-sm font-extrabold font-heading text-[#064E33] dark:text-[#D1F7E4]">
                Saved {formatCurrency(totalSaved)} on repeat buys
              </div>
            </div>
          </div>
          <span className="text-xl select-none">🎉</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lilac-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Filter by product or store..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-lilac-surface border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-lilac-muted hover:text-lilac-text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredHistory.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="No repeat purchases yet"
          description="When you buy the same item more than once across bills, Price History will automatically compare price shifts and savings here!"
          actionLabel="Scan a Bill"
          onAction={() => navigate('/scan')}
        />
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item, idx) => {
            const isSaved = item.savings > 0;
            const isMore = item.difference > 0;

            return (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft space-y-3 hover:border-lilac-accent/40 transition-all"
              >
                {/* Header: Product & Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-lilac-text font-heading truncate">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-lilac-muted mt-0.5">
                      <Store className="w-3 h-3 text-lilac-accent" />
                      <span>{item.store}</span>
                      <span>•</span>
                      <span>{item.totalPurchases} purchases</span>
                    </div>
                  </div>

                  {/* Savings Pill */}
                  {isSaved ? (
                    <StatusPill variant="mint">
                      Saved {formatCurrency(item.savings)}
                    </StatusPill>
                  ) : isMore ? (
                    <StatusPill variant="coral">
                      +{formatCurrency(item.difference)}
                    </StatusPill>
                  ) : (
                    <StatusPill variant="gold">
                      Unchanged
                    </StatusPill>
                  )}
                </div>

                {/* Price Shift Card */}
                <div className="p-3.5 rounded-2xl bg-lilac-bg border border-lilac-border/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
                      Previous Price
                    </span>
                    <div className="text-sm font-bold text-lilac-muted line-through">
                      {formatCurrency(item.previousPrice)}
                    </div>
                    <div className="text-[10px] text-lilac-muted mt-0.5">
                      {formatDate(item.previousDate)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-lilac-accent px-2">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
                      Current Price
                    </span>
                    <div className="text-base font-extrabold font-heading text-lilac-text">
                      {formatCurrency(item.currentPrice)}
                    </div>
                    <div className="text-[10px] text-lilac-muted mt-0.5">
                      {formatDate(item.latestDate)}
                    </div>
                  </div>
                </div>

                {/* Footer action to view bill */}
                {item.billId && (
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleOpenBill(item.billId)}
                      className="text-xs font-bold text-lilac-accent hover:underline flex items-center gap-1 min-h-[36px]"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>View Latest Bill</span>
                    </button>
                  </div>
                )}
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
        />
      )}
    </div>
  );
};

export default PriceHistory;
