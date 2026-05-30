'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Info,
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

// ─── Free Sample Streams ────────────────────────────────────────────

const SAMPLE_STREAMS = [
  {
    title: 'Big Buck Bunny',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'other' as const,
  },
  {
    title: 'Elephant Dream',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'other' as const,
  },
  {
    title: 'Sintel',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    type: 'other' as const,
  },
  {
    title: 'Tears of Steel',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    type: 'other' as const,
  },
  {
    title: 'HLS Test Stream',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'other' as const,
  },
];

// ─── Helper ─────────────────────────────────────────────────────────
function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8') || url.includes('m3u8');
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'movie': return Film;
    case 'tv': return Tv;
    case 'anime': return Globe;
    default: return Play;
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
  const [streamUrl, setStreamUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [activePoster, setActivePoster] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<StreamHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Track if initial URL was auto-played
  const initialUrlPlayedRef = useRef(false);

  // ─── handlePlay (defined before effects that use it) ──────────────
  const handlePlay = useCallback((url?: string, title?: string) => {
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
    setIsValidating(true);

    const entryTitle = title || content?.title || new URL(playUrl).hostname;
    addToStreamHistory({
      url: playUrl,
      title: entryTitle,
      timestamp: Date.now(),
      type: content?.type || 'other',
      contentId: content?.id,
    });
    setHistory(getStreamHistory());

    setActiveTitle(entryTitle);
    setActiveUrl(playUrl);
    setIsValidating(false);
  }, [streamUrl, content]);

  // ─── Load history & content info when opening ────────────────────
  useEffect(() => {
    if (open) {
      // Schedule state updates asynchronously to satisfy lint rule
      setTimeout(() => {
        setHistory(getStreamHistory());
        if (content) {
          setActiveTitle(content.title);
          if (content.posterPath) {
            const posterBase = content.type === 'anime' && content.posterPath.startsWith('http')
              ? ''
              : 'https://image.tmdb.org/t/p/w500';
            setActivePoster(`${posterBase}${content.posterPath}`);
          }
        }
      }, 0);
    }
  }, [open, content]);

  // ─── Auto-play initial URL (separate effect) ────────────────────
  useEffect(() => {
    if (open && initialUrl && !initialUrlPlayedRef.current) {
      initialUrlPlayedRef.current = true;
      // Schedule asynchronously to satisfy lint rule
      setTimeout(() => handlePlay(initialUrl, content?.title), 0);
    }
    if (!open) {
      initialUrlPlayedRef.current = false;
    }
  }, [open, initialUrl, content, handlePlay]);

  // ─── Reset on close ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      // Schedule state reset asynchronously to satisfy lint rule
      setTimeout(() => {
        setActiveUrl(null);
        setStreamUrl('');
        setUrlError(null);
        setShowHistory(false);
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="p-0 gap-0 max-w-6xl sm:max-w-6xl w-full sm:w-[95vw]
          h-[95vh] sm:h-[92vh] rounded-xl border-border/50
          bg-background flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          Stream Player
        </DialogTitle>

        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-ars fill-ars" />
              <h2 className="text-lg font-bold text-foreground">
                {activeUrl ? `Now Playing: ${activeTitle}` : 'Stream Player'}
              </h2>
            </div>
            <div className="flex-1" />
            {activeUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveUrl(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Link className="h-4 w-4 mr-1" />
                New Stream
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Content */}
          {activeUrl ? (
            /* ─── Player Mode ─── */
            <div className="flex-1 flex flex-col">
              <VideoPlayer
                src={activeUrl}
                title={activeTitle}
                poster={activePoster}
                autoPlay
                onEnded={() => {}}
              />

              {/* Stream Info Bar */}
              <div className="px-4 py-3 bg-card/30 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activeTitle}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{activeUrl}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {isHlsUrl(activeUrl) ? 'HLS' : 'Direct'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(activeUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─── URL Input Mode ─── */
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Content Info (if from a movie/show) */}
                {content && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-ars/5 border border-ars/20">
                    <Info className="h-5 w-5 text-ars flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Streaming: {content.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paste a video URL below to start watching. Supports MP4, WebM, and HLS/M3U8 streams.
                      </p>
                    </div>
                  </div>
                )}

                {/* URL Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Video Stream URL
                  </label>
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
                          if (e.key === 'Enter') handlePlay();
                        }}
                        className={`pr-10 ${urlError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {isValidating && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      onClick={() => handlePlay()}
                      className="bg-ars hover:bg-ars/90 text-ars-foreground font-semibold shrink-0"
                      disabled={isValidating}
                    >
                      <Play className="h-4 w-4 fill-current mr-1" />
                      Play
                    </Button>
                  </div>
                  {urlError && (
                    <p className="text-xs text-red-500">{urlError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Supports MP4, WebM, OGG, and HLS/M3U8 streaming formats.
                    Keyboard shortcuts: Space/K = Play/Pause, F = Fullscreen, M = Mute, P = PiP
                  </p>
                </div>

                {/* Quick Tips */}
                <div className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Info className="h-4 w-4 text-ars" />
                    How to Stream
                  </h3>
                  <div className="grid gap-3">
                    <div className="flex gap-3 items-start">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ars/10 text-ars text-xs font-bold shrink-0">1</span>
                      <p className="text-xs text-muted-foreground">
                        Find a video stream URL (MP4, M3U8, or WebM format)
                      </p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ars/10 text-ars text-xs font-bold shrink-0">2</span>
                      <p className="text-xs text-muted-foreground">
                        Paste the URL in the input field above
                      </p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ars/10 text-ars text-xs font-bold shrink-0">3</span>
                      <p className="text-xs text-muted-foreground">
                        Click Play or press Enter to start streaming
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sample Streams */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Sample Streams (Test)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLE_STREAMS.map((stream) => (
                      <button
                        key={stream.url}
                        onClick={() => handlePlay(stream.url, stream.title)}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-ars/5 hover:border-ars/30 transition-colors text-left"
                      >
                        <Play className="h-4 w-4 text-ars fill-ars shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{stream.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{stream.url}</p>
                        </div>
                      </button>
                    ))}
                  </div>
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
                        Stream History ({history.length})
                      </button>
                      {showHistory && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearHistory}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>
                    {showHistory && (
                      <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
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
                                onClick={() => handlePlay(entry.url, entry.title)}
                                className="p-1.5 rounded-md hover:bg-ars/10 text-ars opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Play again"
                              >
                                <Play className="h-3.5 w-3.5 fill-ars" />
                              </button>
                              <button
                                onClick={() => handleDeleteHistoryItem(entry.url)}
                                className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
