/**
 * Profile & Settings Screen (Profile.jsx)
 * ---------------------------------------
 * User account management:
 * 1. User identity display (name, email)
 * 2. Editable monthly target budget (saved and synced with backend)
 * 3. Notification preference toggles (warranty, return, recurring, budget) saved in localStorage
 * 4. Dark mode / Light mode toggle
 * 5. Quick shortcuts to all sub-modules
 * 6. Logout action
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import {
  User,
  Moon,
  Sun,
  Bell,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  Users,
  Search,
  LogOut,
  ChevronRight,
  Edit2,
  Check,
  CreditCard,
  Clock,
  TrendingUp,
  Fingerprint,
  KeyRound,
  Trash2,
  Plus,
  Lock,
  X,
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  isPasskeySupported,
  getRegisteredPasskeys,
  registerPasskey,
  removePasskey,
} from '../services/passkey';

const Profile = () => {
  const { user, logout, updateUserLocally } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Budget Editing State
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(user?.monthlyBudget || 25000);

  // Feature 2: Passkeys & Security State
  const [passkeys, setPasskeys] = useState([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [enrollingPasskey, setEnrollingPasskey] = useState(false);
  const [deleteConfirmPasskey, setDeleteConfirmPasskey] = useState(null);
  const [isDeletingPasskey, setIsDeletingPasskey] = useState(false);

  const fetchPasskeys = async () => {
    try {
      setLoadingPasskeys(true);
      const list = await getRegisteredPasskeys();
      setPasskeys(list || []);
    } catch (err) {
      console.warn('Could not fetch passkeys:', err);
    } finally {
      setLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleOpenAddPasskeyModal = () => {
    const defaultName = `${/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Phone' : 'Device'} Passkey (${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})`;
    setNewPasskeyName(defaultName);
    setShowAddPasskeyModal(true);
  };

  const handleEnrollPasskey = async (e) => {
    if (e) e.preventDefault();
    try {
      setEnrollingPasskey(true);
      const label = newPasskeyName.trim() || 'Personal Device Passkey';
      await registerPasskey(label);
      showToast('Passkey enrolled! You can now sign in using biometrics. 🔐', 'success');
      setShowAddPasskeyModal(false);
      await fetchPasskeys();
    } catch (err) {
      console.warn('Passkey setup note:', err.message);
      showToast(err.message || 'Passkey setup cancelled.', 'info');
    } finally {
      setEnrollingPasskey(false);
    }
  };

  const handleDeletePasskeyClick = (pk) => {
    setDeleteConfirmPasskey(pk);
  };

  const executeDeletePasskey = async () => {
    if (!deleteConfirmPasskey) return;
    try {
      setIsDeletingPasskey(true);
      await removePasskey(deleteConfirmPasskey.credentialID);
      showToast('Passkey removed from this account.', 'info');
      setDeleteConfirmPasskey(null);
      await fetchPasskeys();
    } catch (err) {
      showToast(err.message || 'Could not delete passkey.', 'error');
    } finally {
      setIsDeletingPasskey(false);
    }
  };

  // Local Notification Preferences (saved in localStorage)
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('billsnap_notifications');
    return saved
      ? JSON.parse(saved)
      : {
        warranties: true,
        returns: true,
        recurring: true,
        budget: true,
      };
  });

  const handleToggleNotification = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem('billsnap_notifications', JSON.stringify(updated));
    showToast('Notification preference updated.', 'success');
  };

  const handleSaveBudget = async () => {
    try {
      const val = Number(budgetInput);
      if (isNaN(val) || val <= 0) {
        showToast('Please enter a valid positive budget amount', 'error');
        return;
      }

      const res = await api.put('/auth/profile', { monthlyBudget: val });
      if (res.data?.user) {
        updateUserLocally(res.data.user);
      } else {
        updateUserLocally({ monthlyBudget: val });
      }
      setIsEditingBudget(false);
      showToast('Monthly budget updated successfully! 💳', 'success');
    } catch (err) {
      console.error('Failed to update budget on server:', err);
      // Fallback locally
      updateUserLocally({ monthlyBudget: Number(budgetInput) });
      setIsEditingBudget(false);
      showToast('Monthly budget updated locally! 💳', 'success');
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully. See you soon! 👋', 'info');
    navigate('/login');
  };

  return (
    <div className="pb-36 pt-2 px-4 max-w-md mx-auto">
      <PageHeader title="Profile & Settings" subtitle="Account controls and preferences" />

      {/* User Hero Card */}
      <div className="p-6 rounded-3xl bg-lilac-surface border border-lilac-border shadow-soft mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-lilac-accent to-[#8B5CF6] text-white flex items-center justify-center font-bold text-xl font-heading shadow-md">
          {user?.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold font-heading text-lilac-text truncate">
            {user?.name || 'BillSnap User'}
          </h2>
          <p className="text-xs text-lilac-muted truncate mt-0.5">{user?.email}</p>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F3E6] text-[#0E7A52] border border-[#b7ebd0]">
            Pro Plan (Free for Beta)
          </span>
        </div>
      </div>

      {/* Editable Target Budget Card */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-lilac-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
              Monthly Target Budget
            </span>
          </div>
          {!isEditingBudget && (
            <button
              onClick={() => {
                setBudgetInput(user?.monthlyBudget || 25000);
                setIsEditingBudget(true);
              }}
              className="text-xs font-bold text-lilac-accent hover:underline flex items-center gap-1 p-1 min-h-[36px]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditingBudget ? (
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-lilac-muted">
                ₹
              </span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-lilac-bg border border-lilac-border text-xs font-bold text-lilac-text focus:outline-none"
              />
            </div>
            <button
              onClick={handleSaveBudget}
              className="px-3 py-2 rounded-xl bg-lilac-accent text-white font-bold text-xs flex items-center gap-1 hover:opacity-90 min-h-[40px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              onClick={() => setIsEditingBudget(false)}
              className="px-3 py-2 rounded-xl bg-lilac-bg border border-lilac-border text-xs font-bold text-lilac-muted min-h-[40px]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-extrabold font-heading text-lilac-text">
              {formatCurrency(user?.monthlyBudget || 25000)}
            </div>
            <span className="text-[11px] text-lilac-muted">Adjusts progress bars</span>
          </div>
        )}
      </Card>

      {/* Profile -> Security & Passkeys */}
      <Card className="mb-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lilac-cardSubtle flex items-center justify-center text-lilac-accent">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-text">
                Security &amp; Passkeys
              </h3>
              <p className="text-[10px] text-lilac-muted">
                Use Face ID, Touch ID or device passcode to sign in.
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              passkeys.length > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-lilac-bg text-lilac-muted border-lilac-border'
            }`}
          >
            {passkeys.length > 0 ? `${passkeys.length} Enrolled` : 'Not Configured'}
          </span>
        </div>

        {/* Passkeys Device List */}
        {loadingPasskeys ? (
          <div className="p-3 text-center text-xs text-lilac-muted animate-pulse">
            Loading passkey credentials...
          </div>
        ) : passkeys.length > 0 ? (
          <div className="space-y-2 pt-1">
            {passkeys.map((pk) => (
              <div
                key={pk.credentialID}
                className="p-3 rounded-2xl bg-lilac-bg border border-lilac-border flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-lilac-surface border border-lilac-border flex items-center justify-center text-emerald-500 shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-lilac-text truncate">
                      {pk.friendlyName || 'Enrolled Passkey'}
                    </div>
                    <div className="text-[10px] text-lilac-muted">
                      Created {formatDate(pk.createdAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePasskeyClick(pk)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                  aria-label="Remove passkey"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-lilac-bg border border-lilac-border text-center text-xs text-lilac-muted">
            No passkeys registered yet. Add one to sign in with biometric authentication.
          </div>
        )}

        {/* Add / Enroll Passkey Button */}
        <button
          onClick={handleOpenAddPasskeyModal}
          className="w-full py-3 px-4 rounded-2xl bg-lilac-cardSubtle border border-lilac-accent/30 text-lilac-accent font-bold text-xs flex items-center justify-center gap-2 hover:bg-lilac-card transition-all active:scale-[0.98] min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Passkey / Enroll Device</span>
        </button>
      </Card>

      {/* Preferences Section: Dark Mode & Notifications */}
      <Card className="mb-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-lilac-muted">
          Preferences
        </h3>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lilac-cardSubtle flex items-center justify-center text-lilac-accent">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-lilac-text">Dark Mode</div>
              <div className="text-[10px] text-lilac-muted">
                {isDark ? 'Deep plum dark mode' : 'Soft lilac light mode'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isDark ? 'bg-lilac-accent' : 'bg-slate-300'
              }`}
            aria-label="Toggle dark mode"
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'
                }`}
            />
          </button>
        </div>

        {/* Local Notification Toggles */}
        <div className="space-y-3 pt-2 border-t border-lilac-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-lilac-text font-medium">Warranty Expiry Alerts (&lt;30 days)</span>
            <input
              type="checkbox"
              checked={notifications.warranties}
              onChange={() => handleToggleNotification('warranties')}
              className="accent-lilac-accent w-4 h-4 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-lilac-text font-medium">Return Window Deadlines (&le;2 days)</span>
            <input
              type="checkbox"
              checked={notifications.returns}
              onChange={() => handleToggleNotification('returns')}
              className="accent-lilac-accent w-4 h-4 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-lilac-text font-medium">Recurring Subscriptions Due (&le;3 days)</span>
            <input
              type="checkbox"
              checked={notifications.recurring}
              onChange={() => handleToggleNotification('recurring')}
              className="accent-lilac-accent w-4 h-4 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-lilac-text font-medium">Budget Warning at &ge;80%</span>
            <input
              type="checkbox"
              checked={notifications.budget}
              onChange={() => handleToggleNotification('budget')}
              className="accent-lilac-accent w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Quick Navigation Shortcuts */}
      <Card className="mb-5 p-3 space-y-1">
        {[
          { label: 'EMI Loan Tracker', path: '/emis', icon: CreditCard },
          { label: 'Warranty Vault', path: '/warranties', icon: ShieldCheck },
          { label: 'Return Countdown', path: '/returns', icon: RotateCcw },
          { label: 'Bill Timeline', path: '/timeline', icon: Clock },
          { label: 'Price History', path: '/price-history', icon: TrendingUp },
          { label: 'Recurring Bills', path: '/recurring', icon: RefreshCw },
          { label: 'Bill Splitting', path: '/split', icon: Users },
          { label: 'Ask BillSnap', path: '/search', icon: Search },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-lilac-cardSubtle text-xs font-semibold text-lilac-text transition-all min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-lilac-accent" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-lilac-muted" />
            </button>
          );
        })}
      </Card>

      {/* Logout Action */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition-all active:scale-[0.98] shadow-sm min-h-[44px]"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of BillSnap</span>
      </button>

      {/* Add Passkey Modal */}
      {showAddPasskeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-lilac-surface border border-lilac-border p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddPasskeyModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-lilac-muted hover:bg-lilac-card transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-3xl bg-lilac-card text-lilac-accent flex items-center justify-center mb-4 mx-auto border border-lilac-accent/20 shadow-inner">
              <Fingerprint className="w-7 h-7 text-emerald-500" />
            </div>

            <h3 className="text-lg font-extrabold text-center text-lilac-text mb-1">
              Enroll New Passkey
            </h3>
            <p className="text-xs text-center text-lilac-muted leading-relaxed mb-4">
              Enter a recognizable label for this device to easily manage it later.
            </p>

            <form onSubmit={handleEnrollPasskey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-lilac-text mb-1.5">
                  Device Name / Nickname
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My iPhone 15, Work MacBook"
                  value={newPasskeyName}
                  onChange={(e) => setNewPasskeyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddPasskeyModal(false)}
                  disabled={enrollingPasskey}
                  className="w-full py-3 px-3 rounded-2xl bg-lilac-card text-lilac-text border border-lilac-border font-semibold text-xs hover:bg-lilac-surface transition-all min-h-[44px]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={enrollingPasskey}
                  className="w-full py-3 px-3 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 min-h-[44px] disabled:opacity-50"
                >
                  {enrollingPasskey ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Enroll Device</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Passkey Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteConfirmPasskey)}
        onClose={() => setDeleteConfirmPasskey(null)}
        onConfirm={executeDeletePasskey}
        isLoading={isDeletingPasskey}
        title="Remove Passkey?"
        message={`Are you sure you want to remove '${deleteConfirmPasskey?.friendlyName || 'this passkey'}'? You will no longer be able to use it to sign in to this account.`}
        confirmText="Remove Passkey"
        cancelText="Keep"
        isDanger={true}
      />
    </div>
  );
};

export default Profile;
