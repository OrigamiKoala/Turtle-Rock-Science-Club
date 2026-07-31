import React, { useEffect, useRef, useState } from 'react';
import { Mission } from '../types';
import { SignupDetails, SignupResult } from '../useSiteContent';
import { X, Calendar, Clock, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SignupModalProps {
  mission: Mission;
  onClose: () => void;
  onSubmit: (details: SignupDetails) => Promise<SignupResult>;
  /** Called once the signup is confirmed, so the parent can record it. */
  onSuccess: (missionId: string) => void;
}

const LAST_SCHOOL_KEY = 'tr_sc_last_school';

export default function SignupModal({ mission, onClose, onSubmit, onSuccess }: SignupModalProps) {
  const [studentName, setStudentName] = useState('');
  // Families usually sign up siblings from the same school, so remember it.
  const [school, setSchool] = useState(() => {
    try {
      return localStorage.getItem(LAST_SCHOOL_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<SignupResult | null>(null);

  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = studentName.trim();
    const trimmedSchool = school.trim();

    if (!trimmedName) {
      setError('Please enter the student’s name.');
      return;
    }
    if (!trimmedSchool) {
      setError('Please enter the school.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await onSubmit({
      eventId: mission.id,
      eventTitle: mission.title,
      studentName: trimmedName,
      school: trimmedSchool
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Something went wrong. Please try again.');
      return;
    }

    try {
      localStorage.setItem(LAST_SCHOOL_KEY, trimmedSchool);
    } catch {
      // Not worth failing a successful signup over.
    }

    setConfirmed(result);
    onSuccess(mission.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Sign up for ${mission.title}`}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4 bg-zinc-950/40">
          <div className="text-left min-w-0">
            <p className="text-[9px] text-emerald-500 font-mono uppercase tracking-widest mb-1">
              Event Sign-Up
            </p>
            <h4 className="font-display font-bold text-lg leading-tight text-white tracking-tighter truncate">
              {mission.title}
            </h4>
          </div>
          <button
            id="close-signup-modal"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmed ? (
          /* ---------------------------------------------------- confirmation */
          <div className="p-6 space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h5 className="font-display font-bold text-xl text-white">You’re signed up!</h5>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                <strong className="text-white">{studentName.trim()}</strong> is booked in for{' '}
                <strong className="text-white">{mission.title}</strong>. We’ve saved it to the club
                register.
              </p>
            </div>

            {typeof confirmed.spotsLeft === 'number' && (
              <p className="text-[11px] font-mono text-zinc-500">
                {confirmed.spotsLeft === 0
                  ? 'That was the last spot!'
                  : `${confirmed.spotsLeft} spot${confirmed.spotsLeft === 1 ? '' : 's'} still open`}
              </p>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs uppercase tracking-widest cursor-pointer transition"
            >
              Done
            </button>
          </div>
        ) : (
          /* ----------------------------------------------------------- form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Event summary so people know what they are booking */}
            <div className="space-y-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-950/50 border border-white/5 rounded-xl px-3.5 py-3">
              {mission.date && (
                <p className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {mission.date}
                </p>
              )}
              {mission.time && (
                <p className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {mission.time}
                </p>
              )}
              {mission.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {mission.location}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-student-name"
                className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500"
              >
                Student Name
              </label>
              <input
                id="signup-student-name"
                ref={nameRef}
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Alex Chen"
                autoComplete="name"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-white/10 bg-zinc-950/60 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-school"
                className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500"
              >
                School
              </label>
              <input
                id="signup-school"
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Turtle Rock Elementary"
                autoComplete="organization"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-white/10 bg-zinc-950/60 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="font-sans leading-relaxed">{error}</span>
              </div>
            )}

            <button
              id="submit-signup-form"
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-stone-950 disabled:opacity-60 disabled:cursor-wait"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing up…
                </>
              ) : (
                'Confirm Sign-Up'
              )}
            </button>

            <p className="text-[10px] text-zinc-600 font-sans text-center leading-relaxed">
              We only record the student’s name and school so mentors know who to expect.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
