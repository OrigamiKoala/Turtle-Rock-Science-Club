import React, { useEffect } from 'react';
import { MailCheck, AlertTriangle } from 'lucide-react';

interface ConfirmEmailModalProps {
  onClose: () => void;
}

/**
 * Shown immediately after someone subscribes, from the footer box or the Join
 * form. It is deliberately loud: the confirmation email frequently lands in
 * spam while the sending domain is still building reputation, and a subscriber
 * who never rescues it never gets confirmed.
 */
export default function ConfirmEmailModal({ onClose }: ConfirmEmailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-[#1F3A42]/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-email-heading"
    >
      <div
        id="confirm-email-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl bg-[#FBF7EC] animate-fade-in my-8"
      >
        <div className="bg-[#6CC24A] px-8 py-8 flex flex-col items-center text-center">
          <MailCheck className="w-20 h-20 text-[#14351F]" strokeWidth={1.5} />
          <h2
            id="confirm-email-heading"
            className="font-display font-bold text-3xl sm:text-4xl text-[#14351F] mt-3 leading-tight"
          >
            One more step!
          </h2>
        </div>

        <div className="px-7 sm:px-10 py-8 text-center space-y-6">
          <p className="font-sans text-lg sm:text-xl leading-relaxed text-[#1F3A42]">
            We just sent a confirmation email to you from
          </p>

          <p className="font-display font-bold text-xl sm:text-2xl text-[#2E7D46] break-all">
            contact@trscienceclub.org
          </p>

          <p className="font-sans text-base sm:text-lg leading-relaxed text-[#4B6169]">
            Open it and click the <strong className="text-[#1F3A42]">Confirm my email</strong> button.
            You won't receive anything from us until you do.
          </p>

          <div className="rounded-[24px] bg-[#E4F5DA] border-2 border-[#6CC24A] p-6 text-left flex gap-4 items-start">
            <AlertTriangle className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 text-[#2E7D46] mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-display font-bold text-lg sm:text-xl text-[#1F3A42]">
                Can't find it? Check your spam folder.
              </p>
              <p className="font-sans text-sm sm:text-base leading-relaxed text-[#3D5259]">
                If it landed there, please mark it{' '}
                <strong className="text-[#1F3A42]">"Not spam"</strong> so you don't miss future
                updates about sessions and sign-ups.
              </p>
            </div>
          </div>

          <button
            id="confirm-email-dismiss"
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-4 rounded-full font-display font-bold text-base sm:text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer bg-[#1F3A42] text-white shadow-[0_4px_0_#14282e]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
