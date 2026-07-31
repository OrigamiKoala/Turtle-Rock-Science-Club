import React, { useState } from 'react';
import { FAQItem } from '../types';
import { ShieldCheck, Heart, Sparkles, Quote, ChevronDown, ChevronUp } from 'lucide-react';

interface AboutUsProps {
  faqs: FAQItem[];
}

export default function AboutUs({ faqs }: AboutUsProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const toggleFaq = (id: string) => setOpenFaqId(openFaqId === id ? null : id);

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-14 relative z-10">
      <div className="text-center space-y-3">
        <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-[#1F3A42]">
          Nurturing the Next Generation of Naturalists
        </h3>
        <p className="text-sm max-w-2xl mx-auto leading-relaxed text-[#4B6169] font-sans">
          We're a neighborhood collective making real chemistry, electronics, and astronomy
          accessible, educational, and deeply memorable.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="space-y-2">
            <h4 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-[#1F3A42]">Our Story</h4>
            <div className="h-1.5 w-12 rounded-full bg-[#6CC24A]" />
          </div>

          <div className="space-y-4 text-sm leading-relaxed font-sans text-[#4B6169]">
            <p>
              In spring 2018, three parents living in Turtle Rock Valley gathered around a
              cardboard table to build a solar filtration box for a partial eclipse. Local
              schools didn't have the lab time to explore it in depth.
            </p>
            <p>
              A single afternoon eclipse project turned into weekly driveway workshops.
              Neighbors donated microscopes, teachers volunteered to solder circuit boards,
              and families pooled funds for astronomy gear.
            </p>
            <p>
              Today, Turtle Rock Science Club has welcomed hundreds of junior scientists into
              safe lab procedures, robotics, and star mapping — 100% community-run, favoring
              hands-on exploration over test sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#F2C94C]" /><h5 className="font-display font-bold text-[12px] text-[#1F3A42]">Curiosity First</h5></div>
              <p className="text-[11px] leading-relaxed text-[#4B6169]">We ask "why" at every step.</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-[#4C9A3A]" /><h5 className="font-display font-bold text-[12px] text-[#1F3A42]">Community Bound</h5></div>
              <p className="text-[11px] leading-relaxed text-[#4B6169]">Peer partnerships build collaboration.</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#2B6CB0]" /><h5 className="font-display font-bold text-[12px] text-[#1F3A42]">Safety Always</h5></div>
              <p className="text-[11px] leading-relaxed text-[#4B6169]">Goggles, gear, and adult mentors.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-[28px] p-6 border-2 border-[#1F3A42]/8 bg-white relative overflow-hidden flex flex-col justify-between h-80 shadow-[0_8px_24px_rgba(31,58,66,0.06)]">
            <Quote className="w-12 h-12 text-[#1F3A42]/10 absolute top-4 left-4" />
            <div className="relative z-10 space-y-4 pt-4">
              <blockquote className="font-display font-medium text-base leading-relaxed italic text-[#1F3A42]">
                "Where friendships meet discoveries. Science isn't just about beaker ratios —
                it's gasping in wonder alongside a peer as a catalyst blazes in the dark."
              </blockquote>
            </div>
            <div className="flex items-center gap-3.5 border-t-2 border-[#1F3A42]/8 pt-4 mt-4 relative z-10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-xs bg-[#6CC24A] text-[#14351F]">EV</div>
              <div className="text-left">
                <h5 className="font-bold text-xs text-[#1F3A42]">Dr. Elena Vance</h5>
                <p className="text-[10px] text-[#4B6169] uppercase tracking-wider">Founder & Chief Advisor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6 pt-6">
        <div className="text-center space-y-1">
          <h4 className="font-display font-bold text-2xl tracking-tight text-[#1F3A42]">Frequently Asked Questions</h4>
          <p className="text-xs text-[#4B6169]">Everything about sessions, materials, and safety.</p>
        </div>

        <div className="space-y-3.5" id="faq-accordion-group">
          {faqs.map((faq) => {
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
