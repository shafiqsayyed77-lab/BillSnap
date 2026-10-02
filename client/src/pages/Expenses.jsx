/**
 * Expenses & Analytics Screen (Expenses.jsx)
 * -------------------------------------------
 * Visual financial reports:
 * 1. Month switcher (navigate backwards and forwards in time)
 * 2. Big monthly spend total with percentage comparison vs prior month
 * 3. Interactive Category Doughnut Chart with legend
 * 4. 6-Month Historical Spending Trend Bar Chart
 * 5. Dark mode aware chart colors and contrast
 */

import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  BookOpen,
  ArrowRight,
  TrendingDown,
  Calendar,
  PieChart as PieIcon,
  BarChart2,
  CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Chart.js registration
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const CATEGORY_COLORS = [
  '#F59E0B', // Food (amber)
  '#10B981', // Groceries (emerald)
  '#8B5CF6', // Shopping (purple)
  '#3B82F6', // Electronics (blue)
  '#6366F1', // Bills (indigo)
  '#06B6D4', // Travel (cyan)
  '#F43F5E', // Health (rose)
  '#94A3B8', // Other (slate)
];

const Expenses = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Selected date defaults to current month
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);

  const formattedMonthQuery = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, '0')}`;

  const monthDisplayLabel = currentDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [statsRes, insightsRes] = await Promise.all([
          api.get(`/stats/monthly?month=${formattedMonthQuery}`),
          api.get('/stats/insights'),
        ]);

        setStats(statsRes.data);
        setInsights(insightsRes.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [formattedMonthQuery]);

  // Chart configuration for dark & light modes
  const textColor = isDark ? '#F3EEFF' : '#2B2147';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // Doughnut Data (Category Breakdown)
  const activeCategories = stats?.categoryBreakdown?.filter((c) => c.total > 0) || [];
  const doughnutData = {
    labels: activeCategories.map((c) => c.category),
    datasets: [
      {
        data: activeCategories.map((c) => c.total),
        backgroundColor: CATEGORY_COLORS.slice(0, activeCategories.length),
        borderWidth: 2,
        borderColor: isDark ? '#221A3D' : '#FFFFFF',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
    cutout: '70%',
  };

  // 6-Month Trend Bar Chart Data
  const trendData = {
    labels: (stats?.trend || []).map((t) => t.label),
    datasets: [
      {
        label: 'Monthly Spend (₹)',
        data: (stats?.trend || []).map((t) => t.total),
        backgroundColor: '#6544C7',
        borderRadius: 8,
        hoverBackgroundColor: '#FFC857',
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Spend: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { size: 10 } },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { size: 10 },
          callback: (val) => (val >= 1000 ? `₹${val / 1000}k` : `₹${val}`),
        },
      },
    },
  };

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader title="Expense Analytics" subtitle="Monthly breakdowns, story & insights" />

      {/* Month Switcher Bar */}
      <div className="flex items-center justify-between bg-lilac-surface border border-lilac-border rounded-2xl p-2 mb-4 shadow-sm">
        <button
          onClick={handlePrevMonth}
          className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-lilac-bg text-lilac-text hover:bg-lilac-cardSubtle active:scale-95 transition-all"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-lilac-accent" />
          <span className="text-xs font-bold text-lilac-text font-heading">{monthDisplayLabel}</span>
        </div>

        <button
          onClick={handleNextMonth}
          className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-lilac-bg text-lilac-text hover:bg-lilac-cardSubtle active:scale-95 transition-all"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="h-56 skeleton-shimmer rounded-3xl" />
        </div>
      ) : (
        <>
          {/* Monthly Financial Story Card */}
          {insights?.financialStory && (
            <div className="mb-4 p-5 rounded-3xl bg-gradient-to-br from-[#F5F0FF] via-lilac-surface to-[#F9F6FF] dark:from-[#251C3B] dark:via-lilac-surface dark:to-[#1F1735] border border-lilac-accent/30 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-lilac-accent text-white flex items-center justify-center text-sm shadow-sm">
                    📖
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-text font-heading">
                    Monthly Financial Story
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-lilac-accent uppercase">
                  {monthDisplayLabel}
                </span>
              </div>

              {/* Story Narrative Grid */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="p-3 rounded-2xl bg-lilac-bg border border-lilac-border">
                  <span className="text-[10px] text-lilac-muted uppercase font-bold">Spent This Month</span>
                  <div className="text-sm font-extrabold font-heading text-lilac-text mt-0.5">
                    {formatCurrency(insights.financialStory.totalSpent)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-lilac-bg border border-lilac-border">
                  <span className="text-[10px] text-lilac-muted uppercase font-bold">Budget Used</span>
                  <div className="text-sm font-extrabold font-heading text-lilac-text mt-0.5">
                    {insights.financialStory.percentUsed}%
                  </div>
                </div>
              </div>

              {/* Story Sentences */}
              <div className="space-y-2 pt-1 border-t border-lilac-border/60">
                <div className="flex items-start gap-2 text-xs text-lilac-text font-medium leading-relaxed">
                  <span className="text-sm select-none">🏷️</span>
                  <span>{insights.financialStory.biggestCategoryText}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-lilac-text font-medium leading-relaxed">
                  <span className="text-sm select-none">🏆</span>
                  <span>{insights.financialStory.biggestPurchaseText}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-lilac-text font-medium leading-relaxed">
                  <span className="text-sm select-none">📈</span>
                  <span>{insights.financialStory.spendingChangeText}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-lilac-text font-medium leading-relaxed">
                  <span className="text-sm select-none">💳</span>
                  <span>{insights.financialStory.remainingText}</span>
                </div>
              </div>
            </div>
          )}

          {/* Smart Saving Observations Card */}
          {insights?.observations && insights.observations.length > 0 && (
            <div className="mb-4 p-4 rounded-3xl bg-gradient-to-br from-[#FFF9E6] via-[#FFF3D6] to-[#FFE8B3] dark:from-[#2F2718] dark:via-[#3D321A] dark:to-[#4A3C1C] border border-[#FFE299] dark:border-[#5E4D24] shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B45309] dark:text-[#FFD875]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#92400E] dark:text-[#FFD875]">
                  Smart Saving Insights
                </h4>
              </div>

              <div className="space-y-1.5 pt-0.5">
                {insights.observations.map((obs, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-[#451A03] dark:text-[#FDE68A] leading-relaxed">
                    <span className="text-amber-500 font-bold select-none">•</span>
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMI Loan Commitments in Insights */}
          {insights?.emiSummary && insights.emiSummary.activeCount > 0 && (
            <div
              onClick={() => navigate('/emis')}
              className="mb-4 p-4 rounded-3xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-[0.99] transition-all cursor-pointer shadow-soft"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-lilac-text">
                    EMI Loan Commitments
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                  {insights.emiSummary.activeCount} Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-lilac-bg border border-lilac-border">
                  <span className="text-[10px] text-lilac-muted uppercase font-bold block">Monthly</span>
                  <span className="font-extrabold text-lilac-text">
                    {formatCurrency(insights.emiSummary.totalMonthlyCommitment)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-lilac-bg border border-lilac-border">
                  <span className="text-[10px] text-lilac-muted uppercase font-bold block">Remaining Debt</span>
                  <span className="font-extrabold text-[#92400E] dark:text-[#FFD875]">
                    {formatCurrency(insights.emiSummary.totalRemainingAmount)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-lilac-accent font-semibold pt-2 mt-1 border-t border-lilac-border/40">
                <span>Manage installment schedule</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* Quick Sub-Feature Switchers */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => navigate('/emis')}
              className="p-2.5 rounded-2xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-95 transition-all flex flex-col items-center justify-center text-center text-xs text-lilac-text font-bold shadow-soft min-h-[58px]"
            >
              <span className="text-base select-none mb-0.5">💳</span>
              <span className="text-[11px] truncate w-full">EMI Tracker</span>
            </button>

            <button
              onClick={() => navigate('/price-history')}
              className="p-2.5 rounded-2xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-95 transition-all flex flex-col items-center justify-center text-center text-xs text-lilac-text font-bold shadow-soft min-h-[58px]"
            >
              <span className="text-base select-none mb-0.5">🏷️</span>
              <span className="text-[11px] truncate w-full">Price History</span>
            </button>

            <button
              onClick={() => navigate('/timeline')}
              className="p-2.5 rounded-2xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-95 transition-all flex flex-col items-center justify-center text-center text-xs text-lilac-text font-bold shadow-soft min-h-[58px]"
            >
              <span className="text-base select-none mb-0.5">📅</span>
              <span className="text-[11px] truncate w-full">Bill Timeline</span>
            </button>
          </div>

          {/* Big Spend Total Card */}
          <Card className="mb-4 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-lilac-muted">
              Total Expenses in {monthDisplayLabel}
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-heading text-lilac-text mt-1 mb-2">
              {formatCurrency(stats?.total || 0)}
            </div>
            <div className="text-xs text-lilac-muted font-medium">
              Budget: {formatCurrency(stats?.budget || 25000)} •{' '}
              <span className="font-bold text-lilac-text">{stats?.percentUsed || 0}% used</span>
            </div>
          </Card>

          {/* Category Breakdown Doughnut Card */}
          <Card className="mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-lilac-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
                  Category Breakdown
                </h3>
              </div>
              <span className="text-xs font-bold text-lilac-text">
                {activeCategories.length} categories
              </span>
            </div>

            {activeCategories.length === 0 ? (
              <EmptyState
                icon="📊"
                title="No expenses for this month"
                description="Scan a bill to see your visual category chart."
              />
            ) : (
              <div>
                {/* Chart Canvas */}
                <div className="relative h-52 w-full mb-4 flex items-center justify-center">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-lilac-muted">Spent</span>
                    <span className="text-base font-extrabold font-heading text-lilac-text">
                      {formatCurrency(stats?.total || 0)}
                    </span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 pt-2 border-t border-lilac-border/60">
                  {activeCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        <span className="font-semibold text-lilac-text">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold text-lilac-text">
                        <span>{formatCurrency(cat.total)}</span>
                        <span className="text-[11px] text-lilac-muted font-normal">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 6-Month Trend Bar Chart Card */}
          <Card className="mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-lilac-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
                  6-Month Historical Trend
                </h3>
              </div>
            </div>

            <div className="h-48 w-full">
              <Bar data={trendData} options={trendOptions} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Expenses;
