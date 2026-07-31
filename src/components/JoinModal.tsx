import React, { useState } from 'react';
import { ClubIdentity, UserProfile } from '../types';
import { X, ShieldAlert, Award, Smile, CheckSquare, Square, CheckCircle } from 'lucide-react';

interface JoinModalProps {
  identity: ClubIdentity;
  onClose: () => void;
  onJoinSuccess: (profile: UserProfile) => void;
}

export default function JoinModal({
  identity,
  onClose,
  onJoinSuccess
}: JoinModalProps) {
  const isTurtle = identity === 'turtlerock';

  // Form states
  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [email, setEmail] = useState('');
  
  // Custom checklist
  const [goggleAgreement, setGoggleAgreement] = useState(false);
  const [curiosityAgreement, setCuriosityAgreement] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [joinedDone, setJoinedDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName || !parentName || !email || !childAge) {
      setErrorMsg('Please populate all scientific record fields.');
      return;
    }
    if (!goggleAgreement || !curiosityAgreement) {
      setErrorMsg('Mandatory safety and curiosity oaths must be validated.');
      return;
    }

    setErrorMsg('');
    setJoinedDone(true);

    const initialProfile: UserProfile = {
      name: childName,
      role: 'Novice Discovery Scholar',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      level: 1,
      xp: 15, // starts with some welcome XP
      unlockedBadges: ['Foundation Member'],
      reservedMissionIds: [],
      newsletterSubscribed: false
    };

    setTimeout(() => {
      onJoinSuccess(initialProfile);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        id="join-club-modal"
        className="w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl text-white flex flex-col justify-between max-h-[90vh]"
      >
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/40">
          <div className="text-left">
            <h4 className="font-display font-bold text-lg leading-tight text-white tracking-tighter">
              {isTurtle ? 'Join the Turtle Rock Science Club' : 'Register at Kinetic Lab'}
            </h4>
            <p className="text-[9px] text-zinc-500 mt-0.5 font-mono uppercase tracking-widest">Create your official Scientist Profile ID</p>
          </div>
          <button
            id="close-join-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full transition cursor-pointer text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-left">
          {joinedDone ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle className="w-16 h-16 text-emerald-500 fill-emerald-950 animate-bounce" />
              <h5 className="font-display font-bold text-lg text-emerald-400 font-mono uppercase tracking-wider">Verified Scientist ID!</h5>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed font-sans">
                Welcome to the laboratory network. We have logged 15 welcome XP points and unlocked your Foundation Member badge!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              
              {/* Child Pseudonym */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Scientist's First Name (Child)</label>
                <input
                  id="join-child-name"
                  type="text"
                  placeholder="e.g. Timothy"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                  required
                />
              </div>

              {/* Age & Parent Names */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Age</label>
                  <input
                    id="join-child-age"
                    type="number"
                    min="4"
                    max="18"
                    placeholder="9"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                    required
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500 font-mono">Guardian Name</label>
                  <input
                    id="join-parent-name"
                    type="text"
                    placeholder="e.g. Dr. Sarah"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                    required
                  />
                </div>
              </div>

              {/* Contact Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Safety Email (Parent)</label>
                <input
                  id="join-email"
                  type="email"
                  placeholder="parent-scientist@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                  required
                />
              </div>

              {/* The Scientist's Oath Checklist */}
              <div className="space-y-2.5 pt-2">
                <label className="text-[9px] font-bold font-mono tracking-widest uppercase text-zinc-500">Scientist Oaths</label>
                
                {/* Checkbox A */}
                <button
                  type="button"
                  onClick={() => setGoggleAgreement(!goggleAgreement)}
                  className="flex items-start gap-2.5 text-left text-xs cursor-pointer select-none"
                >
                  <div className={`mt-0.5 shrink-0 p-0.5 rounded ${isTurtle ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {goggleAgreement ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="opacity-95 text-xs text-zinc-400 leading-relaxed font-sans">
                    I agree to prioritize safety by wearing impact safety goggles and closed-toe shoes at all bench workstations.
                  </span>
                </button>

                {/* Checkbox B */}
                <button
                  type="button"
                  onClick={() => setCuriosityAgreement(!curiosityAgreement)}
                  className="flex items-start gap-2.5 text-left text-xs cursor-pointer select-none"
                >
                  <div className={`mt-0.5 shrink-0 p-0.5 rounded ${isTurtle ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {curiosityAgreement ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="opacity-95 text-xs text-zinc-400 leading-relaxed font-sans">
                    I promise to remain intensely curious, ask questions, and share equipment politely with other junior scientists.
                  </span>
                </button>
              </div>

              {errorMsg && (
                <p className="text-[10px] text-red-400 font-mono uppercase tracking-wide flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
                  {errorMsg}
                </p>
              )}

              {/* Submit Button */}
              <button
                id="submit-join-form"
                type="submit"
                className={`w-full py-3 rounded-full font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isTurtle
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                    : 'bg-blue-500 hover:bg-blue-400 text-stone-950'
                }`}
              >
                <Smile className="w-4 h-4" />
                <span>Verify Scientist Records</span>
              </button>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
