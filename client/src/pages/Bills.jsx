/**
 * My Bills Screen (Bills.jsx)
 * ----------------------------
 * Searchable, filterable list of all bills with:
 * 1. Debounced keyword search (merchant, item names, notes)
 * 2. Horizontal scrollable filter chips (Category, Month, Amount Range)
 * 3. Sorting options (Date newest/oldest, Amount high/low)
 * 4. Pagination / "Load More"
 * 5. Comprehensive Bill Detail Modal (original receipt image, line items, warranty/return badges,
 *    Split Bill shortcut, Edit, and Delete with confirmation).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getCategoryBadge, getDaysRemaining } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import { BillItemSkeleton } from '../components/Skeleton';
import BillDetailModal from '../components/BillDetailModal';
import {
  Search,
  Filter,
  ArrowUpDown,
  X,
  Share2,
  Trash2,
  Edit,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Receipt,
  Plus,
} from 'lucide-react';

const CATEGORIES = ['All', 'Food', 'Groceries', 'Shopping', 'Electronics', 'Bills', 'Travel', 'Health', 'Other'];

const Bills = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [amountRange, setAmountRange] = useState('All'); // 'All', 'under500', '500to2000', 'above2000'
  const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM
  const [sortBy, setSortBy] = useState('date_desc');

  // Detail Modal State
  const [activeBill, setActiveBill] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Bills from API
  const fetchBills = useCallback(
    async (pageNumber = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const params = {
          page: pageNumber,
          limit: 15,
          sort: sortBy,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (selectedCategory !== 'All') params.category = selectedCategory;
        if (selectedMonth) params.month = selectedMonth;

        if (amountRange === 'under500') params.maxAmount = 500;
        else if (amountRange === '500to2000') {
          params.minAmount = 500;
          params.maxAmount = 2000;
        } else if (amountRange === 'above2000') {
          params.minAmount = 2000;
        }

        const res = await api.get('/bills', { params });
        const { bills: fetchedBills, total, pages } = res.data;

        if (append) {
          setBills((prev) => [...prev, ...fetchedBills]);
        } else {
          setBills(fetchedBills);
        }

        setTotalCount(total);
        setTotalPages(pages);
      } catch (err) {
        console.error('Failed to fetch bills:', err);
        showToast('Error loading bills. Please try again.', 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, selectedCategory, amountRange, selectedMonth, sortBy, showToast]
  );

  useEffect(() => {
    fetchBills(1, false);
    setPage(1);
  }, [fetchBills]);

  // Load more pagination handler
  const handleLoadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBills(nextPage, true);
    }
  };

  // Delete Bill
  const handleDeleteBill = async () => {
    if (!activeBill) return;
    try {
      setIsDeleting(true);
      await api.delete(`/bills/${activeBill._id}`);
      showToast('Bill deleted successfully.', 'success');
      setBills((prev) => prev.filter((b) => b._id !== activeBill._id));
      setActiveBill(null);
      setShowDeleteConfirm(false);
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete bill:', err);
      showToast('Could not delete bill. Try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="My Bills"
        subtitle={`${totalCount} total receipts recorded`}
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

      {/* Search Input */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lilac-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search by merchant, items, notes..."
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

      {/* Category Filter Chips (Horizontal Scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] ${
              selectedCategory === cat
                ? 'bg-lilac-accent text-white shadow-sm'
                : 'bg-lilac-surface border border-lilac-border text-lilac-text hover:bg-lilac-cardSubtle'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Secondary Filter Bar: Amount Range & Sort */}
      <div className="flex items-center justify-between gap-2 mb-4">
        {/* Amount Selector */}
        <select
          value={amountRange}
          onChange={(e) => setAmountRange(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-lilac-surface border border-lilac-border text-[11px] font-semibold text-lilac-text focus:outline-none"
        >
          <option value="All">All Amounts</option>
          <option value="under500">Under ₹500</option>
          <option value="500to2000">₹500 – ₹2,000</option>
          <option value="above2000">Above ₹2,000</option>
        </select>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-lilac-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-lilac-surface border border-lilac-border text-[11px] font-semibold text-lilac-text focus:outline-none"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="total_desc">Highest Amount</option>
            <option value="total_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Bills List */}
      {loading ? (
        <div className="space-y-2.5">
          <BillItemSkeleton />
          <BillItemSkeleton />
          <BillItemSkeleton />
          <BillItemSkeleton />
        </div>
      ) : bills.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No bills match your criteria"
          description="Try clearing search filters or scanning a new receipt."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setSelectedCategory('All');
            setAmountRange('All');
            setSelectedMonth('');
          }}
        />
      ) : (
        <div className="space-y-2.5">
          {bills.map((bill) => {
            const badge = getCategoryBadge(bill.category);
            const warrantyDays = getDaysRemaining(bill.warrantyExpiry);
            const returnDays = getDaysRemaining(bill.returnUntil);

            return (
              <div
                key={bill._id}
                onClick={() => setActiveBill(bill)}
                className="p-4 rounded-2xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-[0.99] transition-all cursor-pointer shadow-soft flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${badge.bg}`}>
                    <span>{badge.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-lilac-text truncate font-heading group-hover:text-lilac-accent transition-colors">
                      {bill.store}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-lilac-muted mt-0.5">
                      <span>{formatDate(bill.date)}</span>
                      <span>•</span>
                      <span className="truncate">{bill.category}</span>
                    </div>

                    {/* Quick status chips for warranties / returns if active */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {returnDays !== null && returnDays >= 0 && returnDays <= 15 && (
                        <StatusPill variant={returnDays <= 2 ? 'coral' : 'gold'}>
                          Return: {returnDays}d
                        </StatusPill>
                      )}
                      {warrantyDays !== null && warrantyDays > 0 && warrantyDays <= 30 && (
                        <StatusPill variant="gold">
                          Warranty: {warrantyDays}d
                        </StatusPill>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold font-heading text-lilac-text">
                    {formatCurrency(bill.total)}
                  </div>
                  {bill.items && bill.items.length > 0 && (
                    <div className="text-[10px] text-lilac-muted mt-0.5">
                      {bill.items.length} item{bill.items.length === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {page < totalPages && (
            <div className="pt-3 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 rounded-2xl bg-lilac-surface border border-lilac-border text-xs font-bold text-lilac-accent hover:bg-lilac-cardSubtle active:scale-95 transition-all shadow-sm min-h-[44px]"
              >
                {loadingMore ? 'Loading more bills...' : 'Load More Bills'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bill Detail Modal (Purchase Memory) */}
      {activeBill && (
        <BillDetailModal
          bill={activeBill}
          onClose={() => setActiveBill(null)}
          onBillDeleted={(deletedId) => {
            setBills((prev) => prev.filter((b) => b._id !== deletedId));
            setActiveBill(null);
            setTotalCount((prev) => Math.max(0, prev - 1));
          }}
        />
      )}
    </div>
  );
};

export default Bills;
