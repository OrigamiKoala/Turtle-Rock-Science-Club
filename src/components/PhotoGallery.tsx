import React, { useState } from 'react';
import { GalleryPhoto, UserProfile } from '../types';
import { Camera, Image as ImageIcon, Filter, CheckCircle, Upload, AlertCircle } from 'lucide-react';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  userProfile: UserProfile;
  onAddPhoto: (newPhoto: GalleryPhoto) => void;
  onOpenJoin: () => void;
}

export default function PhotoGallery({ photos, userProfile, onAddPhoto, onOpenJoin }: PhotoGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'experiments' | 'field-trips' | 'lab-meetings'>('all');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'experiments' | 'field-trips' | 'lab-meetings'>('experiments');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isJoined = userProfile.level > 0;
  const filteredPhotos = activeFilter === 'all' ? photos : photos.filter((p) => p.category === activeFilter);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { setSubmitError('Image is too large. Please select an image under 2MB.'); return; }
      setSubmitError('');
      const reader = new FileReader();
      reader.onloadend = () => setSelectedFileUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !selectedFileUrl) { setSubmitError('Please provide a title, description, and choose a photo.'); return; }

    const newPhoto: GalleryPhoto = {
      id: `photo-user-${Date.now()}`,
      title, description, category,
      imageUrl: selectedFileUrl,
      submittedBy: userProfile.name || 'Anonymous Scientist',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };

    onAddPhoto(newPhoto);
    setSubmitSuccess(true);
    setSubmitError('');
    setTitle(''); setDescription(''); setSelectedFileUrl(null);

    setTimeout(() => { setSubmitSuccess(false); setShowSubmitForm(false); }, 1800);
  };

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[#1F3A42]">Photo Gallery</h3>
          <p className="text-xs text-[#4B6169] mt-1.5 max-w-2xl">Real moments from our basecamp experiments and field trips.</p>
        </div>

        <button
          id="toggle-submit-photo-btn"
          onClick={() => { if (!isJoined) onOpenJoin(); else setShowSubmitForm(!showSubmitForm); }}
          className="px-4 py-2.5 rounded-full text-[12px] font-display font-bold border-2 border-[#1F3A42]/10 bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>{showSubmitForm ? 'Hide Submission Box' : 'Add Your Photo'}</span>
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>

      {showSubmitForm && (
        <div className="p-6 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white mb-8 animate-fade-in">
          <h4 className="font-display font-bold text-base mb-4 flex items-center gap-2 text-[#1F3A42]">
            <Upload className="w-4 h-4 text-[#4B6169]" />
            Upload Photo to Club Gallery
          </h4>

          {submitSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-[#6CC24A]" />
              <p className="font-bold text-[#2E7D46] text-sm">Photo added! (+25 XP)</p>
              <p className="text-xs text-[#4B6169]">Your contribution is now live on the grid below.</p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#4B6169]">Photo Title</label>
                    <input id="photo-title-input" type="text" placeholder="e.g. Baking Soda foam splash" value={title} onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-[#FBF7EC] text-[#1F3A42] focus:outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#4B6169]">Description / Caption</label>
                    <textarea id="photo-desc-input" placeholder="e.g. Timmy (age 8) calibrating his lava bottle." value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                      className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-[#FBF7EC] text-[#1F3A42] focus:outline-none resize-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#4B6169]">Category</label>
                    <select id="photo-category-select" value={category} onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-[#FBF7EC] text-[#1F3A42] focus:outline-none">
                      <option value="experiments">Experiments</option>
                      <option value="field-trips">Field Trips</option>
                      <option value="lab-meetings">Lab Meetings</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#1F3A42]/15 rounded-2xl p-4 bg-[#FBF7EC] relative min-h-[200px]">
                  {selectedFileUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-2">
                      <img src={selectedFileUrl} alt="Preview" className="max-h-36 rounded-lg object-contain" />
                      <button type="button" onClick={() => setSelectedFileUrl(null)} className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer">Change Photo</button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="p-3 rounded-full bg-white border-2 border-[#1F3A42]/10 text-[#1F3A42] inline-block"><Upload className="w-5 h-5" /></div>
                      <p className="text-xs font-bold text-[#1F3A42]">Select or drag an image</p>
                      <p className="text-[11px] text-[#9AA6A6]">Supports JPG, PNG up to 2MB</p>
                      <input id="photo-file-upload-input" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                    </div>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-[11px] text-red-500 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{submitError}</span>
                </div>
              )}

              <button id="photo-submit-btn" type="submit" className="w-full py-2.5 rounded-full text-[12px] font-display font-bold transition cursor-pointer bg-[#6CC24A] text-[#14351F] shadow-[0_3px_0_#4C9A3A]">
                Publish Photo
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b-2 border-[#1F3A42]/8" id="gallery-filters">
        <Filter className="w-3.5 h-3.5 text-[#4B6169] shrink-0" />
        {[
          { id: 'all', label: 'All Moments' },
          { id: 'experiments', label: 'Experiments' },
          { id: 'field-trips', label: 'Field Trips' },
          { id: 'lab-meetings', label: 'Lab Meetings' }
        ].map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              id={`gallery-filter-${f.id}`}
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold shrink-0 transition cursor-pointer ${isActive ? 'bg-[#E4F5DA] text-[#2E7D46]' : 'text-[#4B6169] hover:text-[#1F3A42]'}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPhotos.map((photo) => (
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
                <p className="text-xs leading-relaxed text-[#4B6169]">{photo.description}</p>
              </div>
              <div className="pt-3 border-t-2 border-[#1F3A42]/8 text-[11px] font-bold flex items-center justify-between text-[#4B6169]">
                <span>By: {photo.submittedBy}</span>
                <span>{photo.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPhotos.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-[#1F3A42]/12 rounded-[28px] bg-white">
          <ImageIcon className="w-10 h-10 text-[#9AA6A6] mx-auto mb-2" />
          <p className="font-bold text-xs text-[#4B6169]">No moments recorded</p>
          <p className="text-xs text-[#9AA6A6] mt-1">Join the club and upload your first snapshot!</p>
        </div>
      )}
    </section>
  );
}
