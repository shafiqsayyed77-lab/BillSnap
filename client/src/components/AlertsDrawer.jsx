/**
 * Alerts Drawer / Modal (AlertsDrawer.jsx)
 * ----------------------------------------
 * Displays all active notifications, warranty deadlines, return cutoffs, and budget warnings.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShieldAlert, ArrowRight, RotateCcw, Calendar, AlertOctagon, Copy, Users, CreditCard } from 'lucide-react';
import StatusPill from './StatusPill';

const AlertsDrawer = ({ isOpen, onClose, alerts = [] }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAction = (alert) => {
    onClose();
    if (alert.type === 'warranty') navigate('/warranties');
    else if (alert.type === 'return') navigate('/returns');
    else if (alert.type === 'recurring') navigate('/recurring');
    else if (alert.type === 'emi' || alert.type === 'emi_completed') navigate('/emis');
    else if (alert.type === 'split') navigate('/split');
    else if (alert.type === 'duplicate') navigate('/bills');
    else if (alert.type === 'budget') navigate('/expenses');
    else navigate('/bills');
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warranty':
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      case 'return':
        return <RotateCcw className="w-5 h-5 text-rose-500" />;
      case 'recurring':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'emi':
      case 'emi_completed':
        return <CreditCard className="w-5 h-5 text-amber-500" />;
      case 'budget':
        return <AlertOctagon className="w-5 h-5 text-purple-500" />;
      case 'duplicate':
        return <Copy className="w-5 h-5 text-amber-500" />;
      case 'split':
        return <Users className="w-5 h-5 text-emerald-500" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-lilac-accent" />;
    }
  };

  const getAlertPillVariant = (daysLeft) => {
    if (daysLeft <= 2) return 'coral';
    if (daysLeft <= 7) return 'gold';
    return 'mint';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md bg-lilac-surface border border-lilac-border rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-lilac-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-lilac-cardSubtle flex items-center justify-center text-lilac-accent">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading text-lilac-text">Alerts & Deadlines</h2>
              <p className="text-xs text-lilac-muted">{alerts.length} active notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-lilac-muted hover:text-lilac-text hover:bg-lilac-cardSubtle transition-all"
            aria-label="Close alerts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-semibold text-lilac-text">All caught up!</p>
              <p className="text-xs text-lilac-muted mt-1">No upcoming deadlines or urgent alerts right now.</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div
                key={idx}
                onClick={() => handleAction(alert)}
                className="p-4 rounded-2xl bg-lilac-bg border border-lilac-border/70 hover:border-lilac-accent/40 cursor-pointer active:scale-[0.99] transition-all flex items-start gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-2xl bg-lilac-surface border border-lilac-border flex items-center justify-center shrink-0 mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-xs font-bold text-lilac-text truncate font-heading">{alert.title}</h3>
                    <StatusPill variant={getAlertPillVariant(alert.daysLeft)}>
                      {alert.daysLeft <= 0 ? 'Today' : `${alert.daysLeft}d left`}
                    </StatusPill>
                  </div>
                  <p className="text-xs text-lilac-muted leading-relaxed line-clamp-2">{alert.message}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-lilac-muted group-hover:text-lilac-accent group-hover:translate-x-0.5 transition-all self-center shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsDrawer;
