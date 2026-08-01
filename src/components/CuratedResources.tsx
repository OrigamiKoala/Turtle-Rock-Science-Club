import React, { useState } from 'react';
import { Resource } from '../types';
import {
  BookMarked,
  Search,
  ExternalLink,
  Video,
  Globe,
  Wrench,
  BookOpen,
  FileText,
  Sparkles,
  Filter
} from 'lucide-react';

interface CuratedResourcesProps {
  resources: Resource[];
}

const CATEGORY_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  chemistry: { label: 'Chemistry', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  physics: { label: 'Physics', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  astronomy: { label: 'Astronomy', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300' },
  biology: { label: 'Biology', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  robotics: { label: 'Robotics', bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  general: { label: 'General Science', bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300' }
};

function getTypeIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case 'video':
      return Video;
    case 'tool':
    case 'simulation':
      return Wrench;
    case 'article':
    case 'pdf':
      return FileText;
    case 'book':
      return BookOpen;
    case 'website':
    default:
      return Globe;
  }
}

export default function CuratedResources({ resources }: CuratedResourcesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const categories = ['all', 'chemistry', 'physics', 'astronomy', 'biology', 'robotics', 'general'];
  const types = ['all', 'website', 'tool', 'video', 'article', 'book'];

  const filteredResources = resources.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory;
    const matchesType = selectedType === 'all' || (item.type || 'website').toLowerCase() === selectedType;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);

    return matchesCategory && matchesType && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1F3A42] via-[#2D525D] to-[#142B32] p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-[#6CC24A]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-[#F2C94C]/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-display font-bold text-[#A8E090]">
            <Sparkles className="w-3.5 h-3.5 text-[#F2C94C]" />
            <span>Explorer Library</span>
          </div>

          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
            Curated STEM <span className="text-[#A8E090]">Resources</span>
          </h2>

          <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-sans">
            Suggested resources for further exploration. A complete list can be found on our <a href="https://docs.google.com/document/d/1ev0rV0iSfNzGwVkLtUcggu7fINd0rD7nv4nyroO3u9c/edit?tab=t.0" target="_blank" rel="noopener noreferrer">Master Document</a>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-[24px] p-5 border-2 border-[#1F3A42]/10 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B6169] dark:text-gray-400" />
            <input
              id="resource-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-[#1F3A42]/12 dark:border-gray-600 bg-white dark:bg-gray-900 text-[#1F3A42] dark:text-white text-xs font-sans focus:outline-none focus:border-[#6CC24A]"
            />
          </div>

          {/* Type Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-[#4B6169] dark:text-gray-300 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5" /> Type:
            </span>
            {types.map((type) => {
              const isActive = selectedType === type;
              return (
                <button
                  id={`filter-type-${type}`}
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-sans font-bold capitalize transition-all shrink-0 cursor-pointer ${isActive
                    ? 'bg-[#1F3A42] text-white dark:bg-[#6CC24A] dark:text-[#14351F]'
                    : 'bg-gray-100 dark:bg-gray-700 text-[#4B6169] dark:text-gray-300 hover:bg-gray-200'
                    }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs font-bold text-[#4B6169] dark:text-gray-300 shrink-0 mr-1">Category:</span>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const meta = CATEGORY_LABELS[cat] || { label: cat, bg: 'bg-gray-100', text: 'text-gray-700' };
            const label = cat === 'all' ? 'All Categories' : meta.label;

            return (
              <button
                id={`filter-category-${cat}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-bold transition-all shrink-0 cursor-pointer border-2 ${isActive
                  ? 'bg-[#E4F5DA] text-[#2E7D46] border-[#6CC24A]/40 dark:bg-[#2E7D46] dark:text-white'
                  : 'bg-white dark:bg-gray-800 text-[#4B6169] dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Resource Cards */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const catMeta = CATEGORY_LABELS[res.category.toLowerCase()] || {
              label: res.category,
              bg: 'bg-gray-100',
              text: 'text-gray-700'
            };
            const TypeIcon = getTypeIcon(res.type);

            return (
              <div
                key={res.id}
                className="group relative bg-white dark:bg-gray-800 rounded-[28px] border-2 border-[#1F3A42]/10 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-sans font-bold ${catMeta.bg} ${catMeta.text}`}>
                      {catMeta.label}
                    </span>

                    <span className="px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1 capitalize">
                      <TypeIcon className="w-3 h-3" />
                      {res.type || 'website'}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#1F3A42] dark:text-white group-hover:text-[#4C9A3A] transition-colors leading-snug">
                    {res.title}
                  </h3>

                  <p className="text-xs text-[#4B6169] dark:text-gray-300 leading-relaxed font-sans line-clamp-3">
                    {res.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-gray-100 dark:border-gray-700/60">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 bg-[#6CC24A] text-[#14351F] hover:brightness-105 shadow-[0_3px_0_#4C9A3A] transition cursor-pointer"
                  >
                    <span>Visit Resource</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-gray-800 rounded-[28px] border-2 border-dashed border-[#1F3A42]/20 dark:border-gray-700 p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#E4F5DA] text-[#2E7D46] flex items-center justify-center mx-auto">
            <BookMarked className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1F3A42] dark:text-white">No resources found</h3>
          <p className="text-xs text-[#4B6169] dark:text-gray-400 font-sans">
            No items matched your search or filters. Try adjusting your selection.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedType('all');
            }}
            className="px-4 py-2 rounded-full text-xs font-display font-bold bg-[#1F3A42] text-white cursor-pointer hover:bg-[#2D525D]"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
