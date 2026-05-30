'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Play,
  Link,
  History,
  Trash2,
  Film,
  Tv,
  Globe,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MonitorPlay,
  Smartphone,
  Copy,
  Share2,
  Check,
  Chrome,
  Tv2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import VideoPlayer from './VideoPlayer';
import type { ContentItem } from '@/lib/store';

// ─── Embed Sources ──────────────────────────────────────────────────
// These services provide embedded video players using TMDB IDs

interface EmbedSource {
  id: string;
  name: string;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
}

const EMBED_SOURCES: EmbedSource[] = [
  {
    id: 'vidsrc',
    name: 'VidSrc',
    getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: 'vidsrc-to',
    name: 'VidSrc.to',
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: '2embed',
    name: '2Embed',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
];

// ─── External Player Definitions ─────────────────────────────────────

interface ExternalPlayer {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  packageName: string;  // Android package name for intent
  description: string;
  color: string;  // Tailwind color class
}

const EXTERNAL_PLAYERS: ExternalPlayer[] = [
  {
    id: 'mx-player',
    name: 'MX Player',
    icon: Play,
    packageName: 'com.mxtech.videoplayer.ad',
    description: 'Popular Android video player with HW accel',
    color: 'text-blue-500',
  },
  {
    id: 'mx-player-pro',
    name: 'MX Player Pro',
    icon: Play,
    packageName: 'com.mxtech.videoplayer.pro',
    description: 'Ad-free version of MX Player',
    color: 'text-blue-600',
  },
  {
    id: 'vlc',
    name: 'VLC',
    icon: Tv2,
    packageName: 'org.videolan.vlc',
    description: 'Cross-platform multimedia player',
    color: 'text-orange-500',
  },
  {
    id: 'just-player',
    name: 'Just Player',
    icon: MonitorPlay,
    packageName: 'com.brouken.player',
    description: 'Lightweight ExoPlayer-based player',
    color: 'text-green-500',
  },
  {
    id: 's-player',
    name: 'S Player',
    icon: Film,
    packageName: 'com.panaceasoft.splayer',
    description: 'Simple & clean video player',
    color: 'text-purple-500',
  },
  {
    id: 'mpv',
    name: 'mpv',
    icon: Play,
    packageName: 'is.xyz.mpv',
    description: 'Minimalist media player',
    color: 'text-gray-400',
  },
];

// ─── Stream History Storage ─────────────────────────────────────────

interface StreamHistoryEntry {
  url: string;
  title: string;
  timestamp: number;
  type: 'movie' | 'tv' | 'anime' | 'other';
  contentId?: number;
}

const STREAM_HISTORY_KEY = 'ar-stream-history';
const MAX_HISTORY = 20;

function getStreamHistory(): StreamHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STREAM_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function addToStreamHistory(entry: StreamHistoryEntry) {
  if (typeof window === 'undefined') return;
  try {
    const history = getStreamHistory();
    const filtered = history.filter(h => h.url !== entry.url);
    filtered.unshift(entry);
    const trimmed = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(STREAM_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
}

function clearStreamHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STREAM_HISTORY_KEY);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8') || url.includes('m3u8');
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mkv|avi|mov|m3u8)(\?|$)/i.test(url) || isHlsUrl(url);
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'movie': return Film;
    case 'tv': return Tv;
    case 'anime': return Globe;
    default: return Play;
  }
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// ─── External Player Launch Helpers ─────────────────────────────────

/**
 * Generate an Android intent URL to open a video URL in a specific player.
 * Format: intent://url#Intent;scheme=https;package=com.example.player;end
 */
function getAndroidIntentUrl(videoUrl: string, packageName: string): string {
  const encodedUrl = encodeURIComponent(videoUrl);
  // Use the intent scheme with the URL as data
  return `intent:${videoUrl}#Intent;scheme=${new URL(videoUrl).protocol.replace(':', '')};package=${packageName};S.title=${encodedUrl};end`;
}

/**
 * Generate a VLC-specific URL scheme
 */
function getVlcUrl(videoUrl: string): string {
  return `vlc://${videoUrl}`;
}

/**
 * Open URL in external player
 */
function openInExternalPlayer(videoUrl: string, player: ExternalPlayer): void {
  let launchUrl: string;

  if (player.id === 'vlc') {
    // VLC uses its own URL scheme
    launchUrl = getVlcUrl(videoUrl);
  } else {
    // Use Android intent URL for other players
    launchUrl = getAndroidIntentUrl(videoUrl, player.packageName);
  }

  // Try to open the URL - on Android this will launch the app via intent
  const link = document.createElement('a');
  link.href = launchUrl;
  link.click();

  // Fallback: also try window.open for browsers that support it
  // Some Android browsers handle intent:// URLs via window.location
  try {
    window.open(launchUrl, '_blank');
  } catch {
    // Silently fail - the link click should handle it
  }
}

/**
 * Open URL in system browser (for embed URLs that can't be played in native players)
 */
function openInBrowser(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Copy URL to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Share URL using Web Share API (works great on mobile)
 */
async function shareUrl(url: string, title: string): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share({
      title,
      text: `Watch ${title} on AR-Stream`,
      url,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Props ──────────────────────────────────────────────────────────

interface StreamModalProps {
  open: boolean;
  onClose: () => void;
  content?: ContentItem | null;
  initialUrl?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function StreamModal({ open, onClose, content, initialUrl }: StreamModalProps) {
  // Player mode: 'embed' (iframe) | 'direct' (HLS/MP4 video) | 'input' (URL input)
  const [playerMode, setPlayerMode] = useState<'embed' | 'direct' | 'input'>('embed');
  const [activeEmbedUrl, setActiveEmbedUrl] = useState<string | null>(null);
  const [activeDirectUrl, setActiveDirectUrl] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [activePoster, setActivePoster] = useState<string | undefined>(undefined);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [maxSeasons, setMaxSeasons] = useState(1);
  const [maxEpisodes, setMaxEpisodes] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0); // for forcing iframe reload

  // Manual URL input
  const [streamUrl, setStreamUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<StreamHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // External player UI
  const [showExternalMenu, setShowExternalMenu] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Track if we've auto-started
  const autoStartedRef = useRef(false);

  // Get the current active URL for external player use
  const currentUrl = playerMode === 'embed' ? activeEmbedUrl : activeDirectUrl;
  const isDirectStream = currentUrl ? isDirectVideoUrl(currentUrl) : false;

  // ─── Get embed URL for current content ───────────────────────────
  const getEmbedUrl = useCallback((sourceIdx: number = 0): string | null => {
    if (!content) return null;
    const source = EMBED_SOURCES[sourceIdx];
    if (!source) return null;

    if (content.type === 'movie') {
      return source.getMovieUrl(content.id);
    } else if (content.type === 'tv' || content.type === 'anime') {
      return source.getTvUrl(content.id, season, episode);
    }
    return source.getMovieUrl(content.id);
  }, [content, season, episode]);

  // ─── Start streaming content ─────────────────────────────────────
  const startStream = useCallback((sourceIdx: number = 0) => {
    if (!content) return;

    const url = getEmbedUrl(sourceIdx);
    if (!url) return;

    const title = content.title;
    setActiveTitle(title);
    setCurrentSourceIndex(sourceIdx);
    setPlayerMode('embed');
    setActiveEmbedUrl(url);
    setIsLoading(true);
    setIframeKey(prev => prev + 1);

    if (content.posterPath) {
      const posterBase = content.type === 'anime' && content.posterPath.startsWith('http')
        ? ''
        : `${TMDB_IMAGE_BASE}/w500`;
      setActivePoster(`${posterBase}${content.posterPath}`);
    }

    addToStreamHistory({
      url,
      title,
      timestamp: Date.now(),
      type: content.type || 'other',
      contentId: content.id,
    });
    setTimeout(() => setHistory(getStreamHistory()), 0);
  }, [content, getEmbedUrl]);

  // ─── Play direct URL (for manual URL input or sample streams) ───
  const handlePlayDirect = useCallback((url?: string, title?: string) => {
    const playUrl = url || streamUrl.trim();
    if (!playUrl) {
      setUrlError('Please enter a video URL');
      return;
    }

    try {
      new URL(playUrl);
    } catch {
      setUrlError('Invalid URL format. Please enter a valid video URL.');
      return;
    }

    setUrlError(null);
    setActiveTitle(title || content?.title || new URL(playUrl).hostname);
    setActiveDirectUrl(playUrl);
    setPlayerMode('direct');

    addToStreamHistory({
      url: playUrl,
      title: title || content?.title || 'Manual Stream',
      timestamp: Date.now(),
      type: content?.type || 'other',
      contentId: content?.id,
    });
    setTimeout(() => setHistory(getStreamHistory()), 0);
  }, [streamUrl, content]);

  // ─── Switch embed source ─────────────────────────────────────────
  const switchSource = useCallback((direction: 'next' | 'prev') => {
    const newIdx = direction === 'next'
      ? (currentSourceIndex + 1) % EMBED_SOURCES.length
      : (currentSourceIndex - 1 + EMBED_SOURCES.length) % EMBED_SOURCES.length;
    startStream(newIdx);
  }, [currentSourceIndex, startStream]);

  // ─── Season/Episode change ───────────────────────────────────────
  const handleSeasonEpisodeChange = useCallback(() => {
    startStream(currentSourceIndex);
  }, [currentSourceIndex, startStream]);

  // ─── Auto-start when opened with content ─────────────────────────
  useEffect(() => {
    if (open && content && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setTimeout(() => {
        if (initialUrl) {
          // Direct URL provided
          handlePlayDirect(initialUrl, content.title);
        } else {
          // Auto-embed based on TMDB ID
          startStream(0);
        }
      }, 100);
    }
    if (!open) {
      autoStartedRef.current = false;
    }
  }, [open, content, initialUrl, startStream, handlePlayDirect]);

  // ─── Load history when opening ───────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => setHistory(getStreamHistory()), 0);
    }
  }, [open]);

  // ─── Fetch season info for TV shows ──────────────────────────────
  useEffect(() => {
    if (!open || !content || content.type === 'movie') return;

    const fetchSeasonInfo = async () => {
      try {
        const mediaType = content.type === 'anime' ? 'tv' : content.type;
        const res = await fetch(`/api/tmdb/${mediaType}/${content.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.seasons) {
            const realSeasons = data.seasons.filter(
              (s: { season_number: number }) => s.season_number > 0
            );
            setMaxSeasons(realSeasons.length || 1);
            if (realSeasons.length > 0) {
              setMaxEpisodes(realSeasons[0].episode_count || 1);
            }
          }
          if (data.number_of_seasons) {
            setMaxSeasons(data.number_of_seasons);
          }
          if (data.number_of_episodes) {
            setMaxEpisodes(data.number_of_episodes);
          }
        }
      } catch {
        // Use defaults
      }
    };

    fetchSeasonInfo();
  }, [open, content]);

  // ─── Reset on close ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setActiveEmbedUrl(null);
        setActiveDirectUrl(null);
        setPlayerMode('embed');
        setStreamUrl('');
        setUrlError(null);
        setShowHistory(false);
        setCurrentSourceIndex(0);
        setSeason(1);
        setEpisode(1);
        setMaxSeasons(1);
        setMaxEpisodes(1);
        setIsLoading(true);
        setShowExternalMenu(false);
        setCopiedUrl(false);
      }, 0);
    }
  }, [open]);

  const handleClearHistory = useCallback(() => {
    clearStreamHistory();
    setHistory([]);
  }, []);

  const handleDeleteHistoryItem = useCallback((url: string) => {
    const updated = getStreamHistory().filter(h => h.url !== url);
    localStorage.setItem(STREAM_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  }, []);

  // ─── External Player Handlers ────────────────────────────────────
  const handleCopyUrl = useCallback(async () => {
    if (!currentUrl) return;
    const success = await copyToClipboard(currentUrl);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }, [currentUrl]);

  const handleShare = useCallback(async () => {
    if (!currentUrl) return;
    await shareUrl(currentUrl, activeTitle);
  }, [currentUrl, activeTitle]);

  const handleOpenInPlayer = useCallback((player: ExternalPlayer) => {
    if (!currentUrl) return;
    openInExternalPlayer(currentUrl, player);
    setShowExternalMenu(false);
  }, [currentUrl]);

  const handleOpenInBrowser = useCallback(() => {
    if (!currentUrl) return;
    openInBrowser(currentUrl);
    setShowExternalMenu(false);
  }, [currentUrl]);

  // ─── Render ──────────────────────────────────────────────────────
  const isPlaying = playerMode === 'embed' ? !!activeEmbedUrl : playerMode === 'direct' ? !!activeDirectUrl : false;

  // ─── External Player Dropdown Component ──────────────────────────
  const renderExternalPlayerMenu = () => {
    if (!currentUrl) return null;

    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExternalMenu(!showExternalMenu)}
          className="h-7 text-xs px-2 gap-1 border-ars/30 text-ars hover:bg-ars/10"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">External</span>
          <ChevronRight className={`h-3 w-3 transition-transform ${showExternalMenu ? 'rotate-90' : ''}`} />
        </Button>

        {showExternalMenu && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setShowExternalMenu(false)} />

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2.5 bg-ars/5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-ars" />
                  <span className="text-sm font-semibold text-foreground">Open in External Player</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isDirectStream
                    ? 'Direct stream — compatible with all players'
                    : 'Embed page — best viewed in browser'}
                </p>
              </div>

              {/* Direct Video Players (only show for direct video URLs) */}
              {isDirectStream && (
                <div className="py-1">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Video Players
                  </p>
                  {EXTERNAL_PLAYERS.map((player) => {
                    const PlayerIcon = player.icon;
                    return (
                      <button
                        key={player.id}
                        onClick={() => handleOpenInPlayer(player)}
                        className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-ars/5 transition-colors"
                      >
                        <div className={`p-1.5 rounded-md bg-muted ${player.color}`}>
                          <PlayerIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{player.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{player.description}</p>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Browser & System Options */}
              <div className="py-1 border-t border-border/50">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  {isDirectStream ? 'System' : 'Recommended'}
                </p>

                {/* Open in Browser */}
                <button
                  onClick={handleOpenInBrowser}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-ars/5 transition-colors"
                >
                  <div className="p-1.5 rounded-md bg-muted text-sky-500">
                    <Chrome className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Open in Browser</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isDirectStream ? 'Play in web browser' : 'Best for embed streams'}
                    </p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>

                {/* Copy URL */}
                <button
                  onClick={handleCopyUrl}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-ars/5 transition-colors"
                >
                  <div className="p-1.5 rounded-md bg-muted text-emerald-500">
                    {copiedUrl ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {copiedUrl ? 'Copied!' : 'Copy URL'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                      {copiedUrl ? 'Paste in any player' : currentUrl}
                    </p>
                  </div>
                </button>

                {/* Share */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={handleShare}
                    className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-ars/5 transition-colors"
                  >
                    <div className="p-1.5 rounded-md bg-muted text-amber-500">
                      <Share2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Share</p>
                      <p className="text-[10px] text-muted-foreground">Send to another app</p>
                    </div>
                  </button>
                )}
              </div>

              {/* URL Preview */}
              <div className="px-3 py-2 bg-muted/30 border-t border-border/50">
                <p className="text-[9px] text-muted-foreground font-mono break-all leading-relaxed">
                  {currentUrl}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="p-0 gap-0 max-w-6xl sm:max-w-6xl w-full sm:w-[95vw]
          h-[95vh] sm:h-[92vh] rounded-xl border-border/50
          bg-background flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          Stream Player — {activeTitle || 'AR-Stream'}
        </DialogTitle>

        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-border/50 bg-card/50">
            <Play className="h-5 w-5 text-ars fill-ars shrink-0" />
            <h2 className="text-sm sm:text-lg font-bold text-foreground truncate">
              {isPlaying ? activeTitle : 'Stream Player'}
            </h2>
            <div className="flex-1" />

            {/* Mode toggle buttons */}
            {content && isPlaying && (
              <div className="flex items-center gap-1">
                <Button
                  variant={playerMode === 'embed' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPlayerMode('embed')}
                  className="h-7 text-xs px-2"
                >
                  <MonitorPlay className="h-3.5 w-3.5 mr-1" />
                  Embed
                </Button>
                <Button
                  variant={playerMode === 'input' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPlayerMode('input')}
                  className="h-7 text-xs px-2"
                >
                  <Link className="h-3.5 w-3.5 mr-1" />
                  URL
                </Button>
              </div>
            )}

            {/* External Player Button - always show when playing */}
            {isPlaying && renderExternalPlayerMenu()}

            {isPlaying && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveEmbedUrl(null);
                  setActiveDirectUrl(null);
                  setPlayerMode('input');
                }}
                className="text-muted-foreground hover:text-foreground h-7 text-xs"
              >
                <Link className="h-3.5 w-3.5 mr-1" />
                New
              </Button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ─── Embed Player Mode ─── */}
          {playerMode === 'embed' && activeEmbedUrl && (
            <div className="flex-1 flex flex-col">
              {/* Iframe Player */}
              <div className="relative flex-1 bg-black">
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
                    <Loader2 className="h-10 w-10 text-ars animate-spin" />
                    <p className="text-white/60 text-sm">Loading stream...</p>
                    <p className="text-white/40 text-xs">Source: {EMBED_SOURCES[currentSourceIndex]?.name}</p>
                  </div>
                )}
                <iframe
                  key={iframeKey}
                  src={activeEmbedUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  referrerPolicy="origin"
                  onLoad={() => setIsLoading(false)}
                  title={`Streaming ${activeTitle}`}
                />
              </div>

              {/* Controls Bar */}
              <div className="px-3 sm:px-4 py-2.5 bg-card/80 border-t border-border/30 space-y-2">
                {/* Source Switcher + Season/Episode + External Player */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Source indicator */}
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <span className="size-1.5 rounded-full bg-ars" />
                    Source: {EMBED_SOURCES[currentSourceIndex]?.name}
                  </Badge>

                  {/* Prev/Next Source */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => switchSource('prev')}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Previous source"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {currentSourceIndex + 1}/{EMBED_SOURCES.length}
                    </span>
                    <button
                      onClick={() => switchSource('next')}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Next source"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Reload */}
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      setIframeKey(prev => prev + 1);
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Reload player"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>

                  {/* External Player Quick Actions */}
                  <div className="flex items-center gap-1 ml-auto">
                    {/* Quick copy */}
                    <button
                      onClick={handleCopyUrl}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title={copiedUrl ? 'URL Copied!' : 'Copy stream URL'}
                    >
                      {copiedUrl ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Quick open in browser */}
                    <button
                      onClick={handleOpenInBrowser}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Open in browser"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>

                    {/* Quick share (mobile) */}
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button
                        onClick={handleShare}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Share"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Season/Episode selector for TV/Anime */}
                  {(content?.type === 'tv' || content?.type === 'anime') && (
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">S</span>
                        <button
                          onClick={() => {
                            const newS = Math.max(1, season - 1);
                            setSeason(newS);
                            setEpisode(1);
                          }}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-foreground w-5 text-center">{season}</span>
                        <button
                          onClick={() => {
                            const newS = Math.min(maxSeasons, season + 1);
                            setSeason(newS);
                            setEpisode(1);
                          }}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">E</span>
                        <button
                          onClick={() => setEpisode(Math.max(1, episode - 1))}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-foreground w-5 text-center">{episode}</span>
                        <button
                          onClick={() => setEpisode(Math.min(maxEpisodes, episode + 1))}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSeasonEpisodeChange}
                          className="h-6 text-[10px] px-2 text-ars hover:text-ars"
                        >
                          Go
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content info + External Player CTA */}
                {content && (
                  <div className="flex items-center gap-2">
                    {content.posterPath && (
                      <div className="relative w-8 h-12 rounded overflow-hidden shrink-0">
                        <Image
                          src={content.posterPath.startsWith('http')
                            ? content.posterPath
                            : `${TMDB_IMAGE_BASE}/w92${content.posterPath}`}
                          alt={content.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{content.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[8px] h-4 px-1" variant="secondary">
                          {content.type === 'movie' ? 'Movie' : content.type === 'tv' ? 'TV' : 'Anime'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Switch sources or open externally →
                        </span>
                      </div>
                    </div>

                    {/* Mobile-friendly External Player Quick Button */}
                    <button
                      onClick={() => setShowExternalMenu(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-ars/10 border border-ars/20 text-ars hover:bg-ars/20 transition-colors shrink-0 sm:hidden"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium">Play in...</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Direct Video Player Mode ─── */}
          {playerMode === 'direct' && activeDirectUrl && (
            <div className="flex-1 flex flex-col">
              <VideoPlayer
                src={activeDirectUrl}
                title={activeTitle}
                poster={activePoster}
                autoPlay
                onEnded={() => {}}
              />
              <div className="px-4 py-2.5 bg-card/30 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activeTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{activeDirectUrl}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {isHlsUrl(activeDirectUrl) ? 'HLS' : 'Direct'}
                  </Badge>

                  {/* External Player Quick Actions for Direct Mode */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopyUrl}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title={copiedUrl ? 'URL Copied!' : 'Copy URL for external player'}
                    >
                      {copiedUrl ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        // Quick open in MX Player (most popular)
                        if (currentUrl) {
                          openInExternalPlayer(currentUrl, EXTERNAL_PLAYERS[0]);
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 transition-colors"
                      title="Open in MX Player"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium">MX</span>
                    </button>
                    <button
                      onClick={() => {
                        if (currentUrl) {
                          openInExternalPlayer(currentUrl, EXTERNAL_PLAYERS.find(p => p.id === 'vlc')!);
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20 transition-colors"
                      title="Open in VLC"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium">VLC</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── URL Input Mode ─── */}
          {(playerMode === 'input' || (!activeEmbedUrl && !activeDirectUrl)) && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Content Info Banner */}
                {content && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-ars/5 border border-ars/20">
                    {content.posterPath && (
                      <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 shadow-lg">
                        <Image
                          src={content.posterPath.startsWith('http')
                            ? content.posterPath
                            : `${TMDB_IMAGE_BASE}/w185${content.posterPath}`}
                          alt={content.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Badge className="text-[10px] h-4 px-1.5 mb-1" variant="secondary">
                        {content.type === 'movie' ? 'Movie' : content.type === 'tv' ? 'TV Show' : 'Anime'}
                      </Badge>
                      <h3 className="text-lg font-bold text-foreground truncate">{content.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click a source below to start streaming instantly
                      </p>
                    </div>
                    <Button
                      className="bg-ars hover:bg-ars/90 text-ars-foreground font-semibold shrink-0"
                      onClick={() => startStream(0)}
                    >
                      <Play className="h-4 w-4 fill-current mr-1.5" />
                      Play
                    </Button>
                  </div>
                )}

                {/* Quick Play Sources */}
                {content && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MonitorPlay className="h-4 w-4 text-ars" />
                      Stream Sources
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {EMBED_SOURCES.map((source, idx) => (
                        <button
                          key={source.id}
                          onClick={() => startStream(idx)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                            idx === currentSourceIndex && activeEmbedUrl
                              ? 'border-ars/50 bg-ars/5'
                              : 'border-border/50 bg-card/30 hover:bg-ars/5 hover:border-ars/30'
                          }`}
                        >
                          <Play className={`h-4 w-4 shrink-0 ${idx === currentSourceIndex && activeEmbedUrl ? 'text-ars fill-ars' : 'text-ars'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{source.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {content.type === 'movie' ? 'Movie' : `S${season}E${episode}`} — TMDB #{content.id}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Player Quick Access */}
                {content && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-ars" />
                      External Players
                      <span className="text-[10px] text-muted-foreground font-normal">(mobile)</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {EXTERNAL_PLAYERS.slice(0, 4).map((player) => {
                        const PlayerIcon = player.icon;
                        return (
                          <button
                            key={player.id}
                            onClick={() => {
                              const url = getEmbedUrl(0);
                              if (url) openInExternalPlayer(url, player);
                            }}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card/30 hover:bg-ars/5 hover:border-ars/30 transition-colors text-left`}
                          >
                            <div className={`p-1 rounded ${player.color} bg-muted`}>
                              <PlayerIcon className="h-3 w-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{player.name}</p>
                              <p className="text-[9px] text-muted-foreground truncate">Open in app</p>
                            </div>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          const url = getEmbedUrl(0);
                          if (url) openInBrowser(url);
                        }}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card/30 hover:bg-ars/5 hover:border-ars/30 transition-colors text-left"
                      >
                        <div className="p-1 rounded bg-muted text-sky-500">
                          <Chrome className="h-3 w-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">Browser</p>
                          <p className="text-[9px] text-muted-foreground truncate">Open in browser</p>
                        </div>
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      External players work best with direct video URLs (MP4, M3U8). Embed sources open in browser.
                    </p>
                  </div>
                )}

                {/* Manual URL Input (advanced) */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    Custom URL
                    <span className="text-[10px] text-muted-foreground font-normal">(advanced)</span>
                  </h3>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="url"
                        placeholder="https://example.com/video.mp4 or .m3u8"
                        value={streamUrl}
                        onChange={(e) => {
                          setStreamUrl(e.target.value);
                          setUrlError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePlayDirect();
                        }}
                        className={urlError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                    </div>
                    <Button
                      onClick={() => handlePlayDirect()}
                      variant="outline"
                      className="shrink-0"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Play
                    </Button>
                  </div>
                  {urlError && (
                    <p className="text-xs text-red-500">{urlError}</p>
                  )}

                  {/* Quick external player buttons for direct URLs */}
                  {streamUrl.trim() && isDirectVideoUrl(streamUrl.trim()) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">Open in:</span>
                      {EXTERNAL_PLAYERS.slice(0, 3).map((player) => {
                        const PlayerIcon = player.icon;
                        return (
                          <button
                            key={player.id}
                            onClick={() => openInExternalPlayer(streamUrl.trim(), player)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md border border-border/50 hover:bg-ars/5 hover:border-ars/30 transition-colors text-[10px] font-medium ${player.color}`}
                          >
                            <PlayerIcon className="h-3 w-3" />
                            {player.name}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => openInBrowser(streamUrl.trim())}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/50 hover:bg-ars/5 hover:border-ars/30 transition-colors text-[10px] font-medium text-sky-500"
                      >
                        <Chrome className="h-3 w-3" />
                        Browser
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    Supports MP4, WebM, and HLS/M3U8 streams. Direct URLs work with external players.
                  </p>
                </div>

                {/* Stream History */}
                {history.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-sm font-semibold text-foreground flex items-center gap-2 hover:text-ars transition-colors"
                      >
                        <History className="h-4 w-4" />
                        History ({history.length})
                      </button>
                      {showHistory && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearHistory}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    {showHistory && (
                      <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {history.map((entry, index) => {
                          const TypeIcon = getTypeIcon(entry.type);
                          return (
                            <div
                              key={`${entry.url}-${index}`}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
                            >
                              <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground truncate">{entry.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{entry.url}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(entry.timestamp).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handlePlayDirect(entry.url, entry.title)}
                                className="p-1 rounded-md hover:bg-ars/10 text-ars opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Play again"
                              >
                                <Play className="h-3.5 w-3.5 fill-ars" />
                              </button>
                              <button
                                onClick={() => handleDeleteHistoryItem(entry.url)}
                                className="p-1 rounded-md hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
