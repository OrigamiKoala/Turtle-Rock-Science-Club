import React, { useState } from 'react';
import { FAQItem } from '../types';
import { BookOpen, Users, Target, Calendar, MapPin, Award, ChevronDown, ChevronUp, GraduationCap, Compass, History, FileText, ExternalLink, Quote } from 'lucide-react';

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What age groups can participate in the club?',
    answer: 'Our programs are open to elementary school students seeking hands-on STEM exploration, with middle and high-schoolers serving as coaches and mentors!'
  },
  {
    id: 'faq-2',
    question: 'Where do weekly meetings take place?',
    answer: 'Meetings take place at UCI’s Paul Merage School of Business (Room SB2-117) every Saturday from 7:00 to 8:30 PM throughout the school year.'
  },
  {
    id: 'faq-3',
    question: 'What materials do students need to bring?',
    answer: 'A device, pencil and paper, and curiosity!'
  },
  {
    id: 'faq-4',
    question: 'How do Science Olympiad tryouts work?',
    answer: 'Tryouts are held near the end of October. Selected students form our SciOly competition team and attend training and official tournaments throughout the year.'
  }
];

export default function AboutUs() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const toggleFaq = (id: string) => setOpenFaqId(openFaqId === id ? null : id);

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 relative z-10 font-sans text-left text-[#1F3A42]">

      {/* HEADER & OVERVIEW */}
      <div className="space-y-4 border-b-2 border-[#1F3A42]/10 pb-10">
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[#1F3A42]">
          Turtle Rock Science Club
        </h1>

        <div className="pt-2 max-w-3xl space-y-3">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#2E7D46]">
            Club Overview
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-[#4B6169]">
            Turtle Rock Science Club (TRSC) is a group of students, parents, and mentors, all exploring science.
            We strive to help young students find passion in STEM, and show the world that science is a lot more
            than just memorizing textbooks.
          </p>

          <div className="pt-2">
            <a
              id="official-doc-link-btn"
              href="https://docs.google.com/document/d/1ev0rV0iSfNzGwVkLtUcggu7fINd0rD7nv4nyroO3u9c/edit?tab=t.0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-display font-bold bg-[#1F3A42] text-white hover:bg-[#14282e] transition shadow-sm"
            >
              <FileText className="w-4 h-4 text-[#6CC24A]" />
              <span>Read Official Club Overview Document</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* OUR MISSION */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1F3A42]">
            Our Mission
          </h2>
          <p className="text-sm font-semibold text-[#4B6169]">
            We have three main goals as a club:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/10 bg-white space-y-3 shadow-[0_8px_24px_rgba(31,58,66,0.05)] hover:border-[#6CC24A] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#E4F5DA] flex items-center justify-center text-[#2E7D46]">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#1F3A42]">Build Knowledge</h3>
            <p className="text-xs leading-relaxed text-[#4B6169]">
              Introducing students to various STEM fields through hands-on exploration and expert-led seminars.
            </p>
          </div>

          <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/10 bg-white space-y-3 shadow-[0_8px_24px_rgba(31,58,66,0.05)] hover:border-[#6CC24A] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#E4F5DA] flex items-center justify-center text-[#2E7D46]">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#1F3A42]">Build Community</h3>
            <p className="text-xs leading-relaxed text-[#4B6169]">
              Creating a safe and supportive space where students with shared interests can grow and collaborate.
            </p>
          </div>

          <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/10 bg-white space-y-3 shadow-[0_8px_24px_rgba(31,58,66,0.05)] hover:border-[#6CC24A] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#E4F5DA] flex items-center justify-center text-[#2E7D46]">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#1F3A42]">Build Skills</h3>
            <p className="text-xs leading-relaxed text-[#4B6169]">
              Equipping students with the foundational skills necessary for future success in competitive STEM environments and academic pursuits.
            </p>
          </div>
        </div>
      </div>

      {/* HISTORY & LEADERSHIP GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* HISTORY & FOUNDATION */}
        <div className="p-8 rounded-[28px] border-2 border-[#1F3A42]/10 bg-[#FBF7EC] space-y-4">
          <div className="flex items-center gap-3 text-[#2E7D46]">
            <History className="w-6 h-6 shrink-0" />
            <h2 className="font-display font-bold text-2xl text-[#1F3A42]">History and Foundation</h2>
          </div>
          <p className="text-sm leading-relaxed text-[#4B6169]">
            TRSC began as a gathering of a group of students interested in learning science. Since then, it has grown
            to participate in competitions like Science Olympiad, as well as provide science workshops to explore different fields.
          </p>
        </div>

        {/* TEACHING & LEADERSHIP */}
        <div className="p-8 rounded-[28px] border-2 border-[#1F3A42]/10 bg-[#FBF7EC] space-y-4">
          <div className="flex items-center gap-3 text-[#2E7D46]">
            <GraduationCap className="w-6 h-6 shrink-0" />
            <h2 className="font-display font-bold text-2xl text-[#1F3A42]">Teaching and Leadership</h2>
          </div>
          <p className="text-sm leading-relaxed text-[#4B6169]">
            Our coaches are middle and high school students from University High School, Rancho San Joaquin Middle School,
            and the Orange County School of the Arts (OCSA).
          </p>
        </div>
      </div>

      {/* PROGRAM STRUCTURE */}
      <div className="space-y-6 pt-4 border-t-2 border-[#1F3A42]/10">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1F3A42]">
            Program Structure
          </h2>
          <p className="text-sm text-[#4B6169]">
            How our meetings, subject rooms, and Science Olympiad season are organized throughout the year.
          </p>
        </div>

        <div className="space-y-4">

          {/* Phase 1 */}
          <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/10 bg-white flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="p-3 rounded-2xl bg-[#E4F5DA] text-[#2E7D46] shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg text-[#1F3A42]">Weekly Science Sessions</h3>
              </div>
              <p className="text-xs leading-relaxed text-[#4B6169]">
                Until the end of October, Turtle Rock Science Club meetings will occur every Saturday, from 7–8:30 PM,
                at <strong>UCI’s Paul Merage School of Business (SB2-117)</strong>. During each session, there will be 3 different rooms,
                each with a different subject. Students can choose what subject they want to explore.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#2E7D46] font-bold pt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>UCI Paul Merage School of Business — Room SB2-117</span>
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/10 bg-white flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="p-3 rounded-2xl bg-[#E4F5DA] text-[#2E7D46] shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg text-[#1F3A42]">Science Olympiad Tryouts</h3>
              </div>
              <p className="text-xs leading-relaxed text-[#4B6169]">
                Near the end of October, Science Olympiad tryouts will be held, and some students will be selected to represent
                Turtle Rock in the Science Olympiad competition, attending competitions throughout the year.
              </p>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/10 bg-white flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="p-3 rounded-2xl bg-[#E4F5DA] text-[#2E7D46] shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg text-[#1F3A42]">SciOly Team Training</h3>
              </div>
              <p className="text-xs leading-relaxed text-[#4B6169]">
                In the month of November, students selected to be part of the SciOly team will meet for training every Saturday,
                in person, from 7–8:30 PM.
              </p>
            </div>
          </div>

          {/* Phase 4 */}
          <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/10 bg-white flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="p-3 rounded-2xl bg-[#E4F5DA] text-[#2E7D46] shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg text-[#1F3A42]">Monthly Training & Science Sessions</h3>
              </div>
              <p className="text-xs leading-relaxed text-[#4B6169]">
                From December until May, SciOly team members will meet in person once a month on a Saturday, from 7–8:30 PM,
                for further training. During this time, we will also be resuming our regular science sessions, happening once a month.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <div className="max-w-3xl mx-auto space-y-6 pt-6 border-t-2 border-[#1F3A42]/10">
        <div className="text-center space-y-1">
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[#1F3A42]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3.5" id="faq-accordion-group">
          {FAQ_ITEMS.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div id={`faq-item-${faq.id}`} key={faq.id} className="rounded-2xl border-2 border-[#1F3A42]/8 bg-white hover:border-[#1F3A42]/15 transition-all duration-300 overflow-hidden">
                <button id={`faq-toggle-btn-${faq.id}`} onClick={() => toggleFaq(faq.id)} className="w-full text-left px-5 py-4 font-display font-bold text-sm text-[#1F3A42] flex items-center justify-between gap-4 cursor-pointer">
                  <span className="leading-tight">{faq.question}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#4B6169] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#4B6169] shrink-0" />}
                </button>
                {isOpen && <div className="px-5 pb-5 text-xs leading-relaxed text-[#4B6169] font-sans animate-fade-in">{faq.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
