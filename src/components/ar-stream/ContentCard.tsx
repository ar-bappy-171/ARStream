'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Star, Heart, Play, Eye, ClipboardList, CheckCircle, MonitorPlay } from 'lucide-react';
import type { ContentItem } from '@/lib/store';
import { useAppStore } from '@/lib/store';
import type { WatchListCategory } from '@/lib/storage';
import { TrailerPreview } from './TrailerPreview';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface ContentCardProps {
  item: ContentItem;
  onClick?: (item: ContentItem) => void;
  onWatchListToggle?: (item: ContentItem, category: WatchListCategory | null) => void;
  watchListStatus?: WatchListCategory | null;
}

function getTypeBadgeClasses(type: ContentItem['type']): string {
  switch (type) {
    case 'movie':
      return 'badge-movie text-white';
    case 'tv':
      return 'badge-tv text-white';
    case 'anime':
      return 'badge-anime text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getTypeLabel(type: ContentItem['type']): string {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'tv':
      return 'TV';
    case 'anime':
      return 'Anime';
    default:
      return type;
  }
}

function getYear(releaseDate: string): string {
  if (!releaseDate) return '';
  return releaseDate.split('-')[0];
}

function getPosterUrl(item: ContentItem): string {
  if (!item.posterPath) return '/placeholder-poster.svg';
  // If it's an anime with a full URL (from Jikan/MAL API)
  if (item.type === 'anime' && item.posterPath.startsWith('http')) {
    return item.posterPath;
  }
  return `${TMDB_IMAGE_BASE}${item.posterPath}`;
}

function getCategoryColor(category: WatchListCategory | null): string {
  switch (category) {
    case 'watching':
      return 'bg-emerald-500';
    case 'watchlist':
      return 'bg-amber-500';
    case 'finished':
      return 'bg-sky-500';
    default:
      return '';
  }
}

function getCategoryLabel(category: WatchListCategory | null): string {
  switch (category) {
    case 'watching':
      return 'Watching';
    case 'watchlist':
      return 'Watch List';
    case 'finished':
      return 'Finished';
    default:
      return '';
  }
}

export function ContentCard({ item, onClick, onWatchListToggle, watchListStatus }: ContentCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openStream } = useAppStore();

  // Trailer preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);

  const handleClick = () => {
    onClick?.(item);
  };

  const handleListButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleSelectCategory = (category: WatchListCategory | null) => {
    onWatchListToggle?.(item, category);
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Handle hover for trailer preview
  const handleMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      if (cardRef.current) {
        setPreviewRect(cardRef.current.getBoundingClientRect());
        setShowPreview(true);
      }
    }, 1500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowPreview(false);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const posterUrl = getPosterUrl(item);

  return (
    <>
      <div
        ref={cardRef}
        className="content-card group relative w-[155px] sm:w-[170px] md:w-[185px] flex-shrink-0 cursor-pointer rounded-lg overflow-hidden bg-card"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
          <Image
            src={posterUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 155px, (max-width: 768px) 170px, 185px"
            className="object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-poster.svg';
            }}
          />

          {/* Type Badge */}
          <span
            className={`absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${getTypeBadgeClasses(item.type)}`}
          >
            {getTypeLabel(item.type)}
          </span>

          {/* WatchList Status Indicator */}
          {watchListStatus && (
            <span
              className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded text-white ${getCategoryColor(watchListStatus)}`}
            >
              <span className="size-1.5 rounded-full bg-white/80" />
              {getCategoryLabel(watchListStatus)}
            </span>
          )}

          {/* WatchList Button */}
          <div ref={dropdownRef} className="absolute bottom-2 left-2 z-20">
            <button
              onClick={handleListButtonClick}
              className={`p-1.5 rounded-full backdrop-blur-sm transition-opacity duration-200 z-20 ${
                watchListStatus
                  ? 'bg-black/60 opacity-100'
                  : 'bg-black/40 opacity-0 group-hover:opacity-100'
              } hover:bg-black/70`}
              aria-label="Add to list"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  watchListStatus
                    ? 'fill-red-500 text-red-500'
                    : 'text-white'
                }`}
              />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowDropdown(false); }} />
                <div className="absolute bottom-full left-0 mb-2 z-30 w-36 bg-popover border border-border rounded-lg shadow-xl py-1">
                  {([
                    { category: 'watching' as WatchListCategory, icon: Eye, label: 'Watching', emoji: '👁️' },
                    { category: 'watchlist' as WatchListCategory, icon: ClipboardList, label: 'Watch List', emoji: '📋' },
                    { category: 'finished' as WatchListCategory, icon: CheckCircle, label: 'Finished', emoji: '✅' },
                  ] as const).map((option) => (
                    <button
                      key={option.category}
                      onClick={(e) => { e.stopPropagation(); handleSelectCategory(option.category); }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-ars/10 transition-colors ${
                        watchListStatus === option.category ? 'text-ars font-medium bg-ars/5' : 'text-foreground'
                      }`}
                    >
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                      {watchListStatus === option.category && (
                        <span className="ml-auto text-ars">✓</span>
                      )}
                    </button>
                  ))}
                  {watchListStatus && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectCategory(null); }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-500/10 text-red-500 transition-colors"
                      >
                        <span>❤️</span>
                        <span>None</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Hover Overlay with Play Button */}
          <div className="card-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 transition-opacity duration-300">
            <button
              onClick={(e) => { e.stopPropagation(); onClick?.(item); }}
              className="w-12 h-12 rounded-full bg-ars flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </button>
            <p className="text-white text-xs font-medium">Details</p>
            <button
              onClick={(e) => { e.stopPropagation(); openStream(item); }}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-ars/80 backdrop-blur-sm text-white text-xs font-medium transition-colors"
            >
              <MonitorPlay className="h-3.5 w-3.5" />
              Stream
            </button>
          </div>
        </div>

        {/* Card Info */}
        <div className="pt-2 pb-1 px-1 space-y-1">
          {/* Title */}
          <h3 className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
            {item.title}
          </h3>

          {/* Year & Rating */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {getYear(item.releaseDate) && (
              <span>{getYear(item.releaseDate)}</span>
            )}
            {item.voteAverage > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 rating-star fill-current" />
                <span>{item.voteAverage.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Preview (rendered via portal) */}
      {showPreview && previewRect && (
        <TrailerPreview
          item={item}
          cardRect={previewRect}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

/* ─── Skeleton Variant ─── */

export function ContentCardSkeleton() {
  return (
    <div className="w-[155px] sm:w-[170px] md:w-[185px] flex-shrink-0 rounded-lg overflow-hidden">
      <div className="relative aspect-[2/3] rounded-lg bg-muted skeleton-pulse" />
      <div className="pt-2 pb-1 px-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted skeleton-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted skeleton-pulse" />
      </div>
    </div>
  );
}
