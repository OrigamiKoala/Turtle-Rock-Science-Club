import React, { useState } from 'react';
import { SimpleResult } from '../useSiteContent';
import { X, ShieldAlert, CheckCircle, KeyRound } from 'lucide-react';

interface ResetPasswordModalProps {
  token: string;
  onClose: () => void;
  onResetPassword: (token: string, newPassword: string) => Promise<SimpleResult>;
}

const MIN_PASSWORD_LENGTH = 8;

/**
 * Only ever mounted when the URL carries `?reset=<token>` (an emailed link) —
 * copies LoginModal's chrome so it reads as part of the same site rather than
 * a new design, but it's otherwise a standalone entry point.
 */
export default function ResetPasswordModal({ token, onClose, onResetPassword }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Those passwords don\'t match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const result = await onResetPassword(token, newPassword);
    setLoading(false);

    if (!result.ok) {
      setErrorMsg(result.error || 'That reset link is invalid or has expired.');
      return;
    }

    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1F3A42]/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="reset-password-modal"
        className="w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl bg-[#FBF7EC] flex flex-col justify-between animate-fade-in"
      >
        <div className="p-5 flex items-center justify-between bg-white border-b-2 border-[#1F3A42]/8">
          <div className="text-left">
            <h4 className="font-display font-bold text-lg leading-tight text-[#1F3A42]">
              Reset Password
            </h4>
          </div>
          <button
            id="close-reset-password-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-[#1F3A42]/5 rounded-full transition cursor-pointer text-[#4B6169] hover:text-[#1F3A42]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-left font-sans">
          {done ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle className="w-16 h-16 text-[#6CC24A]" />
              <h5 className="font-display font-bold text-lg text-[#2E7D46]">Password reset!</h5>
              <p className="text-xs text-[#4B6169] max-w-xs leading-relaxed">
                Please log in with your new password.
              </p>
              <button
                id="close-reset-done"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full font-display font-bold text-xs cursor-pointer bg-[#1F3A42] text-white"
              >
                Got it
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">New Password</label>
                <input
                  id="reset-new-password-input"
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
                  id="reset-confirm-password-input"
                  type="password"
                  placeholder="Retype it"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                id="submit-reset-password-form"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full font-display font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer bg-[#1F3A42] text-white hover:bg-[#14282e] shadow-md disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Set New Password'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
