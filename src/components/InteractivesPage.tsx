import React from 'react';
import { ScienceInteractive } from '../types';
import { WEEKLY_INTERACTIVES } from '../data/interactives';
import { Rocket, ArrowRight } from 'lucide-react';

interface InteractivesPageProps {
  onNavigate: (route: string) => void;
}

export default function InteractivesPage({ onNavigate }: InteractivesPageProps) {
  // Always sorted oldest to newest
  const interactives = [...WEEKLY_INTERACTIVES].sort((a, b) => a.week - b.week);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <p className="text-[11px] font-display font-bold text-[#4C9A3A]">Weekly Science Interactives</p>
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1F3A42] tracking-tight">Interactives</h2>
        <p className="text-sm text-[#4B6169] max-w-2xl leading-relaxed">
          Browser-based simulations released each week, ordered oldest to newest.
        </p>
      </div>

      <div className="space-y-6">
        {interactives.map((item: ScienceInteractive) => {
          const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            // Let middle click or Ctrl/Cmd click open in new tab naturally
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
              e.preventDefault();
              onNavigate(item.route);
            }
          };

          return (
            <article
              key={item.id}
              id={`interactive-card-${item.id}`}
              className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 sm:p-8 hover:border-[#1F3A42]/15 transition-all shadow-[0_8px_24px_rgba(31,58,66,0.06)] flex flex-col justify-between gap-6"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-[#E4F5DA] text-[#2E7D46]">
                    Week {item.week}
                  </span>
                  <span className="text-xs font-sans text-[#9AA6A6]">
                    {item.date}
                  </span>
                  <span className="text-xs font-sans font-bold text-[#4B6169] ml-auto">
                    {item.field}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-display font-bold text-2xl sm:text-3xl text-[#1F3A42]">
                    {item.title}
                  </h3>
                  <code className="text-xs font-mono font-bold text-[#2E7D46] bg-[#1F3A42]/5 px-2.5 py-1 rounded-md border border-[#1F3A42]/10">
                    {item.route}
                  </code>
                </div>

                <p className="text-sm sm:text-base text-[#4B6169] leading-relaxed max-w-4xl">
                  {item.description}
                </p>

                {item.mechanics && (
                  <p className="text-xs sm:text-sm text-[#4B6169]/90 leading-relaxed font-sans max-w-4xl bg-[#1F3A42]/5 border border-[#1F3A42]/8 rounded-2xl p-3.5">
                    <strong className="text-[#1F3A42] font-semibold">How it works: </strong>
                    {item.mechanics}
                  </p>
                )}

                {item.concepts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {item.concepts.map((concept) => (
                      <span
                        key={concept}
                        className="text-[11px] font-sans font-medium px-2.5 py-1 rounded-full bg-[#1F3A42]/5 text-[#4B6169] border border-[#1F3A42]/8"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#1F3A42]/8">
                <p className="text-xs text-[#9AA6A6] font-sans">
                  Runs directly in the browser on desktop and mobile.
                </p>

                <a
                  href={item.route}
                  onClick={handleClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-display font-bold text-xs sm:text-sm bg-[#6CC24A] text-[#14351F] hover:bg-[#5bb33b] transition-all shadow-[0_3px_0_#4C9A3A] active:translate-y-0.5 cursor-pointer"
                  style={{ textDecoration: 'none' }}
                >
                  <Rocket className="w-4 h-4" />
                  <span>Play {item.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
