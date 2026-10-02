/**
 * Login & Signup Screen (Login.jsx)
 * ----------------------------------
 * Modern, mobile-first authentication with:
 * - Traditional Email & Password (with client-side validation)
 * - Hardware & Biometric Passkey / WebAuthn Sign-in (Face ID, Touch ID, Windows Hello)
 * - Post-login Passkey enrollment prompt ("Set up a Passkey?")
 * - One-click Demo Credentials quick-fill
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Receipt,
  Lock,
  Mail,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  isPasskeySupported,
  authenticateWithPasskey,
  registerPasskey,
} from '../services/passkey';

const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    monthlyBudget: 25000,
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  // Post-login Passkey enrollment prompt state
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [pendingUserSession, setPendingUserSession] = useState(null);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  const { login, signup, setAuthenticatedSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const passkeyAvailable = isPasskeySupported();

  // Validate form fields
  const validate = () => {
    const errors = {};
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (!isLoginMode && !formData.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email (e.g. name@domain.com)';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle WebAuthn / Passkey Sign-in
   */
  const handlePasskeyLogin = async () => {
    try {
      setPasskeyLoading(true);
      const res = await authenticateWithPasskey(formData.email);
      if (res.verified && res.token && res.user) {
        setAuthenticatedSession(res.token, res.user);
        showToast(`Welcome back, ${res.user.name}! 🔐 Authenticated with Passkey.`, 'success');
        navigate('/');
      }
    } catch (err) {
      console.warn('Passkey sign-in note:', err.message);
      showToast(err.message || 'Passkey sign-in was cancelled or failed.', 'info');
    } finally {
      setPasskeyLoading(false);
    }
  };

  /**
   * Handle Password Login / Signup Submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    if (isLoginMode) {
      const res = await login(formData.email, formData.password);
      setLoading(false);
      if (res.success) {
        // If Passkeys supported and user hasn't enrolled, prompt to set one up
        if (passkeyAvailable && !localStorage.getItem(`passkey_dismissed_${formData.email}`)) {
          setPendingUserSession(res.user);
          setShowPasskeyPrompt(true);
        } else {
          showToast(`Welcome back, ${res.user.name}! 👋`, 'success');
          navigate('/');
        }
      } else {
        showToast(res.error, 'error');
      }
    } else {
      const res = await signup(
        formData.name,
        formData.email,
        formData.password,
        formData.monthlyBudget
      );
      setLoading(false);
      if (res.success) {
        if (passkeyAvailable) {
          setPendingUserSession(res.user);
          setShowPasskeyPrompt(true);
        } else {
          showToast('Account created successfully! Welcome to BillSnap 🧾', 'success');
          navigate('/');
        }
      } else {
        showToast(res.error, 'error');
      }
    }
  };

  /**
   * User accepts "Set up Passkey" from prompt
   */
  const handleConfirmEnrollPasskey = async () => {
    try {
      setRegisteringPasskey(true);
      const friendlyName = `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Device'} Passkey (${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})`;
      await registerPasskey(friendlyName);
      showToast('Passkey enrolled successfully! You can now use Face ID / Touch ID next time. 🔐', 'success');
      setShowPasskeyPrompt(false);
      navigate('/');
    } catch (err) {
      console.warn('Passkey enrollment note:', err.message);
      showToast(err.message || 'Passkey registration skipped.', 'info');
      setShowPasskeyPrompt(false);
      navigate('/');
    } finally {
      setRegisteringPasskey(false);
    }
  };

  /**
   * User skips "Set up Passkey" prompt
   */
  const handleDismissPasskeyPrompt = () => {
    if (formData.email) {
      localStorage.setItem(`passkey_dismissed_${formData.email}`, 'true');
    }
    setShowPasskeyPrompt(false);
    showToast(`Welcome to BillSnap, ${pendingUserSession?.name || 'there'}! 👋`, 'success');
    navigate('/');
  };

  // Quick helper to fill in demo account credentials
  const fillDemoCredentials = () => {
    setIsLoginMode(true);
    setFormData({
      name: '',
      email: 'demo@billsnap.in',
      password: 'demo123',
      monthlyBudget: 25000,
    });
    setFormErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-3 rounded-3xl bg-gradient-to-tr from-[#6544C7] to-[#8B5CF6] text-white flex items-center justify-center shadow-lg shadow-[#6544C7]/25">
          <Receipt className="w-9 h-9 stroke-[2.2]" />
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-lilac-text tracking-tight">
          BillSnap
        </h1>
        <p className="text-xs text-lilac-muted mt-1 font-medium">
          Smart Mobile Bill Organizer & Expense Tracker (₹)
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="bg-lilac-surface border border-lilac-border rounded-3xl p-6 shadow-soft">
        {/* Toggle Mode Segmented Control */}
        <div className="flex bg-lilac-bg p-1 rounded-2xl mb-6 border border-lilac-border/60">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(true);
              setFormErrors({});
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              isLoginMode
                ? 'bg-lilac-surface text-lilac-text shadow-sm'
                : 'text-lilac-muted hover:text-lilac-text'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(false);
              setFormErrors({});
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              !isLoginMode
                ? 'bg-lilac-surface text-lilac-text shadow-sm'
                : 'text-lilac-muted hover:text-lilac-text'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Feature 2: Passkey / Biometric Login Option (Prominent on Login Mode) */}
        {isLoginMode && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#5B3BC4] via-[#6544C7] to-[#7C3AED] text-white font-bold text-xs flex items-center justify-center gap-2.5 hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-[#6544C7]/25 min-h-[44px] border border-white/10 disabled:opacity-50"
            >
              {passkeyLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Sign in with Passkey / Biometrics</span>
                </>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-lilac-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-lilac-surface px-3 text-lilac-muted font-bold tracking-wider">
                  or sign in with password
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field (Signup only) */}
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-lilac-text mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lilac-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Naba Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-lilac-bg border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 transition-all ${
                    formErrors.name ? 'border-rose-400' : 'border-lilac-border'
                  }`}
                />
              </div>
              {formErrors.name && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">{formErrors.name}</p>
              )}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-lilac-text mb-1.5">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lilac-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="demo@billsnap.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-lilac-bg border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 transition-all ${
                  formErrors.email ? 'border-rose-400' : 'border-lilac-border'
                }`}
              />
            </div>
            {formErrors.email && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{formErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-lilac-text mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lilac-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-lilac-bg border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 transition-all ${
                  formErrors.password ? 'border-rose-400' : 'border-lilac-border'
                }`}
              />
            </div>
            {formErrors.password && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{formErrors.password}</p>
            )}
          </div>

          {/* Monthly Budget (Signup only) */}
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-lilac-text mb-1.5">
                Monthly Target Budget (₹)
              </label>
              <input
                type="number"
                placeholder="25000"
                value={formData.monthlyBudget}
                onChange={(e) => setFormData({ ...formData, monthlyBudget: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl bg-lilac-bg border border-lilac-border text-xs text-lilac-text focus:outline-none focus:ring-2 focus:ring-lilac-accent/30 transition-all"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-lilac-accent/20 min-h-[44px] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLoginMode ? 'Sign In to BillSnap' : 'Create BillSnap Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Login Quick Fill Button */}
        <div className="mt-5 pt-4 border-t border-lilac-border/60 text-center">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="w-full py-2.5 px-3 rounded-xl bg-lilac-cardSubtle border border-lilac-accent/30 text-lilac-accent font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-lilac-card transition-all min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Fill Demo Credentials (demo@billsnap.in)</span>
          </button>
        </div>
      </div>

      {/* Security Footer */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-lilac-muted mt-6">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>End-to-end user data isolation & FIDO2 Passkey support</span>
      </div>

      {/* Feature 2: Post-Login "Set up a Passkey?" Modal */}
      {showPasskeyPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-lilac-surface border border-lilac-border p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={handleDismissPasskeyPrompt}
              className="absolute top-4 right-4 p-2 rounded-full text-lilac-muted hover:bg-lilac-card transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-3xl bg-lilac-card text-lilac-accent flex items-center justify-center mb-4 mx-auto border border-lilac-accent/20 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-center text-lilac-text mb-1.5">
              Set up a Passkey?
            </h2>
            <p className="text-xs text-center text-lilac-muted leading-relaxed mb-6">
              Sign in faster next time using Face ID, Touch ID, or your device passcode without typing passwords.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleConfirmEnrollPasskey}
                disabled={registeringPasskey}
                className="w-full py-3.5 px-4 rounded-2xl bg-lilac-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-lilac-accent/20 min-h-[44px] disabled:opacity-50"
              >
                {registeringPasskey ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 text-emerald-300" />
                    <span>🔐 Set Up Passkey</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismissPasskeyPrompt}
                disabled={registeringPasskey}
                className="w-full py-3 px-4 rounded-2xl bg-transparent border border-lilac-border text-lilac-muted font-semibold text-xs hover:text-lilac-text hover:bg-lilac-card transition-all min-h-[44px]"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
