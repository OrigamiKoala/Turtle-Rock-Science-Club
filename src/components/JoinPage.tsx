import React, { useState } from 'react';
import { UserProfile } from '../types';
import { JoinResult, MemberJoinDetails } from '../useSiteContent';
import { ACCOUNT_EMAILS_ENABLED } from '../config';
import TurtleRockLogo from './TurtleRockLogo';
import { X, ShieldAlert, CheckSquare, Square, CheckCircle, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import videoConsentImg from '../assets/waivers/video-consent.jpg';
import liabilityWaiverPart1Img from '../assets/waivers/liability-waiver-part1.jpg';
import liabilityWaiverPart2Img from '../assets/waivers/liability-waiver-part2.jpg';

interface JoinPageProps {
  onClose: () => void;
  onJoinSuccess: (profile: UserProfile, sessionToken: string) => void;
  onJoinSubmit: (details: MemberJoinDetails) => Promise<JoinResult>;
}

// The field means grade, not age — the label always said so, while the old
// `childAge` name and its min="4" were AI-Studio-template leftovers (4–18 is an
// age span). A number input cannot express kindergarten, and that min silently
// blocked every K–3 family from submitting at all, so this is a fixed list.
const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const MIN_PASSWORD_LENGTH = 8;

// This page replicates the club's former standalone Saturday Science
// Seminars registration form — previously a separate Google Form writing to
// its own Sheet — directly on the site, one page per page break the source
// form actually has (verified against the form's own embedded JSON, not
// guessed): a single continuous info page, then a "Waivers" section, then a
// final section the form used to show the private Zoom link in. That last
// one is deliberately not reproduced — see below.
const INTRO_PARAGRAPHS = [
  'Saturday Science Seminars – Sept 12 to Oct 17',
  'Turtle Rock Science Club is excited to offer a series of FREE Saturday Science Seminars! These will run September 12 – October 17, every Saturday from 7:00–8:30 pm in person on Zoom.',
  'In person location for kickoff meeting: UCI School of Business, Building SB1. Students meet at Room 1128 on the first floor (Eric Yuan-Tsung Li Classroom). Parents meet at Room 2100 on the second floor.',
  'Sessions will be led by Science Olympiad students from University High School, Rancho San Joaquin Middle School and Sage Hill School, who are eager to inspire and teach our elementary scientists!',
  'Who can attend? All 5th and 6th grade students are welcome to attend.',
  'Important notes: Parents are required to attend the first 30 minutes of the Sept 12 kick-off to review procedures and rules (required if your student will join any training or interact with high/middle school coaches). Format is in person and Zoom — parking permits are needed for parking on campus. Registration & waiver are required by school/district rules. Recordings are NOT available since our students and coaches are minors — please attend if you want to participate. All students are expected to display their best behavior; failure to do so may result in being muted, banned, or permanently removed.',
  'Disclaimer: Turtle Rock Science Club is an independent organization and is not affiliated with Turtle Rock Elementary School or any other school, either officially or implicitly. All activities, events, and communications are solely organized and managed by the Turtle Rock Science Club. Turtle Rock refers to Turtle Rock Community Park where the group held their first meetings.'
];

const WAIVERS_SECTION_NOTE =
  'Please agree to the terms and conditions below. Thank you for your cooperation! Please note that for the video consent if selecting disagree, the students must ensure to turn off video and must mute microphone since the sessions may be recorded.';

// The actual document images (see Reference_Photos/ and
// apps-script/SETUP.md) are embedded directly below rather than retyped —
// that's the source of truth, not a transcription of it.

const WAIVER_CONSENT_LABEL_AGREE = 'Agree';
const WAIVER_CONSENT_LABEL_DISAGREE = 'Disagree (Will Not Participate)';

type Step = 'intro' | 'info' | 'waivers' | 'account' | 'done';
const STEPS: Step[] = ['intro', 'info', 'waivers', 'account'];
const STEP_LABELS: Record<Step, string> = {
  intro: 'Welcome',
  info: 'Registration Info',
  waivers: 'Waivers',
  account: 'Create Account',
  done: 'Done'
};

const inputClass =
  'w-full p-3 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]';
const labelClass = 'text-[11px] font-extrabold text-[#4B6169]';

// Same red-asterisk convention Google Forms uses for a required question —
// only on fields that are actually required (Parent 2's three fields are the
// one info-page exception; Password/Confirm are required by this site even
// though they weren't part of the original form).
const Required = () => <span className="text-red-500">&nbsp;*</span>;

export default function JoinPage({ onClose, onJoinSuccess, onJoinSubmit }: JoinPageProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex] ?? 'intro';

  // Page 1 — Registration Info (student + both parents, one continuous page
  // in the source form, no sub-breaks between the sections below).
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [parent1Name, setParent1Name] = useState('');
  const [parent1Email, setParent1Email] = useState('');
  const [parent1Phone, setParent1Phone] = useState('');
  const [parent2Name, setParent2Name] = useState('');
  const [parent2Email, setParent2Email] = useState('');
  const [parent2Phone, setParent2Phone] = useState('');

  // Page 2 — Waivers
  const [videoConsent, setVideoConsent] = useState<'' | 'Agree' | 'Disagree'>('');
  const [waiverConsent, setWaiverConsent] = useState<'' | typeof WAIVER_CONSENT_LABEL_AGREE | typeof WAIVER_CONSENT_LABEL_DISAGREE>('');

  // Page 3 — account creation (this site's own addition; not part of the
  // original form, which had no login system to create an account for).
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const goTo = (index: number) => {
    setErrorMsg('');
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep = (): string | null => {
    if (step === 'info') {
      if (!firstName.trim() || !lastName.trim() || !school.trim() || !childGrade || !studentEmail.trim()) {
        return 'Please fill in every required field.';
      }
      if (!isEmail(studentEmail)) return "That student email doesn't look right — check for a typo.";
      if (!parent1Name.trim() || !parent1Email.trim() || !parent1Phone.trim()) {
        return "Please fill in Parent 1's name, email, and phone number.";
      }
      if (!isEmail(parent1Email)) return "Parent 1's email doesn't look right — check for a typo.";
      if (parent2Email.trim() && !isEmail(parent2Email)) return "Parent 2's email doesn't look right — check for a typo.";
    }
    if (step === 'waivers') {
      if (!videoConsent) return 'Please answer the video consent question.';
      if (!waiverConsent) return 'Please answer the waiver and release of liability question.';
    }
    if (step === 'account') {
      if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      if (password !== confirmPassword) return "Those passwords don't match.";
    }
    return null;
  };

  const handleNext = () => {
    const problem = validateStep();
    if (problem) {
      setErrorMsg(problem);
      return;
    }
    goTo(stepIndex + 1);
  };

  const handleSubmit = async () => {
    const problem = validateStep();
    if (problem) {
      setErrorMsg(problem);
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    const result = await onJoinSubmit({
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      school,
      role: 'Rookie Researcher',
      parentName: parent1Name,
      email: parent1Email,
      studentEmail,
      childGrade,
      newsletterOptIn,
      password,
      parent1Phone,
      parent2Name,
      parent2Email,
      parent2Phone,
      videoConsent,
      waiverConsent
    });

    setSubmitting(false);

    if (!result.ok || !result.profile || !result.sessionToken) {
      setErrorMsg(result.error || 'Something went wrong. Please try again.');
      return;
    }

    setNeedsVerification(!!result.needsVerification);
    setStepIndex(STEPS.length); // 'done'
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const sessionToken = result.sessionToken;
    const profile = result.profile;
    onJoinSuccess(profile, sessionToken);
  };

  const isDone = stepIndex >= STEPS.length;
  const isLastStep = step === 'account';

  return (
    <div className="min-h-screen bg-[#FBF7EC] text-[#1F3A42] flex flex-col">
      <header className="border-b-2 border-[#1F3A42]/8 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            id="join-page-brand"
            onClick={onClose}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <TurtleRockLogo size={36} hideText={true} />
            <span className="font-hero font-bold text-sm text-[#1F3A42]">Turtle Rock Science Club</span>
          </button>
          <button
            id="close-join-page"
            onClick={onClose}
            aria-label="Back to site"
            title="Back to site"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1F3A42]/5 text-[#4B6169] hover:text-[#1F3A42] cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {!isDone && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#4B6169] mb-1.5">
              <span>{STEP_LABELS[step]}</span>
              <span>Step {stepIndex + 1} of {STEPS.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1F3A42]/8">
              <div
                className="h-full rounded-full bg-[#6CC24A] transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {isDone ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="w-20 h-20 text-[#6CC24A]" />
            <h1 className="font-display font-bold text-3xl text-[#2E7D46]">You're all set!</h1>
            <p className="text-sm text-[#4B6169] max-w-sm leading-relaxed">
              We've logged 15 welcome XP and unlocked your Foundation Member badge!
            </p>
            {ACCOUNT_EMAILS_ENABLED && needsVerification && (
              <p className="text-xs font-bold text-[#2E7D46]">Check your email to verify your address.</p>
            )}
            {newsletterOptIn && (
              <p className="text-xs font-bold text-[#2E7D46]">Check your email to confirm your newsletter subscription.</p>
            )}
            <button
              id="join-done-continue"
              onClick={onClose}
              className="mt-4 px-8 py-3 rounded-full font-display font-bold text-sm cursor-pointer bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A]"
            >
              Go to the site
            </button>
          </div>
        ) : (
          <div className="space-y-6 font-sans">
            {step === 'intro' && (
              <div className="space-y-4">
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#1F3A42]">
                  Registration for Turtle Rock Science Club
                </h1>
                <div className="space-y-3 bg-white rounded-2xl border-2 border-[#1F3A42]/8 p-5">
                  {INTRO_PARAGRAPHS.map((p, i) => (
                    <p key={i} className="text-sm text-[#4B6169] leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            )}

            {step === 'info' && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-lg text-[#1F3A42]">Student</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelClass}>Student's First Name<Required /></label>
                      <input id="join-first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Student's Last Name<Required /></label>
                      <input id="join-last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Student's Elementary School<Required /></label>
                      <input id="join-school" type="text" placeholder="e.g. Turtle Rock Elementary" value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="organization" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="join-child-grade" className={labelClass}>Student's Grade<Required /></label>
                      <select id="join-child-grade" value={childGrade} onChange={(e) => setChildGrade(e.target.value)} className={inputClass}>
                        <option value="">Pick one</option>
                        {GRADE_OPTIONS.map((grade) => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className={labelClass}>Student's Email<Required /></label>
                      <input id="join-student-email" type="email" placeholder="student@example.com" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="font-display font-bold text-lg text-[#1F3A42]">Parent 1</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 sm:col-span-2">
                      <label className={labelClass}>Parent 1's Name (First and Last)<Required /></label>
                      <input id="join-parent1-name" type="text" value={parent1Name} onChange={(e) => setParent1Name(e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Parent 1's Email<Required /></label>
                      <input id="join-parent1-email" type="email" placeholder="parent@example.com" value={parent1Email} onChange={(e) => setParent1Email(e.target.value)} className={inputClass} />
                      <p className="text-[10px] text-[#4B6169] leading-relaxed">May be shared with other families in the club to facilitate club activities.</p>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Parent 1's Cell Phone Number<Required /></label>
                      <input id="join-parent1-phone" type="tel" value={parent1Phone} onChange={(e) => setParent1Phone(e.target.value)} className={inputClass} />
                      <p className="text-[10px] text-[#4B6169] leading-relaxed">May be shared with other families in the club to facilitate club activities.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="font-display font-bold text-lg text-[#1F3A42]">Parent 2 <span className="font-sans font-normal text-xs text-[#4B6169]">(optional)</span></h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 sm:col-span-2">
                      <label className={labelClass}>Parent 2's Name (First and Last)</label>
                      <input id="join-parent2-name" type="text" value={parent2Name} onChange={(e) => setParent2Name(e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Parent 2's Email</label>
                      <input id="join-parent2-email" type="email" value={parent2Email} onChange={(e) => setParent2Email(e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Parent 2's Cell Phone Number</label>
                      <input id="join-parent2-phone" type="tel" value={parent2Phone} onChange={(e) => setParent2Phone(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'waivers' && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F3A42]">Turtle Rock Science Club Waivers</h2>
                  <p className="text-xs text-[#4B6169] leading-relaxed mt-1">{WAIVERS_SECTION_NOTE}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-display font-bold text-base text-[#1F3A42]">Video Consent and Release Form<Required /></h3>
                  <div className="bg-white rounded-2xl border-2 border-[#1F3A42]/8 p-3">
                    <img src={videoConsentImg} alt="Video Consent and Release Form" className="w-full rounded-lg" />
                  </div>
                  <p className="text-[11px] font-bold text-[#B8860B]">
                    Note: if selecting Disagree, parents are expected to MUTE, SHUT OFF video, and NOT participate in public chat since all sessions are being recorded.
                  </p>
                  <div className="flex gap-2">
                    {(['Agree', 'Disagree'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        id={`join-video-consent-${opt.toLowerCase()}`}
                        onClick={() => setVideoConsent(opt)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 cursor-pointer transition ${videoConsent === opt ? 'bg-[#6CC24A]/20 border-[#6CC24A] text-[#2E7D46]' : 'bg-white border-[#1F3A42]/12 text-[#4B6169] hover:border-[#1F3A42]/25'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-display font-bold text-base text-[#1F3A42]">Waiver and Release of Liability<Required /></h3>
                  <div className="bg-white rounded-2xl border-2 border-[#1F3A42]/8 p-3 space-y-3">
                    <img src={liabilityWaiverPart1Img} alt="Waiver and Release of Liability, page 1" className="w-full rounded-lg" />
                    <img src={liabilityWaiverPart2Img} alt="Waiver and Release of Liability, page 2" className="w-full rounded-lg" />
                  </div>
                  <p className="text-[11px] font-bold text-[#B8860B]">Note: agreement is required for participating in the training.</p>
                  <div className="flex gap-2">
                    {([WAIVER_CONSENT_LABEL_AGREE, WAIVER_CONSENT_LABEL_DISAGREE] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        id={`join-waiver-consent-${opt === WAIVER_CONSENT_LABEL_AGREE ? 'agree' : 'disagree'}`}
                        onClick={() => setWaiverConsent(opt)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 cursor-pointer transition ${waiverConsent === opt ? 'bg-[#6CC24A]/20 border-[#6CC24A] text-[#2E7D46]' : 'bg-white border-[#1F3A42]/12 text-[#4B6169] hover:border-[#1F3A42]/25'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F3A42]">Create Your Account</h2>
                  <p className="text-xs text-[#4B6169] leading-relaxed mt-1">
                    Not part of the original registration — this is what lets your family log back in to the site afterward.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Password<Required /></label>
                    <div className="relative">
                      <input
                        id="join-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        id="join-password-toggle"
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B6169] hover:text-[#1F3A42] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Confirm Password<Required /></label>
                    <div className="relative">
                      <input
                        id="join-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Retype it"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        id="join-confirm-password-toggle"
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B6169] hover:text-[#1F3A42] cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  id="join-newsletter-optin"
                  type="button"
                  onClick={() => setNewsletterOptIn(!newsletterOptIn)}
                  className="flex items-start gap-2.5 text-left text-xs cursor-pointer select-none w-full rounded-xl p-3 bg-white border-2 border-[#1F3A42]/12"
                >
                  <div className="mt-0.5 shrink-0 text-[#2E7D46]">
                    {newsletterOptIn ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-[#4B6169] leading-relaxed">
                    Send me the weekly club newsletter — upcoming events, club information, and more. Unsubscribe any time.
                  </span>
                </button>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-500 font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              {stepIndex > 0 && (
                <button
                  id="join-back-btn"
                  type="button"
                  onClick={() => goTo(stepIndex - 1)}
                  className="px-5 py-3 rounded-full font-display font-bold text-sm cursor-pointer bg-white border-2 border-[#1F3A42]/12 text-[#4B6169] flex items-center gap-1.5 hover:bg-[#1F3A42]/5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                id={isLastStep ? 'submit-join-form' : 'join-next-btn'}
                type="button"
                disabled={submitting}
                onClick={isLastStep ? handleSubmit : handleNext}
                className="flex-1 py-3 rounded-full font-display font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer bg-[#6CC24A] text-[#14351F] shadow-[0_4px_0_#4C9A3A] disabled:opacity-50"
              >
                <span>{submitting ? 'Joining...' : isLastStep ? 'Count Us In!' : 'Continue'}</span>
                {!isLastStep && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
