import React, { useEffect, useRef } from 'react';
import { EventPhoto, GalleryPhoto, UserProfile } from '../types';
import { ContentStatus } from '../useSiteContent';
import SafeHtml from './SafeHtml';
import { ExternalLink, FolderHeart } from 'lucide-react';

interface PhotoGalleryProps {
  photos?: GalleryPhoto[];
  sheetPhotos?: GalleryPhoto[];
  eventPhotos?: EventPhoto[];
  contentStatus: ContentStatus;
  userProfile?: UserProfile;
  onAddPhoto?: (newPhoto: GalleryPhoto) => void;
  onOpenJoin?: () => void;
}

function HtmlEmbedCard({ embedHtml }: { embedHtml: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !embedHtml) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(embedHtml, 'text/html');

    const scripts = doc.querySelectorAll('script');
    const nonScriptHtml = doc.body.innerHTML.replace(/<script[\s\S]*?<\/script>/gi, '');

    containerRef.current.innerHTML = nonScriptHtml;

    const initPublicAlbum = () => {
      const w = window as unknown as Record<string, unknown>;
      if (w.PublicAlbum && typeof (w.PublicAlbum as { init?: (el?: HTMLElement | null) => void }).init === 'function') {
        try {
          (w.PublicAlbum as { init: (el?: HTMLElement | null) => void }).init(containerRef.current);
        } catch {
          // ignore
        }
      } else if (w.WidgetDecorator && typeof (w.WidgetDecorator as { decorateAll?: (name: string, factory: () => unknown, el?: HTMLElement | null) => void }).decorateAll === 'function') {
        try {
          const wd = w.WidgetDecorator as { decorateAll: (name: string, factory: () => unknown, el?: HTMLElement | null) => void };
          const cw = w.CarouselWidget as new () => unknown;
          if (cw) wd.decorateAll('pa-carousel-widget', () => new cw(), containerRef.current);
        } catch {
          // ignore
        }
      }
    };

    scripts.forEach((oldScript) => {
      let src = oldScript.src;
      if (src && (src.includes('publicalbum') || src.includes('embed-ui.min.js'))) {
        src = '/embed-ui.min.js';
      }

      if (src) {
        if (!document.querySelector(`script[src="${src}"]`)) {
          const newScript = document.createElement('script');
          newScript.src = src;
          newScript.async = true;
          newScript.onload = () => {
            initPublicAlbum();
          };
          document.body.appendChild(newScript);
        } else {
          initPublicAlbum();
        }
      } else if (oldScript.textContent) {
        const newScript = document.createElement('script');
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      }
    });
  }, [embedHtml]);

  return (
    <div
      ref={containerRef}
      className="mt-3 w-full min-h-[300px] rounded-2xl overflow-hidden border-2 border-[#1F3A42]/10 bg-black/5 flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_.pa-carousel-widget]:!w-full [&_.pa-carousel-widget]:!h-[360px] shadow-inner"
    />
  );
}

export default function PhotoGallery({ eventPhotos = [], contentStatus }: PhotoGalleryProps) {
  const isHtmlEmbed = (str?: string) =>
    typeof str === 'string' && (str.trim().startsWith('<') || str.toLowerCase().includes('<iframe') || str.toLowerCase().includes('<div'));

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#1F3A42]/10 pb-6">
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1F3A42] tracking-tight">
              Past Event Photos
            </h2>
          </div>
        </div>

        {eventPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventPhotos.map((ep) => (
              <div id={`event-album-card-${ep.id}`} key={ep.id} className="rounded-[28px] overflow-hidden border-2 border-[#1F3A42]/8 bg-white transition-all duration-300 flex flex-col justify-between hover:border-[#1F3A42]/15 shadow-[0_8px_24px_rgba(31,58,66,0.06)]">
                {ep.image ? (
                  <div className="relative h-52 overflow-hidden border-b-2 border-[#1F3A42]/5">
                    <img src={ep.image} alt={ep.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-display font-bold bg-[#064e3b] text-white">
                      Event Album
                    </span>
                  </div>
                ) : null}

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-base leading-snug text-[#1F3A42]">{ep.title}</h4>
                      <span className="text-[10px] font-bold text-[#4B6169]">{ep.date}</span>
                    </div>
                    <SafeHtml content={ep.description || `Photo album for ${ep.title}`} className="text-xs leading-relaxed text-[#4B6169]" />
                  </div>

                  {ep.albumEmbed && isHtmlEmbed(ep.albumEmbed) ? (
                    <HtmlEmbedCard embedHtml={ep.albumEmbed} />
                  ) : ep.albumUrl ? (
                    <a
                      href={ep.albumUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-display font-bold bg-[#064e3b] text-white hover:bg-[#043629] transition inline-flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>View Event Photo Album</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-[#1F3A42]/12 rounded-[28px] bg-white">
            <FolderHeart className="w-9 h-9 text-[#9AA6A6] mx-auto mb-2" />
            {contentStatus === 'loading' ? (
              <p className="font-bold text-xs text-[#4B6169]">Loading...</p>
            ) : (
              <>
                <p className="font-bold text-xs text-[#4B6169]">No event albums yet...</p>
                <p className="text-xs text-[#9AA6A6] mt-1">Check back later!</p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
