import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LoginParams, LoginResult, SimpleResult } from '../useSiteContent';
import { ACCOUNT_EMAILS_ENABLED } from '../config';
import { X, LogIn, ShieldAlert, CheckCircle, KeyRound } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLoginSubmit: (params: LoginParams) => Promise<LoginResult>;
  onLoginSuccess: (profile: UserProfile, sessionToken: string) => void;
  onRequestPasswordReset: (identifier: string) => Promise<SimpleResult>;
  onOpenJoin: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

type View = 'login' | 'needsPassword' | 'forgotRequest' | 'forgotSent';

export default function LoginModal({ onClose, onLoginSubmit, onLoginSuccess, onRequestPasswordReset, onOpenJoin }: LoginModalProps) {
  const [view, setView] = useState<View>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginDone, setLoginDone] = useState(false);
  const [loggedInName, setLoggedInName] = useState('');

  const finishLogin = (result: LoginResult) => {
    if (!result.ok || !result.profile || !result.sessionToken) return false;
    setLoggedInName(result.profile.name);
    setLoginDone(true);
    const profile = result.profile;
    const sessionToken = result.sessionToken;
    setTimeout(() => {
      onLoginSuccess(profile, sessionToken);
      onClose();
    }, 1400);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your child\'s name or guardian\'s email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const res = await onLoginSubmit({ identifier: identifier.trim(), password });
    setLoading(false);

    if (res.needsPasswordSetup) {
      setErrorMsg('');
      setView('needsPassword');
      return;
    }

    if (!finishLogin(res)) {
      setErrorMsg(res.error || 'Could not find a member account with that name or email.');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Those passwords don\'t match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const res = await onLoginSubmit({ identifier: identifier.trim(), newPassword });
    setLoading(false);

    if (!finishLogin(res)) {
      setErrorMsg(res.error || 'Could not set a password for that account.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setErrorMsg('Please enter your child\'s name or guardian\'s email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    await onRequestPasswordReset(forgotIdentifier.trim());
    setLoading(false);
    setView('forgotSent');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1F3A42]/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="login-club-modal"
        className="w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl bg-[#FBF7EC] flex flex-col justify-between animate-fade-in"
      >
        <div className="p-5 flex items-center justify-between bg-white border-b-2 border-[#1F3A42]/8">
          <div className="text-left">
            <h4 className="font-display font-bold text-lg leading-tight text-[#1F3A42]">
              {view === 'login' && 'Log In'}
              {view === 'needsPassword' && 'Set a Password'}
              {(view === 'forgotRequest' || view === 'forgotSent') && 'Reset Password'}
            </h4>
          </div>
          <button
            id="close-login-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-[#1F3A42]/5 rounded-full transition cursor-pointer text-[#4B6169] hover:text-[#1F3A42]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-left font-sans">
          {loginDone ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle className="w-16 h-16 text-[#6CC24A]" />
              <h5 className="font-display font-bold text-lg text-[#2E7D46]">Welcome back, {loggedInName}!</h5>
            </div>
          ) : view === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">Child's Name or Guardian's Email</label>
                <input
                  id="login-identifier-input"
                  type="text"
                  placeholder="e.g. Timothy or parent@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full p-3 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">Password</label>
                <input
                  id="login-password-input"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full p-3 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                id="submit-login-form"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full font-display font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer bg-[#1F3A42] text-white hover:bg-[#14282e] shadow-md disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Logging in...' : 'Log In'}</span>
              </button>

              <div className={`flex items-center pt-1 text-xs text-[#4B6169] ${ACCOUNT_EMAILS_ENABLED ? 'justify-between' : 'justify-end'}`}>
                {ACCOUNT_EMAILS_ENABLED && (
                  <button
                    id="open-forgot-password"
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setForgotIdentifier(identifier);
                      setView('forgotRequest');
                    }}
                    className="font-bold text-[#4B6169] hover:text-[#1F3A42] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenJoin();
                  }}
                  className="font-bold text-[#2E7D46] hover:underline cursor-pointer"
                >
                  Join the Club
                </button>
              </div>
            </form>
          ) : view === 'needsPassword' ? (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <p className="text-xs text-[#4B6169] leading-relaxed flex items-start gap-2">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-[#2E7D46]" />
                This account was created before passwords existed — set one now to finish logging in.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">New Password</label>
                <input
                  id="setup-new-password-input"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full p-3 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">Confirm Password</label>
                <input
                  id="setup-confirm-password-input"
                  type="password"
                  placeholder="Retype it"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full p-3 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                id="submit-setup-password-form"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full font-display font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer bg-[#1F3A42] text-white hover:bg-[#14282e] shadow-md disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Set Password & Log In'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setErrorMsg(''); setView('login'); }}
                className="w-full text-center text-xs font-bold text-[#4B6169] hover:text-[#1F3A42] hover:underline cursor-pointer"
              >
                Back to log in
              </button>
            </form>
          ) : view === 'forgotRequest' ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-[#4B6169] leading-relaxed">
                Enter your child's name or guardian's email. If that account has a verified email on file, we'll send a reset link.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">Child's Name or Guardian's Email</label>
                <input
                  id="forgot-identifier-input"
                  type="text"
                  placeholder="e.g. Timothy or parent@example.com"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  className="w-full p-3 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                  autoFocus
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                id="submit-forgot-password-form"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full font-display font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer bg-[#1F3A42] text-white hover:bg-[#14282e] shadow-md disabled:opacity-50"
              >
                <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setErrorMsg(''); setView('login'); }}
                className="w-full text-center text-xs font-bold text-[#4B6169] hover:text-[#1F3A42] hover:underline cursor-pointer"
              >
                Back to log in
              </button>
            </form>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle className="w-16 h-16 text-[#6CC24A]" />
              <h5 className="font-display font-bold text-lg text-[#2E7D46]">Check your email</h5>
              <p className="text-xs text-[#4B6169] max-w-xs leading-relaxed">
                If that account has a verified email on file, a reset link is on its way.
              </p>
              <button
                id="close-forgot-sent"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full font-display font-bold text-xs cursor-pointer bg-[#1F3A42] text-white"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
