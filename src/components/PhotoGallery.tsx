import React, { useState } from 'react';
import { ClubIdentity, GalleryPhoto, UserProfile } from '../types';
import { Camera, Image as ImageIcon, Plus, Filter, CheckCircle, Upload, AlertCircle } from 'lucide-react';

interface PhotoGalleryProps {
  identity: ClubIdentity;
  photos: GalleryPhoto[];
  userProfile: UserProfile;
  onAddPhoto: (newPhoto: GalleryPhoto) => void;
  onOpenJoin: () => void;
}

export default function PhotoGallery({
  identity,
  photos,
  userProfile,
  onAddPhoto,
  onOpenJoin
}: PhotoGalleryProps) {
  const isTurtle = identity === 'turtlerock';

  const [activeFilter, setActiveFilter] = useState<'all' | 'experiments' | 'field-trips' | 'lab-meetings'>('all');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'experiments' | 'field-trips' | 'lab-meetings'>('experiments');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isJoined = userProfile.level > 0;

  // Filter photos
  const filteredPhotos = activeFilter === 'all' 
    ? photos 
    : photos.filter((p) => p.category === activeFilter);

  // Handle local image file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setSubmitError('Image is too large. Please select an image under 2MB.');
        return;
      }
      setSubmitError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !selectedFileUrl) {
      setSubmitError('Please provide a title, description, and choose a photo.');
      return;
    }

    const newPhoto: GalleryPhoto = {
      id: `photo-user-${Date.now()}`,
      title,
      description,
      category,
      imageUrl: selectedFileUrl,
      submittedBy: userProfile.name || 'Anonymous Scientist',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };

    onAddPhoto(newPhoto);
    setSubmitSuccess(true);
    setSubmitError('');

    // Clear fields
    setTitle('');
    setDescription('');
    setSelectedFileUrl(null);

    setTimeout(() => {
      setSubmitSuccess(false);
      setShowSubmitForm(false);
    }, 2000);
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10 font-sans">
      
      {/* Header and top info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white">
            Our Gallery & Community Moments
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-2xl font-sans">
            Witness the spark of curiosity in action! Browse through real moments captured during our basecamp experiments and geological hikes.
          </p>
        </div>

        {/* Action to show form */}
        <button
          id="toggle-submit-photo-btn"
          onClick={() => {
            if (!isJoined) {
              onOpenJoin();
            } else {
              setShowSubmitForm(!showSubmitForm);
            }
          }}
          className="px-4 py-2.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>{showSubmitForm ? 'Hide Submission Box' : 'Submit Lab Photo'}</span>
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Submitting form widget */}
      {showSubmitForm && (
        <div className="p-6 rounded-[2rem] border border-white/10 bg-zinc-900/40 backdrop-blur-md mb-8 text-white animate-fade-in">
          <h4 className="font-display font-bold text-base mb-4 flex items-center gap-2 text-white">
            <Upload className="w-4 h-4 text-zinc-400" />
            Upload Photo to Club Gallery
          </h4>

          {submitSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-500 fill-emerald-950" />
              <p className="font-bold text-emerald-400 text-sm font-mono uppercase tracking-wider">Photo Successfully Added!</p>
              <p className="text-xs text-zinc-400">Your community contribution is now live on the photo grid below.</p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Inputs */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Photo Title</label>
                    <input
                      id="photo-title-input"
                      type="text"
                      placeholder="e.g. Baking Soda foam splash"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Description / Caption</label>
                    <textarea
                      id="photo-desc-input"
                      placeholder="e.g. Timmy (Age 8) calibrating his lava bottle with organic blue watercolors."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20 resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">Category Tag</label>
                    <select
                      id="photo-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl text-xs border border-white/10 bg-zinc-950/60 text-white focus:outline-none focus:border-white/20"
                    >
                      <option value="experiments" className="bg-zinc-950">Experiments</option>
                      <option value="field-trips" className="bg-zinc-950">Field Trips</option>
                      <option value="lab-meetings" className="bg-zinc-950">Lab Meetings</option>
                    </select>
                  </div>
                </div>

                {/* File picker drop area */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-4 bg-zinc-950/40 relative min-h-[200px]">
                  {selectedFileUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-2">
                      <img src={selectedFileUrl} alt="Preview" className="max-h-36 rounded-lg object-contain" />
                      <button
                        type="button"
                        onClick={() => setSelectedFileUrl(null)}
                        className="text-[10px] font-mono text-red-400 uppercase tracking-widest hover:underline cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white inline-block">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-zinc-300">Select or drag an image</p>
                      <p className="text-[10px] text-zinc-500 font-mono">Supports JPG, PNG up to 2MB</p>
                      <input
                        id="photo-file-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                    </div>
                  )}
                </div>

              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-[10px] text-red-400 font-mono uppercase tracking-wide">
                  <AlertCircle className="w-4 h-4" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                id="photo-submit-btn"
                type="submit"
                className={`w-full py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition cursor-pointer ${
                  isTurtle
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                    : 'bg-blue-500 hover:bg-blue-400 text-stone-950'
                }`}
              >
                Publish Photo
              </button>
            </form>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/5" id="gallery-filters">
        <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
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
              className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest shrink-0 transition cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Photo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPhotos.map((photo) => (
          <div
            id={`gallery-card-${photo.id}`}
            key={photo.id}
            className="rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-900/40 backdrop-blur-md transition-all duration-300 flex flex-col justify-between hover:border-white/20 shadow-xl"
          >
            {/* Visual Header */}
            <div className="relative h-56 overflow-hidden border-b border-white/5">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest shadow-md bg-zinc-950/80 text-white border border-white/10">
                {photo.category.replace('-', ' ')}
              </span>
            </div>

            {/* Description Body */}
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="font-display font-bold text-base leading-snug tracking-tight text-white">
                  {photo.title}
                </h4>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {photo.description}
                </p>
              </div>

              {/* Attribution */}
              <div className="pt-3 border-t border-white/10 text-[9px] font-mono flex items-center justify-between text-zinc-400 uppercase tracking-wide">
                <span>By: {photo.submittedBy}</span>
                <span>{photo.date}</span>
              </div>
            </div>

          </div>
        ))}
      </div>

      {filteredPhotos.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-[2rem] bg-zinc-900/20">
          <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="font-mono font-bold text-xs uppercase tracking-widest text-zinc-400">No moments recorded</p>
          <p className="text-xs text-zinc-500 mt-1">Join the club, perform virtual experiments, and upload your first snapshot!</p>
        </div>
      )}

    </section>
  );
}
