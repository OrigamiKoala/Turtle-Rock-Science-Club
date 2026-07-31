import React, { useState } from 'react';
import { FAQItem } from '../types';
import { ShieldCheck, Heart, Sparkles, BookOpen, Quote, ChevronDown, ChevronUp } from 'lucide-react';

interface AboutUsProps {
  faqs: FAQItem[];
}

export default function AboutUs({ faqs }: AboutUsProps) {

  // Accordion state
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 relative z-10">
      
      {/* Intro section */}
      <div className="text-center space-y-3">
        <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white">
          Nurturing the Next Generation of Naturalists
        </h3>
        <p className="text-xs max-w-2xl mx-auto leading-relaxed text-zinc-400 font-sans">
          We are an organic, neighborhood collective designed to make real chemistry, electronics,
          and astronomy accessible, highly educational, and deeply memorable.
        </p>
      </div>

      {/* Grid of Story & Vance Quote */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Story copy (Left) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="space-y-2">
            <h4 className="font-display font-bold text-xl sm:text-2xl tracking-tighter text-white">
              Our Story
            </h4>
            <div className="h-1 w-12 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-4 text-xs leading-relaxed font-sans text-zinc-400">
            <p>
              In the spring of 2018, three parents living in Turtle Rock Valley gathered in a backyard around a cardboard table to construct a basic solar filtration box. They wanted their children to witness the partial solar eclipse safely, but found that local schools lacked the specialized optics and dedicated lab time to explore the astronomical phenomenon in depth.
            </p>
            <p>
              What started as a single afternoon eclipse project quickly exploded into weekly driveway workshops. Neighbors donated compound optical microscopes, local high-school teachers volunteered to solder custom circuit boards, and local families pooled funds to acquire advanced astronomy gear.
            </p>
            <p>
              Today, the Turtle Rock Science Club has trained over 400 junior scientists in safe laboratory procedures, autonomous robot coordination, and star mapping. We remain 100% community-driven, prioritizing tactile exploration over test sheets, and safety over speed.
            </p>
          </div>

          {/* Core Values Bullets with Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h5 className="font-mono font-bold text-[10px] uppercase tracking-widest text-zinc-300">Curiosity First</h5>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-400">
                We encourage asking "Why" at every single step of the experiment.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-500" />
                <h5 className="font-mono font-bold text-[10px] uppercase tracking-widest text-zinc-300">Community Bound</h5>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-400">
                Peer partnerships teach collaboration and joint problem-solving.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <h5 className="font-mono font-bold text-[10px] uppercase tracking-widest text-zinc-300">Safety Always</h5>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-400">
                Mandatory child safety goggles, impact shields, and adult mentors.
              </p>
            </div>
          </div>
        </div>

        {/* Dr Elena Vance Quote Block (Right) */}
        <div className="lg:col-span-5">
          <div className="rounded-[2rem] p-6 border border-white/10 bg-zinc-900/40 backdrop-blur-md relative overflow-hidden flex flex-col justify-between h-80 shadow-2xl text-white">
            <Quote className="w-12 h-12 text-zinc-700 opacity-25 absolute top-4 left-4" />
            
            <div className="relative z-10 space-y-4 pt-4">
              <blockquote className="font-display font-medium text-sm sm:text-base leading-relaxed italic text-zinc-200">
                "Where friendships meet discoveries. Science is not just about beaker ratios—it is
                about gasping in wonder alongside a peer as a fluorescent catalyst blazes in the
                dark."
              </blockquote>
            </div>

            <div className="flex items-center gap-3.5 border-t border-white/10 pt-4 mt-4 relative z-10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-emerald-500 text-stone-950">
                EV
              </div>
              <div className="text-left font-mono">
                <h5 className="font-bold text-xs text-white">Dr. Elena Vance</h5>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Chief Scientific Advisor / Founder</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Frequently Asked Questions Accordion */}
      <div className="max-w-3xl mx-auto space-y-6 pt-6">
        <div className="text-center space-y-1">
          <h4 className="font-display font-bold text-2xl tracking-tighter text-white">
            Frequently Asked Questions
          </h4>
          <p className="text-xs text-zinc-400">
            Everything you need to know about our science sessions, materials, and safety guidelines.
          </p>
        </div>

        <div className="space-y-3.5" id="faq-accordion-group">
          {faqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                id={`faq-item-${faq.id}`}
                key={faq.id}
                className="rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md hover:border-white/20 transition-all duration-300 overflow-hidden"
              >
                <button
                  id={`faq-toggle-btn-${faq.id}`}
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full text-left px-5 py-4 font-display font-bold text-sm tracking-tight text-white flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="leading-tight">{faq.question}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs leading-relaxed text-zinc-400 font-sans animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
