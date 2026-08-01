import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, LogIn, ShieldAlert, CheckCircle } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLoginSubmit: (identifier: string) => Promise<{ ok: boolean; profile?: UserProfile; error?: string }>;
  onLoginSuccess: (profile: UserProfile) => void;
  onOpenJoin: () => void;
}

export default function LoginModal({ onClose, onLoginSubmit, onLoginSuccess, onOpenJoin }: LoginModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginDone, setLoginDone] = useState(false);
  const [loggedInName, setLoggedInName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your child\'s name or guardian\'s email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await onLoginSubmit(identifier.trim());
    setLoading(false);

    if (res.ok && res.profile) {
      setLoggedInName(res.profile.name);
      setLoginDone(true);
      setTimeout(() => {
        onLoginSuccess(res.profile!);
        onClose();
      }, 1400);
    } else {
      setErrorMsg(res.error || 'Could not find a member account with that name or email.');
    }
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
              Log In
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
          ) : (
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
                <span>{loading ? 'Looking up account...' : 'Log In'}</span>
              </button>

              <div className="pt-2 text-center text-xs text-[#4B6169]">
                Not a member yet?{' '}
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
          )}
        </div>
      </div>
    </div>
  );
}
