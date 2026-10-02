/**
 * Home Screen (Home.jsx)
 * -----------------------
 * Primary dashboard view:
 * 1. Warm greeting with user's name
 * 2. Signature SpendCard with receipt zigzag edge
 * 3. Soft gold AI financial insight card
 * 4. Quick-access shortcuts to Warranties, Returns, Recurring, Splits, and Smart Search
 * 5. "Coming Up" prioritized deadlines with color-coded countdown pills
 * 6. Notification bell with active alert badge count
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import SpendCard from '../components/SpendCard';
import StatusPill from '../components/StatusPill';
import AlertsDrawer from '../components/AlertsDrawer';
import { CardSkeleton, BillItemSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  Bell,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  Users,
  Search,
  ArrowRight,
  PlusCircle,
  Calendar,
  Clock,
  TrendingUp,
  CreditCard,
  Fingerprint,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [emis, setEmis] = useState([]);
  const [emiSummary, setEmiSummary] = useState(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, insightsRes, alertsRes, emisRes] = await Promise.all([
          api.get('/stats/monthly'),
          api.get('/stats/insights'),
          api.get('/alerts'),
          api.get('/emis').catch(() => ({ data: { emis: [], summary: null } })),
        ]);

        setStats(statsRes.data);
        setInsights(insightsRes.data);
        setAlerts(alertsRes.data);
        setEmis(emisRes.data?.emis || []);
        setEmiSummary(emisRes.data?.summary || null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getAlertPillVariant = (daysLeft) => {
    if (daysLeft <= 2) return 'coral';
    if (daysLeft <= 7) return 'gold';
    return 'mint';
  };

  const getShortcutItems = () => [
    { label: 'EMI Tracker', path: '/emis', icon: CreditCard, color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/60' },
    { label: 'Warranties', path: '/warranties', icon: ShieldCheck, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    { label: 'Returns', path: '/returns', icon: RotateCcw, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50' },
    { label: 'Timeline', path: '/timeline', icon: Clock, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' },
    { label: 'Price History', path: '/price-history', icon: TrendingUp, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
    { label: 'Recurring', path: '/recurring', icon: RefreshCw, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
    { label: 'Split Bill', path: '/split', icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Ask BillSnap', path: '/search', icon: Search, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
  ];

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      {/* Top Bar: User Greeting & Alert Bell */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-lilac-muted">
            Welcome back
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-lilac-text tracking-tight flex items-center gap-1.5">
            <span>Hello, {user?.name?.split(' ')[0] || 'Friend'}</span>
            <span className="animate-wave inline-block origin-bottom-right">👋</span>
          </h1>
        </div>

        {/* Bell Button with Unread Badge */}
        <button
          onClick={() => setIsAlertsOpen(true)}
          className="relative w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-lilac-surface border border-lilac-border text-lilac-text hover:bg-lilac-cardSubtle active:scale-95 transition-all shadow-sm"
          aria-label="Open notifications"
        >
          <Bell className="w-5 h-5 stroke-[2]" />
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="h-24 skeleton-shimmer rounded-3xl" />
          <div className="space-y-2 pt-2">
            <BillItemSkeleton />
            <BillItemSkeleton />
          </div>
        </div>
      ) : (
        <>
          {/* Signature Spend Card */}
          <SpendCard
            total={stats?.total || 0}
            budget={stats?.budget || user?.monthlyBudget || 25000}
            percentUsed={stats?.percentUsed || 0}
            categoryBreakdown={stats?.categoryBreakdown || []}
            monthLabel="This Month"
          />

          {/* Feature 1: Upcoming EMI Card or Quick Feature Banner */}
          {(() => {
            const upcomingEmi = emis
              .filter((e) => !e.isCompleted && e.daysUntilDue !== null)
              .sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];

            if (upcomingEmi) {
              return (
                <div
                  onClick={() => navigate('/emis')}
                  className="mb-6 p-4 rounded-3xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-[0.99] transition-all cursor-pointer shadow-soft relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-lilac-muted block">
                          Upcoming EMI
                        </span>
                        <h3 className="text-sm font-extrabold text-lilac-text truncate max-w-[150px]">
                          {upcomingEmi.name}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-lilac-text block">
                        {formatCurrency(upcomingEmi.monthlyAmount)}
                      </span>
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                        {upcomingEmi.daysUntilDue <= 0
                          ? 'Due Today'
                          : `Due in ${upcomingEmi.daysUntilDue}d`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-lilac-muted pt-2 border-t border-lilac-border/40">
                    <span>{emiSummary?.activeCount || 1} Active EMI Loan{emiSummary?.activeCount === 1 ? '' : 's'}</span>
                    <span className="font-semibold text-lilac-accent flex items-center gap-1">
                      <span>View EMI Tracker</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                onClick={() => navigate('/emis')}
                className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-900/60 flex items-center justify-between cursor-pointer hover:border-violet-400 transition-all shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6544C7] to-[#8B5CF6] text-white flex items-center justify-center shadow-md shrink-0">
                    <CreditCard className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 block">
                      New Feature
                    </span>
                    <h4 className="text-xs font-bold text-lilac-text">EMI Loan Tracker</h4>
                    <p className="text-[10px] text-lilac-muted">Track installments, tenures &amp; countdowns</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-lilac-accent text-white text-[11px] font-bold shadow-xs flex items-center gap-1 shrink-0">
                  <span>Track</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            );
          })()}

          {/* Soft Gold AI Insight Card */}
          {insights?.insight && (
            <div className="mb-6 p-4 rounded-3xl bg-gradient-to-br from-[#FFF9E6] via-[#FFF3D6] to-[#FFE8B3] dark:from-[#2F2718] dark:via-[#3D321A] dark:to-[#4A3C1C] border border-[#FFE299] dark:border-[#5E4D24] shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#FFC857] text-[#2B2147] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Sparkles className="w-4 h-4 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] dark:text-[#FFD875]">
                      Smart Spending Insight
                    </span>
                    <span className="text-xs">💡</span>
                  </div>
                  <p className="text-xs font-medium text-[#451A03] dark:text-[#FDE68A] leading-relaxed">
                    {insights.insight}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions Shortcuts Grid */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
                Quick Shortcuts
              </h2>
              <Link to="/scan" className="text-xs font-bold text-lilac-accent hover:underline flex items-center gap-0.5">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Bill</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {getShortcutItems().map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/30 active:scale-95 transition-all text-center group min-w-[76px] min-h-[68px] shrink-0 shadow-soft"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span className="text-[10px] font-bold text-lilac-text leading-tight truncate w-full">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* "Coming Up" Deadlines List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-lilac-accent" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
                  Coming Up
                </h2>
              </div>
              {alerts.length > 0 && (
                <button
                  onClick={() => setIsAlertsOpen(true)}
                  className="text-xs font-bold text-lilac-accent hover:underline flex items-center gap-0.5"
                >
                  <span>View All ({alerts.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <EmptyState
                icon="🌴"
                title="No immediate deadlines"
                description="Your bills, warranties, and subscriptions are all up to date!"
              />
            ) : (
              <div className="space-y-2.5">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (alert.type === 'warranty') navigate('/warranties');
                      else if (alert.type === 'return') navigate('/returns');
                      else if (alert.type === 'recurring') navigate('/recurring');
                      else if (alert.type === 'split') navigate('/split');
                      else if (alert.type === 'duplicate') navigate('/bills');
                      else navigate('/expenses');
                    }}
                    className="p-3.5 rounded-2xl bg-lilac-surface border border-lilac-border hover:border-lilac-accent/40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-lilac-text font-heading truncate">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-lilac-muted truncate">
                        {alert.message}
                      </p>
                    </div>

                    <StatusPill variant={getAlertPillVariant(alert.daysLeft)}>
                      {alert.daysLeft <= 0 ? 'Today' : `${alert.daysLeft}d left`}
                    </StatusPill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Alerts Slide-over Drawer */}
      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
      />
    </div>
  );
};

export default Home;
