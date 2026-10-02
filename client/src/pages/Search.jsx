/**
 * Smart Search Screen (Search.jsx)
 * ---------------------------------
 * Natural language financial search powered by backend query parsing:
 * 1. Large search input box
 * 2. Instant suggestion chips for natural queries
 * 3. Structured filter chips extracted by the backend
 * 4. Big spend total for matching bills
 * 5. Year-over-Year (YoY) comparison card (amount difference & percentage growth)
 * 6. Detailed matching bills list
 */

import React, { useState } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getCategoryBadge } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/Skeleton';
import BillDetailModal from '../components/BillDetailModal';
import {
  Search as SearchIcon,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  Calendar,
  X,
  MessageSquare,
} from 'lucide-react';

const SUGGESTIONS = [
  'How much did I spend on food this month?',
  'How much did I spend on shoes this year?',
  'What was my biggest purchase?',
  'How much did I spend at Zudio?',
  'Which category costs me the most?',
  'What bills are due soon?',
];

const Search = () => {
  const { showToast } = useToast();
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [activeBill, setActiveBill] = useState(null);

  const executeSearch = async (textToSearch) => {
    const q = (textToSearch || queryText).trim();
    if (!q) {
      showToast('Please enter a search query', 'info');
      return;
    }

    try {
      setLoading(true);
      setSearchedQuery(q);
      const res = await api.post('/search', { query: q });
      setSearchResult(res.data);
    } catch (err) {
      console.error('Search failed:', err);
      showToast('Search failed. Please try a different query.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chip) => {
    setQueryText(chip);
    executeSearch(chip);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  };

  const comparison = searchResult?.comparison;
  const isIncrease = comparison && comparison.percentChange > 0;
  const isDecrease = comparison && comparison.percentChange < 0;

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="Ask BillSnap"
        subtitle="Smart natural language spending questions & search"
        showBack={true}
      />

      {/* Large Natural Language Search Box */}
      <div className="mb-4 bg-lilac-surface border border-lilac-border rounded-3xl p-3 shadow-soft flex items-center gap-2">
        <div className="pl-2 text-lilac-muted">
          <Sparkles className="w-5 h-5 text-lilac-accent" />
        </div>
        <input
          type="text"
          placeholder="e.g. How much did I spend on food this month?"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 py-2 text-xs sm:text-sm bg-transparent text-lilac-text focus:outline-none placeholder:text-lilac-muted"
        />
        {queryText && (
          <button
            onClick={() => setQueryText('')}
            className="p-1.5 text-lilac-muted hover:text-lilac-text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => executeSearch()}
          disabled={loading}
          className="p-2.5 rounded-2xl bg-lilac-accent text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
          aria-label="Submit search"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <SearchIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-lilac-muted mb-2 px-1 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3 text-lilac-accent" />
          <span>Ask questions like:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(s)}
              className="px-3 py-2 rounded-2xl text-[11px] font-medium bg-lilac-surface border border-lilac-border text-lilac-text hover:border-lilac-accent/40 active:scale-95 transition-all text-left shadow-xs"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="h-40 skeleton-shimmer rounded-3xl" />
        </div>
      ) : searchResult ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Ask BillSnap Conversational Answer Card */}
          {searchResult.answer && (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-[#FFF9E6] via-[#FFF3D6] to-[#FFE8B3] dark:from-[#2F2718] dark:via-[#3D321A] dark:to-[#4A3C1C] border border-[#FFE299] dark:border-[#5E4D24] shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFC857] text-[#2B2147] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Sparkles className="w-5 h-5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] dark:text-[#FFD875] flex items-center gap-1">
                      <span>Ask BillSnap Answer</span>
                      <span>✨</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#451A03] dark:text-[#FDE68A] leading-relaxed">
                    {searchResult.answer}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Filter Badges */}
          {searchResult.filters && (
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[11px] font-bold text-lilac-muted flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>
              {searchResult.filters.category && (
                <StatusPill variant="purple">Category: {searchResult.filters.category}</StatusPill>
              )}
              {searchResult.filters.keyword && (
                <StatusPill variant="mint">Keyword: "{searchResult.filters.keyword}"</StatusPill>
              )}
              {searchResult.filters.minAmount && (
                <StatusPill variant="gold">Min: ₹{searchResult.filters.minAmount}</StatusPill>
              )}
              {searchResult.filters.maxAmount && (
                <StatusPill variant="gold">Max: ₹{searchResult.filters.maxAmount}</StatusPill>
              )}
            </div>
          )}

          {/* Big Total Hero Card */}
          <Card className="text-center p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
              Relevant Total
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-heading text-lilac-text mt-0.5 mb-1">
              {formatCurrency(searchResult.total)}
            </div>
            <p className="text-xs text-lilac-muted font-medium">
              Found across {searchResult.count} matching record{searchResult.count === 1 ? '' : 's'}
            </p>
          </Card>

          {/* Comparison Card (YoY or Budget) */}
          {comparison && (
            <div className="p-4 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted">
                  {comparison.budget ? 'Budget Comparison' : 'Year-over-Year (YoY)'}
                </span>
                <div className="text-xs font-semibold text-lilac-text mt-0.5">
                  {comparison.budget
                    ? `Remaining: ${formatCurrency(comparison.remaining)}`
                    : `Same period last year: ${formatCurrency(comparison.lastYearTotal)}`}
                </div>
              </div>

              <div className="text-right">
                {comparison.budget ? (
                  <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold font-heading bg-lilac-cardSubtle text-lilac-accent">
                    <span>{comparison.percentUsed}% used</span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold font-heading ${
                        isIncrease
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : isDecrease
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isIncrease && <TrendingUp className="w-3.5 h-3.5" />}
                      {isDecrease && <TrendingDown className="w-3.5 h-3.5" />}
                      <span>
                        {comparison.percentChange > 0 ? `+${comparison.percentChange}%` : `${comparison.percentChange}%`}
                      </span>
                    </div>
                    <div className="text-[10px] text-lilac-muted mt-0.5">
                      Diff: {formatCurrency(comparison.difference)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Matching Bills List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-muted mb-2 px-1">
              Matching Bills ({searchResult.bills?.length || 0})
            </h3>

            {searchResult.bills?.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No matching bills found"
                description="We couldn't find any expenses that matched this search."
              />
            ) : (
              <div className="space-y-2">
                {searchResult.bills.map((bill) => {
                  const badge = getCategoryBadge(bill.category);
                  return (
                    <div
                      key={bill._id}
                      onClick={() => setActiveBill(bill)}
                      className="p-3.5 rounded-2xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-[0.99] transition-all cursor-pointer shadow-soft flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0 ${badge.bg}`}>
                          <span>{badge.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-lilac-text truncate font-heading group-hover:text-lilac-accent transition-colors">
                            {bill.store}
                          </h4>
                          <span className="text-[11px] text-lilac-muted">{formatDate(bill.date)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold font-heading text-lilac-text">
                          {formatCurrency(bill.total)}
                        </div>
                        <span className="text-[10px] text-lilac-muted">{bill.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

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

export default Search;
