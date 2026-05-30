'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore, type ContentItem, type ContentDetail } from '@/lib/store';
import {
  getContinueWatching,
  addToContinueWatching,
  removeFromContinueWatching,
  getWatchList,
  addToWatchList,
  removeFromWatchList,
  getWatchListStatus,
  moveWatchListItem,
  migrateFavoritesToWatchList,
  getParentalSettings,
  isContentBlocked,
  type WatchListItem,
  type WatchListCategory,
} from '@/lib/storage';
import {
  HOME_SECTIONS,
  GENRE_SECTIONS,
  ANIME_SECTIONS,
  REGIONAL_SECTIONS,
  type SectionConfig,
} from '@/lib/api-config';

import Header from '@/components/ar-stream/Header';
import Sidebar from '@/components/ar-stream/Sidebar';
import HeroCarousel from '@/components/ar-stream/HeroCarousel';
import { ContentRow } from '@/components/ar-stream/ContentRow';
import { DetailModal } from '@/components/ar-stream/DetailModal';
import SearchResults from '@/components/ar-stream/SearchResults';
import LiveTVSection from '@/components/ar-stream/LiveTVSection';
import ContinueWatchingSection from '@/components/ar-stream/ContinueWatchingSection';
import WatchListSection from '@/components/ar-stream/WatchListSection';
import AllContentSection from '@/components/ar-stream/AllContentSection';
import Footer from '@/components/ar-stream/Footer';
import InstallPrompt from '@/components/ar-stream/InstallPrompt';
import MobileBottomNav from '@/components/ar-stream/MobileBottomNav';
import PiPPlayer from '@/components/ar-stream/PiPPlayer';
import DashboardSection from '@/components/ar-stream/DashboardSection';
import ActivityTimeline from '@/components/ar-stream/ActivityTimeline';
import ExportImportSection from '@/components/ar-stream/ExportImportSection';
import { AIRecommendations, FullRecommendationsSection } from '@/components/ar-stream/AIRecommendations';
import PageTransition from '@/components/ar-stream/PageTransition';
import StreamModal from '@/components/ar-stream/StreamModal';

// ─── TMDB Result Mapper ──────────────────────────────────────────────
function mapTmdbResult(item: Record<string, unknown>, type: 'movie' | 'tv'): ContentItem {
  return {
    id: item.id as number,
    title: (item.title || item.name || 'Unknown') as string,
    originalTitle: (item.original_title || item.original_name) as string | undefined,
    overview: (item.overview || '') as string,
    posterPath: (item.poster_path as string) || null,
    backdropPath: (item.backdrop_path as string) || null,
    releaseDate: ((item.release_date || item.first_air_date || '') as string),
    voteAverage: (item.vote_average as number) || 0,
    voteCount: (item.vote_count as number) || 0,
    type,
    genreIds: item.genre_ids as number[] | undefined,
    popularity: item.popularity as number | undefined,
  };
}

function mapJikanResult(item: Record<string, unknown>): ContentItem {
  const images = item.images as Record<string, Record<string, string>> | undefined;
  return {
    id: item.mal_id as number,
    title: (item.title as string) || 'Unknown',
    originalTitle: item.title_japanese as string | undefined,
    overview: (item.synopsis as string) || '',
    posterPath: (images?.jpg?.image_url || images?.webp?.image_url || null) as string | null,
    backdropPath: null,
    releaseDate: (() => {
      const aired = item.aired as Record<string, Record<string, Record<string, number>>> | undefined;
      const year = aired?.prop?.from?.year;
      return year ? String(year) : '';
    })(),
    voteAverage: ((item.score as number) || 0),
    voteCount: (item.scored_by as number) || 0,
    type: 'anime',
    episodes: item.episodes as number | undefined,
    status: item.status as string | undefined,
    genres: item.genres as { mal_id: number; name: string }[] | undefined,
  };
}

// ─── Data Fetching Functions ─────────────────────────────────────────

async function fetchTmdbSection(section: SectionConfig, page: number = 1): Promise<{ items: ContentItem[]; totalPages: number }> {
  const { type, params = {} } = section;
  const endpoint = params.endpoint || 'popular';
  let url = '';

  if (type === 'tmdb-movie') {
    switch (endpoint) {
      case 'trending':
        url = `/api/tmdb/trending/movie/day?page=${page}`;
        break;
      case 'popular':
        url = `/api/tmdb/movie/popular?page=${page}`;
        break;
      case 'top_rated':
        url = `/api/tmdb/movie/top_rated?page=${page}`;
        break;
      case 'now_playing':
        url = `/api/tmdb/movie/now_playing?page=${page}`;
        break;
      case 'upcoming':
        url = `/api/tmdb/movie/upcoming?page=${page}`;
        break;
      default:
        url = `/api/tmdb/movie/popular?page=${page}`;
    }
  } else if (type === 'tmdb-tv') {
    switch (endpoint) {
      case 'trending':
        url = `/api/tmdb/trending/tv/day?page=${page}`;
        break;
      case 'popular':
        url = `/api/tmdb/tv/popular?page=${page}`;
        break;
      case 'top_rated':
        url = `/api/tmdb/tv/top_rated?page=${page}`;
        break;
      default:
        url = `/api/tmdb/tv/popular?page=${page}`;
    }
  } else if (type === 'tmdb-discover-movie') {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'endpoint') queryParams.set(key, value);
    });
    url = `/api/tmdb/discover/movie?${queryParams.toString()}`;
  } else if (type === 'tmdb-discover-tv') {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'endpoint') queryParams.set(key, value);
    });
    url = `/api/tmdb/discover/tv?${queryParams.toString()}`;
  }

  if (!url) return { items: [], totalPages: 1 };

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const data = await res.json();
  const mediaType = type.includes('tv') ? 'tv' : 'movie';
  const items = (data.results || []).slice(0, 20).map((item: Record<string, unknown>) => mapTmdbResult(item, mediaType));
  const totalPages = (data.total_pages as number) || 1;
  return { items, totalPages };
}

async function fetchJikanSection(section: SectionConfig, page: number = 1): Promise<{ items: ContentItem[]; totalPages: number }> {
  const { params = {} } = section;
  const endpoint = params.endpoint || 'top';
  const filter = params.filter || '';
  let url = '';

  switch (endpoint) {
    case 'top':
      url = `/api/jikan/top/anime?limit=20&page=${page}${filter ? `&filter=${filter}` : ''}`;
      break;
    case 'seasons':
      url = `/api/jikan/seasons/now?limit=20&page=${page}`;
      break;
    default:
      url = `/api/jikan/top/anime?limit=20&page=${page}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch anime: ${res.status}`);
  const data = await res.json();
  const items = (data.data || []).slice(0, 20).map((item: Record<string, unknown>) => mapJikanResult(item));
  const lastPage = data.pagination?.last_visible_page as number | undefined;
  const totalPages = lastPage || 1;
  return { items, totalPages };
}

// ─── Section Mapping ─────────────────────────────────────────────────

function getSectionsForView(activeSection: string): SectionConfig[] {
  // For home and all-content, show all sections
  if (activeSection === 'home' || activeSection === 'all-content') {
    return [
      ...HOME_SECTIONS,
      ...GENRE_SECTIONS,
      ...ANIME_SECTIONS,
      ...REGIONAL_SECTIONS,
    ];
  }

  // For specific section, find the matching config
  const allSections = [...HOME_SECTIONS, ...GENRE_SECTIONS, ...ANIME_SECTIONS, ...REGIONAL_SECTIONS];
  const match = allSections.find(s => s.id === activeSection);
  if (match) return [match];

  return [];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function mapWatchListToContentItems(wlItems: WatchListItem[]): ContentItem[] {
  return wlItems.map(f => ({
    id: f.id,
    title: f.title,
    overview: f.overview,
    posterPath: f.posterPath,
    backdropPath: null,
    releaseDate: f.releaseDate,
    voteAverage: f.voteAverage,
    voteCount: 0,
    type: f.type,
    originalTitle: f.originalTitle,
    addedAt: f.addedAt,
    watchListCategory: f.category,
  }));
}

function refreshWatchListItems(): ContentItem[] {
  if (typeof window === 'undefined') return [];
  const wl = getWatchList();
  return mapWatchListToContentItems(wl);
}

// ─── Content Filter (Parental Controls) ───────────────────────────────

function filterBlockedContent(items: ContentItem[]): ContentItem[] {
  return items.filter(item => !isContentBlocked({
    genreIds: item.genreIds,
    voteAverage: item.voteAverage,
  }));
}

// ─── Main Page Component ─────────────────────────────────────────────

export default function Home() {
  const {
    activeSection,
    searchQuery,
    selectedContent,
    detailModalOpen,
    sectionData,
    sectionLoading,
    sectionError,
    sectionPages,
    sectionHasMore,
    sidebarCollapsed,
    pipTrailerKey,
    pipTrailerTitle,
    kidsModeEnabled,
    streamModalOpen,
    streamContent,
    streamUrl,
    setActiveSection,
    setSelectedContent,
    setDetailModalOpen,
    setSectionData,
    setSectionLoading,
    setSectionError,
    appendSectionData,
    setSectionPage,
    setSectionHasMore,
    setPipTrailer,
    setKidsModeEnabled,
    closeStream,
  } = useAppStore();

  // Initialize state from localStorage AFTER hydration to prevent mismatch
  const [watchListItems, setWatchListItems] = useState<ContentItem[]>([]);
  const [continueWatchingItems, setContinueWatchingItems] = useState<ContentItem[]>([]);
  const [loadingMoreSections, setLoadingMoreSections] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const fetchedSections = useRef<Set<string>>(new Set());
  const mainRef = useRef<HTMLDivElement>(null);

  // Load client-only data after mount to avoid hydration mismatch
  useEffect(() => {
    migrateFavoritesToWatchList();
    setWatchListItems(refreshWatchListItems());
    const cw = getContinueWatching();
    setContinueWatchingItems(cw.map(w => ({
      id: w.id,
      title: w.title,
      overview: w.overview || '',
      originalTitle: w.originalTitle,
      posterPath: w.posterPath,
      backdropPath: null,
      releaseDate: w.releaseDate || '',
      voteAverage: w.voteAverage || 0,
      voteCount: 0,
      type: w.type,
      addedAt: w.timestamp,
    })));
    setMounted(true);
  }, []);

  // Initialize kids mode from parental settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const settings = getParentalSettings();
      setKidsModeEnabled(settings.enabled);
    }
  }, [setKidsModeEnabled]);

  // Fetch data for a section
  const fetchSectionData = useCallback(async (section: SectionConfig) => {
    // Use ref as primary guard to prevent re-fetching
    if (fetchedSections.current.has(section.id)) return;

    fetchedSections.current.add(section.id);
    setSectionLoading(section.id, true);

    try {
      let result: { items: ContentItem[]; totalPages: number };

      if (section.type.startsWith('tmdb')) {
        result = await fetchTmdbSection(section, 1);
      } else if (section.type === 'jikan-anime') {
        result = await fetchJikanSection(section, 1);
      } else {
        result = { items: [], totalPages: 1 };
      }

      const filteredItems = filterBlockedContent(result.items);
      setSectionData(section.id, filteredItems);
      setSectionPage(section.id, 1);
      setSectionHasMore(section.id, 1 < result.totalPages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load content';
      setSectionError(section.id, message);
      // Remove from fetched on error so retry works
      fetchedSections.current.delete(section.id);
    }
  }, [setSectionData, setSectionLoading, setSectionError, setSectionPage, setSectionHasMore]);

  // Fetch data when activeSection changes
  useEffect(() => {
    const sections = getSectionsForView(activeSection);
    sections.forEach(section => {
      if (!fetchedSections.current.has(section.id)) {
        fetchSectionData(section);
      }
    });
  }, [activeSection, fetchSectionData]);

  // Scroll to top when section changes
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activeSection]);

  // Handle content item click → open detail modal
  const handleItemClick = useCallback((item: ContentItem) => {
    setSelectedContent(item as ContentDetail);
    setDetailModalOpen(true);

    // Add to continue watching
    addToContinueWatching({
      id: item.id,
      title: item.title,
      posterPath: item.posterPath,
      type: item.type,
      timestamp: Date.now(),
      overview: item.overview,
      voteAverage: item.voteAverage,
      releaseDate: item.releaseDate,
      originalTitle: item.originalTitle,
    });

    // Update local continue watching state
    const cw = getContinueWatching();
    setContinueWatchingItems(cw.map(w => ({
      id: w.id,
      title: w.title,
      overview: w.overview || '',
      originalTitle: w.originalTitle,
      posterPath: w.posterPath,
      backdropPath: null,
      releaseDate: w.releaseDate || '',
      voteAverage: w.voteAverage || 0,
      voteCount: 0,
      type: w.type,
      addedAt: w.timestamp,
    })));
  }, [setSelectedContent, setDetailModalOpen]);

  // Handle watchlist toggle
  const handleWatchListToggle = useCallback((item: ContentItem | ContentDetail, category: WatchListCategory | null) => {
    if (category === null) {
      // Remove from list
      removeFromWatchList(item.id, item.type);
    } else {
      // Add or move to category
      const existingStatus = getWatchListStatus(item.id, item.type);
      if (existingStatus) {
        moveWatchListItem(item.id, item.type, category);
      } else {
        addToWatchList({
          id: item.id,
          title: item.title,
          posterPath: item.posterPath,
          type: item.type,
          voteAverage: item.voteAverage,
          releaseDate: item.releaseDate,
          overview: item.overview,
          originalTitle: item.originalTitle,
          category,
          addedAt: Date.now(),
        });
      }
    }
    // Refresh watchlist items
    setWatchListItems(refreshWatchListItems());
  }, []);

  // Get watchlist status for a given item
  const getWLStatus = useCallback(
    (id: number, type: string): WatchListCategory | null => {
      return getWatchListStatus(id, type);
    },
    [watchListItems] // re-compute when watchlist changes
  );

  // Retry handler
  const handleRetry = useCallback((sectionId: string) => {
    const allSections = [...HOME_SECTIONS, ...GENRE_SECTIONS, ...ANIME_SECTIONS, ...REGIONAL_SECTIONS];
    const section = allSections.find(s => s.id === sectionId);
    if (section) {
      fetchedSections.current.delete(sectionId);
      fetchSectionData(section);
    }
  }, [fetchSectionData]);

  // Load more handler for infinite scroll
  const handleLoadMore = useCallback(async (sectionId: string) => {
    const allSections = [...HOME_SECTIONS, ...GENRE_SECTIONS, ...ANIME_SECTIONS, ...REGIONAL_SECTIONS];
    const section = allSections.find(s => s.id === sectionId);
    if (!section) return;

    const currentPage = sectionPages[sectionId] || 1;
    const nextPage = currentPage + 1;

    setLoadingMoreSections(prev => ({ ...prev, [sectionId]: true }));

    try {
      let result: { items: ContentItem[]; totalPages: number };

      if (section.type.startsWith('tmdb')) {
        result = await fetchTmdbSection(section, nextPage);
      } else if (section.type === 'jikan-anime') {
        result = await fetchJikanSection(section, nextPage);
      } else {
        result = { items: [], totalPages: 1 };
      }

      const filteredItems = filterBlockedContent(result.items);
      appendSectionData(sectionId, filteredItems);
      setSectionPage(sectionId, nextPage);
      setSectionHasMore(sectionId, nextPage < result.totalPages);
    } catch (error) {
      console.error('Failed to load more content:', error);
    } finally {
      setLoadingMoreSections(prev => ({ ...prev, [sectionId]: false }));
    }
  }, [sectionPages, appendSectionData, setSectionPage, setSectionHasMore]);

  // Handle PiP trailer
  const handlePipTrailer = useCallback((key: string, title: string) => {
    setPipTrailer(key, title);
  }, [setPipTrailer]);

  // Handle watch progress update (from EpisodeTracker)
  const handleWatchProgressUpdate = useCallback(() => {
    setWatchListItems(refreshWatchListItems());
  }, []);

  // Get hero items (trending movies)
  const heroItems = filterBlockedContent((sectionData['trending-movies'] || []).slice(0, 5));
  const heroLoading = sectionLoading['trending-movies'] && !sectionData['trending-movies'];

  // Render sections based on active view
  const renderContent = () => {
    // Search view
    if (activeSection === 'search') {
      return (
        <SearchResults
          query={searchQuery}
          onItemClick={handleItemClick}
          onWatchListToggle={handleWatchListToggle}
          watchListStatus={getWLStatus}
        />
      );
    }

    // Live TV view
    if (activeSection === 'live-tv') {
      return <LiveTVSection />;
    }

    // Continue Watching view
    if (activeSection === 'continue-watching') {
      return (
        <ContinueWatchingSection
          items={continueWatchingItems}
          onItemClick={handleItemClick}
          onWatchListToggle={handleWatchListToggle}
          watchListStatus={getWLStatus}
          onRemoveItem={(id, type) => {
            removeFromContinueWatching(id, type);
            const cw = getContinueWatching();
            setContinueWatchingItems(cw.map(w => ({
              id: w.id,
              title: w.title,
              overview: w.overview || '',
              originalTitle: w.originalTitle,
              posterPath: w.posterPath,
              backdropPath: null,
              releaseDate: w.releaseDate || '',
              voteAverage: w.voteAverage || 0,
              voteCount: 0,
              type: w.type,
              addedAt: w.timestamp,
            })));
          }}
          onClearAll={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('ar-stream-continue-watching');
              setContinueWatchingItems([]);
            }
          }}
        />
      );
    }

    // My Lists view
    if (activeSection === 'my-lists') {
      return (
        <WatchListSection
          items={watchListItems}
          onItemClick={handleItemClick}
          onWatchListToggle={handleWatchListToggle}
          watchListStatus={getWLStatus}
          onRemoveFromList={(id, type) => {
            removeFromWatchList(id, type);
            setWatchListItems(refreshWatchListItems());
          }}
          onClearCategory={(category) => {
            const items = getWatchList(category);
            items.forEach(item => removeFromWatchList(item.id, item.type));
            setWatchListItems(refreshWatchListItems());
          }}
        />
      );
    }

    // Dashboard view
    if (activeSection === 'dashboard') {
      return <DashboardSection />;
    }

    // Activity view
    if (activeSection === 'activity') {
      return <ActivityTimeline />;
    }

    // Settings (with data management)
    if (activeSection === 'settings') {
      return <ExportImportSection />;
    }

    // Recommendations / For You view
    if (activeSection === 'recommendations') {
      return (
        <FullRecommendationsSection
          onItemClick={handleItemClick}
          onWatchListToggle={handleWatchListToggle}
          watchListStatus={getWLStatus}
        />
      );
    }

    // All Content view
    if (activeSection === 'all-content') {
      // Aggregate all section data, deduplicate by type-id
      const allItemsMap = new Map<string, ContentItem>();
      Object.values(sectionData).forEach(sectionItems => {
        sectionItems.forEach(item => {
          const key = `${item.type}-${item.id}`;
          if (!allItemsMap.has(key)) {
            allItemsMap.set(key, item);
          }
        });
      });
      const allItems = filterBlockedContent(Array.from(allItemsMap.values()));
      const isLoading = Object.values(sectionLoading).some(v => v) && allItems.length === 0;

      return (
        <AllContentSection
          items={allItems}
          loading={isLoading}
          onItemClick={handleItemClick}
          onWatchListToggle={handleWatchListToggle}
          watchListStatus={getWLStatus}
        />
      );
    }

    // Home or specific section view
    const sections = getSectionsForView(activeSection);

    return (
      <div className="w-full space-y-8 fade-in">
        {/* Hero Carousel - only on home */}
        {activeSection === 'home' && (
          <div className="px-4 sm:px-6 lg:px-8">
            <HeroCarousel
              items={heroItems}
              loading={heroLoading}
              onItemClick={handleItemClick}
            />
          </div>
        )}

        {/* Continue Watching Row - only on home */}
        {activeSection === 'home' && continueWatchingItems.length > 0 && (
          <ContentRow
            title="Continue Watching"
            sectionId="continue-watching"
            items={filterBlockedContent(continueWatchingItems)}
            onItemClick={handleItemClick}
            onWatchListToggle={handleWatchListToggle}
            watchListStatus={getWLStatus}
          />
        )}

        {/* AI Recommendations - only on home */}
        {activeSection === 'home' && (
          <AIRecommendations
            onItemClick={handleItemClick}
            onWatchListToggle={handleWatchListToggle}
            watchListStatus={getWLStatus}
          />
        )}

        {/* Dynamic Content Sections */}
        {sections.map(section => {
          const sectionItems = filterBlockedContent(sectionData[section.id] || []);
          return (
            <ContentRow
              key={section.id}
              title={section.title}
              sectionId={section.id}
              items={sectionItems}
              loading={sectionLoading[section.id] || false}
              error={sectionError[section.id] || null}
              onRetry={() => handleRetry(section.id)}
              onItemClick={handleItemClick}
              onWatchListToggle={handleWatchListToggle}
              watchListStatus={getWLStatus}
              hasMore={sectionHasMore[section.id] || false}
              loadingMore={loadingMoreSections[section.id] || false}
              onLoadMore={handleLoadMore}
            />
          );
        })}
      </div>
    );
  };

  // Calculate main content margin based on sidebar
  const mainMarginLeft = sidebarCollapsed ? 'md:ml-16' : 'md:ml-[240px]';

  // Get the current watchlist status for the selected content (for detail modal)
  const selectedContentStatus = selectedContent
    ? getWatchListStatus(selectedContent.id, selectedContent.type)
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className={`flex-1 ${mainMarginLeft} transition-all duration-300 pt-4 pb-20 md:pb-8`}
        style={{ minHeight: 'calc(100vh - 56px)' }}
      >
        <div className="flex flex-col min-h-full">
          {/* Content */}
          <div className="flex-1">
            <PageTransition sectionKey={activeSection}>
              {renderContent()}
            </PageTransition>
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </main>

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        content={selectedContent}
        onWatchListToggle={handleWatchListToggle}
        watchListStatus={selectedContentStatus}
        onSimilarItemClick={handleItemClick}
        onPipTrailer={handlePipTrailer}
        onWatchProgressUpdate={handleWatchProgressUpdate}
      />

      {/* PiP Player */}
      {pipTrailerKey && (
        <PiPPlayer
          trailerKey={pipTrailerKey}
          title={pipTrailerTitle}
          onClose={() => setPipTrailer(null, null)}
        />
      )}

      {/* Stream Player Modal */}
      <StreamModal
        open={streamModalOpen}
        onClose={closeStream}
        content={streamContent}
        initialUrl={streamUrl || undefined}
      />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
