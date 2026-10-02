/**
 * Bill Timeline Screen (Timeline.jsx)
 * -----------------------------------
 * Unified chronological event stream uniting all bill lifecycle milestones:
 * - 🧾 Purchase date
 * - 📅 Return window deadline
 * - 🛡️ Warranty expiry
 * - 🔄 Recurring bill due date
 * - 👥 Split payment status
 * 
 * Mobile-first, easy-to-scan timeline with interactive event cards and bill modals.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Receipt,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Plus,
} from 'lucide-react';

const EVENT_FILTERS = ['All', 'Purchases', 'Deadlines', 'Recurring', 'Splits'];

const Timeline = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeBill, setActiveBill] = useState(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await api.get('/bills/timeline');
        setEvents(res.data.events || []);
      } catch (err) {
        console.error('Failed to load timeline:', err);
        showToast('Could not load bill timeline', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [showToast]);

  const handleOpenBill = async (billId) => {
    if (!billId) return;
    try {
      const res = await api.get(`/bills/${billId}`);
      setActiveBill(res.data);
    } catch (err) {
      showToast('Could not open bill details', 'error');
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'purchase':
        return { icon: Receipt, color: 'text-amber-500 bg-amber-100 dark:bg-amber-950/60' };
      case 'return':
        return { icon: RotateCcw, color: 'text-rose-500 bg-rose-100 dark:bg-rose-950/60' };
      case 'warranty':
        return { icon: ShieldCheck, color: 'text-blue-500 bg-blue-100 dark:bg-blue-950/60' };
      case 'recurring':
        return { icon: RefreshCw, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-950/60' };
      case 'split':
        return { icon: Users, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-950/60' };
      default:
        return { icon: Calendar, color: 'text-purple-500 bg-purple-100 dark:bg-purple-950/60' };
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Purchases') return ev.type === 'purchase';
    if (activeFilter === 'Deadlines') return ev.type === 'return' || ev.type === 'warranty';
    if (activeFilter === 'Recurring') return ev.type === 'recurring';
    if (activeFilter === 'Splits') return ev.type === 'split';
    return true;
  });

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader
        title="Bill Timeline"
        subtitle="Chronological stream of purchases & milestones"
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

      {/* Filter Chips (Horizontal Scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {EVENT_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] ${
              activeFilter === f
                ? 'bg-lilac-accent text-white shadow-sm'
                : 'bg-lilac-surface border border-lilac-border text-lilac-text hover:bg-lilac-cardSubtle'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No timeline events found"
          description="Your timeline will update as you scan receipts, set warranty alerts, and track recurring bills."
          actionLabel="Scan a Bill"
          onAction={() => navigate('/scan')}
        />
      ) : (
        <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-lilac-border">
          {filteredEvents.map((ev, idx) => {
            const { icon: Icon, color } = getEventIcon(ev.type);

            return (
              <div key={ev.id || idx} className="relative group">
                {/* Timeline Node Dot */}
                <div
                  className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-lilac-bg shadow-sm z-10 ${color}`}
                >
                  <Icon className="w-3 h-3 stroke-[2.5]" />
                </div>

                {/* Event Card */}
                <div
                  onClick={() => {
                    if (ev.billId) handleOpenBill(ev.billId);
                    else if (ev.type === 'recurring') navigate('/recurring');
                    else if (ev.type === 'split') navigate('/split');
                  }}
                  className={`p-4 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft transition-all ${
                    ev.billId ? 'cursor-pointer hover:border-lilac-accent/40 active:scale-[0.99]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-lilac-muted flex items-center gap-1 uppercase tracking-wider">
                      <Clock className="w-3 h-3 text-lilac-accent" />
                      <span>{formatDate(ev.date)}</span>
                    </span>

                    {/* Status Pill for Deadlines or Splits */}
                    {ev.status && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ev.status.includes('left') || ev.status.includes('today')
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60'
                            : ev.status.includes('pending')
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {ev.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-lilac-text font-heading truncate">
                        {ev.title}
                      </h4>
                      {ev.itemsSummary && (
                        <p className="text-[11px] text-lilac-muted truncate mt-0.5">
                          {ev.itemsSummary}
                        </p>
                      )}
                    </div>

                    {ev.amount !== undefined && ev.amount > 0 && (
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold font-heading text-lilac-text">
                          {formatCurrency(ev.amount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {ev.billId && (
                    <div className="mt-2 pt-2 border-t border-lilac-border/60 flex items-center justify-between text-[11px] text-lilac-accent font-bold">
                      <span>View Purchase Record</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
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
        />
      )}
    </div>
  );
};

export default Timeline;
