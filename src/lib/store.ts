import { create } from 'zustand';
import type { WatchListCategory } from '@/lib/storage';

export type ContentType = 'movie' | 'tv' | 'anime';
export type ActiveSection = 'home' | 'search' | 'live-tv' | 'my-lists' | 'continue-watching' | 'all-content' | 'recommendations' | 'settings' | 'dashboard' | 'activity' | string;

export interface ContentItem {
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  type: ContentType;
  genreIds?: number[];
  popularity?: number;
  // Anime-specific
  episodes?: number;
  status?: string;
  genres?: { mal_id: number; name: string }[];
  score?: number;
  // WatchList-specific
  addedAt?: number;
  watchListCategory?: WatchListCategory;
}

export interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate?: string;
}

export interface ContentDetail extends ContentItem {
  tagline?: string;
  runtime?: number;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  genres: { id: number; name: string }[] | { mal_id: number; name: string }[];
  productionCompanies?: { id: number; name: string; logo_path: string | null }[];
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  trailerKey?: string;
  similar?: ContentItem[];
  homepage?: string;
  networks?: { id: number; name: string; logo_path: string | null }[];
  nextEpisodeToAir?: { id: number; name: string; air_date: string };
  seasons?: SeasonInfo[];
}

export interface SearchResult {
  results: ContentItem[];
  totalResults: number;
  page: number;
  totalPages: number;
}

interface AppState {
  // UI State
  activeSection: ActiveSection;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  searchQuery: string;
  theme: 'light' | 'dark';

  // Content State
  selectedContent: ContentItem | null;
  detailModalOpen: boolean;
  searchResults: SearchResult | null;
  isSearching: boolean;

  // Data cache
  sectionData: Record<string, ContentItem[]>;
  sectionLoading: Record<string, boolean>;
  sectionError: Record<string, string | null>;
  sectionPages: Record<string, number>;
  sectionHasMore: Record<string, boolean>;

  // PiP State
  pipTrailerKey: string | null;
  pipTrailerTitle: string | null;

  // Parental Controls State
  kidsModeEnabled: boolean;

  // Stream Player State
  streamModalOpen: boolean;
  streamContent: ContentItem | null;
  streamUrl: string | null;

  // Actions
  setActiveSection: (section: ActiveSection) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSelectedContent: (content: ContentItem | null) => void;
  setDetailModalOpen: (open: boolean) => void;
  setSearchResults: (results: SearchResult | null) => void;
  setIsSearching: (searching: boolean) => void;
  setSectionData: (sectionId: string, data: ContentItem[]) => void;
  appendSectionData: (sectionId: string, data: ContentItem[]) => void;
  setSectionLoading: (sectionId: string, loading: boolean) => void;
  setSectionError: (sectionId: string, error: string | null) => void;
  setSectionPage: (sectionId: string, page: number) => void;
  setSectionHasMore: (sectionId: string, hasMore: boolean) => void;
  setPipTrailer: (key: string | null, title: string | null) => void;
  setKidsModeEnabled: (enabled: boolean) => void;
  openStream: (content?: ContentItem | null, url?: string | null) => void;
  closeStream: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // UI State
  activeSection: 'home',
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  searchQuery: '',
  theme: 'dark',

  // Content State
  selectedContent: null,
  detailModalOpen: false,
  searchResults: null,
  isSearching: false,

  // Data cache
  sectionData: {},
  sectionLoading: {},
  sectionError: {},
  sectionPages: {},
  sectionHasMore: {},

  // PiP State
  pipTrailerKey: null,
  pipTrailerTitle: null,

  // Parental Controls State
  kidsModeEnabled: false,

  // Stream Player State
  streamModalOpen: false,
  streamContent: null,
  streamUrl: null,

  // Actions
  setActiveSection: (section) => set({ activeSection: section, mobileSidebarOpen: false }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTheme: (theme) => set({ theme }),
  setSelectedContent: (content) => set({ selectedContent: content }),
  setDetailModalOpen: (open) => set({ detailModalOpen: open }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  setSectionData: (sectionId, data) =>
    set((state) => ({
      sectionData: { ...state.sectionData, [sectionId]: data },
      sectionLoading: { ...state.sectionLoading, [sectionId]: false },
      sectionError: { ...state.sectionError, [sectionId]: null },
    })),
  appendSectionData: (sectionId, newData) =>
    set((state) => {
      const existing = state.sectionData[sectionId] || [];
      // Deduplicate by type-id
      const existingKeys = new Set(existing.map(i => `${i.type}-${i.id}`));
      const uniqueNew = newData.filter(i => !existingKeys.has(`${i.type}-${i.id}`));
      return {
        sectionData: { ...state.sectionData, [sectionId]: [...existing, ...uniqueNew] },
        sectionLoading: { ...state.sectionLoading, [sectionId]: false },
      };
    }),
  setSectionLoading: (sectionId, loading) =>
    set((state) => ({
      sectionLoading: { ...state.sectionLoading, [sectionId]: loading },
    })),
  setSectionError: (sectionId, error) =>
    set((state) => ({
      sectionLoading: { ...state.sectionLoading, [sectionId]: false },
      sectionError: { ...state.sectionError, [sectionId]: error },
    })),
  setSectionPage: (sectionId, page) =>
    set((state) => ({
      sectionPages: { ...state.sectionPages, [sectionId]: page },
    })),
  setSectionHasMore: (sectionId, hasMore) =>
    set((state) => ({
      sectionHasMore: { ...state.sectionHasMore, [sectionId]: hasMore },
    })),
  setPipTrailer: (key, title) =>
    set({ pipTrailerKey: key, pipTrailerTitle: title }),
  setKidsModeEnabled: (enabled) =>
    set({ kidsModeEnabled: enabled }),
  openStream: (content, url) =>
    set({ streamModalOpen: true, streamContent: content || null, streamUrl: url || null }),
  closeStream: () =>
    set({ streamModalOpen: false, streamContent: null, streamUrl: null }),
}));
