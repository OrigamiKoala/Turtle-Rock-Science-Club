import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, ShieldAlert, Smile, CheckSquare, Square, CheckCircle } from 'lucide-react';

interface JoinModalProps {
  onClose: () => void;
  onJoinSuccess: (profile: UserProfile) => void;
  onJoinSubmit?: (details: { name: string; school: string; role: string; parentName: string; email: string; childAge: string }) => void;
}

export default function JoinModal({ onClose, onJoinSuccess, onJoinSubmit }: JoinModalProps) {
  const [childName, setChildName] = useState('');
  const [school, setSchool] = useState('');
  const [parentName, setParentName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [email, setEmail] = useState('');

  const [goggleAgreement, setGoggleAgreement] = useState(false);
  const [curiosityAgreement, setCuriosityAgreement] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [joinedDone, setJoinedDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName || !school || !parentName || !email || !childAge) {
      setErrorMsg('Please fill in every field.');
      return;
    }
    if (!goggleAgreement || !curiosityAgreement) {
      setErrorMsg('Please check both boxes to continue.');
      return;
    }

    setErrorMsg('');
    setJoinedDone(true);

    if (onJoinSubmit) {
      onJoinSubmit({
        name: childName,
        school,
        role: 'Rookie Researcher',
        parentName,
        email,
        childAge
      });
    }

    const initialProfile: UserProfile = {
      name: childName,
      school,
      role: 'Rookie Researcher',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      level: 1,
      xp: 15,
      unlockedBadges: ['Foundation Member'],
      reservedMissionIds: [],
      newsletterSubscribed: false
    };

    setTimeout(() => {
      onJoinSuccess(initialProfile);
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1F3A42]/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="join-club-modal"
        className="w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl bg-[#FBF7EC] flex flex-col justify-between max-h-[90vh] animate-fade-in"
      >
        <div className="p-5 flex items-center justify-between bg-white border-b-2 border-[#1F3A42]/8">
          <div className="text-left">
            <h4 className="font-display font-bold text-lg leading-tight text-[#1F3A42]">
              Join the Club!
            </h4>
            <p className="text-[11px] text-[#4B6169] mt-0.5 font-sans">Takes about a minute.</p>
          </div>
          <button
            id="close-join-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-[#1F3A42]/5 rounded-full transition cursor-pointer text-[#4B6169] hover:text-[#1F3A42]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 text-left">
          {joinedDone ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle className="w-16 h-16 text-[#6CC24A]" />
              <h5 className="font-display font-bold text-lg text-[#2E7D46]">Welcome aboard!</h5>
              <p className="text-xs text-[#4B6169] max-w-xs leading-relaxed font-sans">
                We've logged 15 welcome XP and unlocked your Foundation Member badge!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">Scientist's First Name (Child)</label>
                <input id="join-child-name" type="text" placeholder="e.g. Timothy" value={childName} onChange={(e) => setChildName(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none" required />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">School</label>
                <input id="join-school" type="text" placeholder="e.g. Turtle Rock Elementary" value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="organization"
                  className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none" required />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-[11px] font-extrabold text-[#4B6169]">Age</label>
                  <input id="join-child-age" type="number" min="4" max="18" placeholder="9" value={childAge} onChange={(e) => setChildAge(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none" required />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-extrabold text-[#4B6169]">Guardian Name</label>
                  <input id="join-parent-name" type="text" placeholder="e.g. Dr. Sarah" value={parentName} onChange={(e) => setParentName(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#4B6169]">Parent Email</label>
                <input id="join-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none" required />
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="text-[11px] font-extrabold text-[#4B6169]">A couple promises</label>

                <button type="button" onClick={() => setGoggleAgreement(!goggleAgreement)} className="flex items-start gap-2.5 text-left text-xs cursor-pointer select-none">
                  <div className="mt-0.5 shrink-0 text-[#2E7D46]">
                    {goggleAgreement ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-[#4B6169] leading-relaxed font-sans">
                    We'll wear safety goggles and closed-toe shoes at every bench workshop.
                  </span>
                </button>

                <button type="button" onClick={() => setCuriosityAgreement(!curiosityAgreement)} className="flex items-start gap-2.5 text-left text-xs cursor-pointer select-none">
                  <div className="mt-0.5 shrink-0 text-[#2E7D46]">
                    {curiosityAgreement ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-[#4B6169] leading-relaxed font-sans">
                    We'll stay curious, ask questions, and share equipment kindly.
                  </span>
                </button>
              </div>

              {errorMsg && (
                <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {errorMsg}
                </p>
              )}

              <button
                id="submit-join-form"
                type="submit"
                className="w-full py-3 rounded-full font-display font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A]"
              >
                <Smile className="w-4 h-4" />
                <span>Count Us In!</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
