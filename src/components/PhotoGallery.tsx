import React, { useEffect, useRef, useState } from 'react';
import { EventPhoto, GalleryPhoto, UserProfile } from '../types';
import { ContentStatus } from '../useSiteContent';
import SafeHtml from './SafeHtml';
import { Camera, Image as ImageIcon, Filter, CheckCircle, Upload, AlertCircle, ExternalLink, FolderHeart } from 'lucide-react';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  sheetPhotos?: GalleryPhoto[];
  eventPhotos?: EventPhoto[];
  contentStatus: ContentStatus;
  userProfile: UserProfile;
  onAddPhoto: (newPhoto: GalleryPhoto) => void;
  onOpenJoin: () => void;
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

    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        if (!document.querySelector(`script[src="${oldScript.src}"]`)) {
          newScript.src = oldScript.src;
          newScript.async = true;
          document.body.appendChild(newScript);
        } else {
          const w = window as unknown as Record<string, unknown>;
          if (w.PublicAlbum) {
            try {
              (w.PublicAlbum as { init?: () => void }).init?.();
            } catch {
              // ignore
            }
          }
        }
      } else if (oldScript.textContent) {
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

export default function PhotoGallery({ photos, sheetPhotos = [], eventPhotos = [], contentStatus, userProfile, onAddPhoto, onOpenJoin }: PhotoGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'experiments' | 'field-trips' | 'lab-meetings'>('experiments');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isJoined = userProfile.level > 0;

  const isHtmlEmbed = (str?: string) =>
    typeof str === 'string' && (str.trim().startsWith('<') || str.toLowerCase().includes('<iframe') || str.toLowerCase().includes('<div'));

  // Top Section: Direct photos from Google Sheet "Photos" tab + user uploaded photos
  const directPhotos = [...sheetPhotos, ...photos];
  const filteredDirectPhotos = activeFilter === 'all' ? directPhotos : directPhotos.filter((p) => p.category.toLowerCase() === activeFilter);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('File size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFileUrl(reader.result as string);
        setSubmitError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFileUrl) {
      setSubmitError('Please provide a title and select a photo file.');
      return;
    }

    const newPhoto: GalleryPhoto = {
      id: 'user-photo-' + Date.now(),
      title: title.trim(),
      description: description.trim() || 'Community science moment shared by club member.',
      category,
      imageUrl: selectedFileUrl,
      submittedBy: userProfile.name || 'Anonymous Scientist',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    onAddPhoto(newPhoto);
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setShowSubmitForm(false);
      setTitle('');
      setDescription('');
      setSelectedFileUrl(null);
    }, 1800);
  };

  const extraCategories = Array.from(
    new Set(directPhotos.map((p) => p.category.toLowerCase().trim()).filter(Boolean))
  );

  const categories = [
    { id: 'all', label: 'All Photos' },
    { id: 'experiments', label: 'Experiments' },
    { id: 'field-trips', label: 'Field Trips' },
    { id: 'lab-meetings', label: 'Lab Meetings' },
    ...extraCategories
      .filter((c) => !['all', 'experiments', 'field-trips', 'lab-meetings'].includes(c))
      .map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 font-sans">

      {/* TOP SECTION: Google Sheet Photos & Member Submissions */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#1F3A42]/10 pb-6">
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1F3A42] tracking-tight">
              Photo Gallery
            </h2>
          </div>

          {isJoined ? (
            <button
              id="share-photo-btn"
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="px-5 py-2.5 rounded-full text-xs font-display font-bold transition flex items-center gap-2 cursor-pointer bg-[#6CC24A] text-[#14351F] hover:brightness-105 shadow-[0_3px_0_#4C9A3A]"
            >
              <Upload className="w-4 h-4" />
              <span>{showSubmitForm ? 'Cancel Upload' : 'Share a Photo (+25 XP)'}</span>
            </button>
          ) : (
            <button
              id="join-to-share-photo-btn"
              onClick={onOpenJoin}
              className="px-5 py-2.5 rounded-full text-xs font-display font-bold transition flex items-center gap-2 cursor-pointer bg-[#1F3A42] text-white hover:bg-[#14282e]"
            >
              <Camera className="w-4 h-4 text-[#6CC24A]" />
              <span>Join to Share Photos</span>
            </button>
          )}
        </div>

        {showSubmitForm && (
          <div id="photo-upload-card" className="p-6 rounded-[28px] border-2 border-[#1F3A42]/12 bg-[#FBF7EC] space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-lg text-[#1F3A42]">Submit a Science Snapshot</h4>
              <span className="text-xs font-bold text-[#6CC24A] bg-[#E4F5DA] px-3 py-1 rounded-full">+25 XP Reward</span>
            </div>

            {submitSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-sm font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>Photo published! You earned +25 XP!</span>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4B6169]">Photo Title</label>
                    <input
                      id="photo-title-input"
                      type="text"
                      placeholder="e.g. Solar Eclipse Observation"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4B6169]">Category</label>
                    <select
                      id="photo-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as 'experiments' | 'field-trips' | 'lab-meetings')}
                      className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                    >
                      <option value="experiments">Experiments</option>
                      <option value="field-trips">Field Trips</option>
                      <option value="lab-meetings">Lab Meetings</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#4B6169]">Caption / Description</label>
                  <textarea
                    id="photo-description-input"
                    rows={2}
                    placeholder="What was happening in this experiment or trip?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white text-[#1F3A42] focus:outline-none focus:border-[#6CC24A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#4B6169]">Select Image (Max 5MB)</label>
                  <input
                    id="photo-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 text-xs border-2 border-dashed border-[#1F3A42]/20 rounded-xl cursor-pointer bg-white"
                    required
                  />
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  id="submit-photo-btn"
                  type="submit"
                  className="w-full py-3 rounded-full font-display font-bold text-sm bg-[#1F3A42] text-white hover:bg-[#14282e] transition cursor-pointer"
                >
                  Publish Snapshot
                </button>
              </form>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b-2 border-[#1F3A42]/8" id="gallery-filters">
          <Filter className="w-4 h-4 text-[#4B6169] shrink-0 mr-1" />
          {categories.map((cat) => {
            const isActive = activeFilter === cat.id;
            return (
              <button
                id={`filter-btn-${cat.id}`}
                key={cat.id}
                onClick={() => setActiveFilter(cat.id as 'all' | 'experiments' | 'field-trips' | 'lab-meetings')}
                className={`px-4 py-1.5 rounded-full text-xs font-sans font-bold transition whitespace-nowrap cursor-pointer border-2 ${isActive
                  ? 'bg-[#1F3A42] text-white border-[#1F3A42]'
                  : 'bg-white text-[#4B6169] border-[#1F3A42]/10 hover:border-[#1F3A42]/20'
                  }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {filteredDirectPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDirectPhotos.map((photo) => (
              <div id={`gallery-card-${photo.id}`} key={photo.id} className="rounded-[28px] overflow-hidden border-2 border-[#1F3A42]/8 bg-white transition-all duration-300 flex flex-col justify-between hover:border-[#1F3A42]/15 shadow-[0_8px_24px_rgba(31,58,66,0.06)]">
                <div className="relative h-56 overflow-hidden border-b-2 border-[#1F3A42]/5">
                  <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]" referrerPolicy="no-referrer" />
                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-display font-bold bg-white/95 text-[#1F3A42]">
                    {photo.category.replace('-', ' ')}
                  </span>
                </div>
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-base leading-snug text-[#1F3A42]">{photo.title}</h4>
                    <SafeHtml content={photo.description} className="text-xs leading-relaxed text-[#4B6169]" />
                  </div>
                  <div className="pt-3 border-t-2 border-[#1F3A42]/8 text-[11px] font-bold flex items-center justify-between text-[#4B6169]">
                    <span>By: {photo.submittedBy}</span>
                    <span>{photo.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-[#1F3A42]/12 rounded-[28px] bg-white">
            <ImageIcon className="w-9 h-9 text-[#9AA6A6] mx-auto mb-2" />
            {contentStatus === 'loading' ? (
              <p className="font-bold text-xs text-[#4B6169]">Loading...</p>
            ) : (
              <>
                <p className="font-bold text-xs text-[#4B6169]">No photos yet...</p>
                <p className="text-xs text-[#9AA6A6] mt-1">Check back later!</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: Event Photo Albums & Carousels */}
      <div className="space-y-6 pt-6 border-t-2 border-[#1F3A42]/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#1F3A42]/10 pb-6">
          <div>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-[#1F3A42] tracking-tight">
              Past Events
            </h3>
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
