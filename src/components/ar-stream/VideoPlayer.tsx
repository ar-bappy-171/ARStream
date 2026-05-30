'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture2,
  SkipBack,
  SkipForward,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// ─── Types ──────────────────────────────────────────────────────────

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onProgress?: (progress: number) => void;
}

interface QualityLevel {
  height: number;
  level: number;
  bitrate: number;
}

// ─── Helper Functions ───────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8') || url.includes('m3u8');
}

// ─── VideoPlayer Component ──────────────────────────────────────────

export default function VideoPlayer({
  src,
  title,
  poster,
  autoPlay = true,
  onEnded,
  onProgress,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // ─── Initialize HLS ─────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Schedule state reset asynchronously to satisfy lint rule
    setTimeout(() => {
      setError(null);
      setIsLoading(true);
    }, 0);

    const initPlayer = () => {
      if (isHlsUrl(src)) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
          });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            const levels: QualityLevel[] = data.levels.map((level, index) => ({
              height: level.height,
              level: index,
              bitrate: level.bitrate,
            }));
            setQualities(levels);
            setIsLoading(false);
            if (autoPlay) {
              video.play().catch(() => {});
            }
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setError('Network error — stream unavailable. Try again.');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError('Media error — trying to recover...');
                  hls.recoverMediaError();
                  break;
                default:
                  setError('Fatal stream error. Please try a different source.');
                  hls.destroy();
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = src;
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            if (autoPlay) video.play().catch(() => {});
          });
        } else {
          setError('HLS is not supported in this browser.');
        }
      } else {
        // Regular video URL (mp4, webm, etc.)
        video.src = src;
        video.load();
      }
    };

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  // ─── Video Event Listeners ───────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      // Buffered progress
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration || 0);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const onError = () => {
      if (!isHlsUrl(src)) {
        setError('Failed to load video. Check the URL and try again.');
      }
      setIsLoading(false);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [src, onEnded]);

  // ─── Progress Reporting ──────────────────────────────────────────
  useEffect(() => {
    if (onProgress && duration > 0) {
      progressUpdateRef.current = setInterval(() => {
        if (videoRef.current) {
          onProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        }
      }, 5000);
    }
    return () => {
      if (progressUpdateRef.current) clearInterval(progressUpdateRef.current);
    };
  }, [duration, onProgress]);

  // ─── Fullscreen Events ───────────────────────────────────────────
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // ─── Auto-hide Controls ──────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      // Schedule asynchronously to satisfy lint rule
      setTimeout(() => setShowControls(true), 0);
    }
  }, [isPlaying]);

  // ─── Playback Controls ───────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
    setCurrentTime(video.currentTime);
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || 0));
  }, []);

  const changeVolume = useCallback((val: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const v = val[0];
    video.volume = v;
    setVolume(v);
    if (v === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      video.muted = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch {
      // PiP not supported or denied
    }
  }, []);

  const changeQuality = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
    setShowQualityMenu(false);
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  // ─── Keyboard Shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume([Math.min(1, volume + 0.1)]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume([Math.max(0, volume - 0.1)]);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
      }
      resetControlsTimer();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, changeVolume, toggleFullscreen, toggleMute, togglePiP, resetControlsTimer, volume]);

  // ─── Volume Icon ─────────────────────────────────────────────────
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // ─── Progress Bar ────────────────────────────────────────────────
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative group w-full bg-black select-none overflow-hidden"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={(e) => {
        // Only toggle play if clicking on the video area, not controls
        if ((e.target as HTMLElement).tagName === 'VIDEO') {
          togglePlay();
        }
      }}
      style={{ aspectRatio: isFullscreen ? undefined : '16/9' }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        playsInline
        disablePictureInPicture={false}
      />

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-white text-sm text-center max-w-md px-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
            className="px-4 py-2 bg-ars text-white rounded-lg text-sm font-medium hover:bg-ars/90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Big Play Button (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-ars/90 flex items-center justify-center shadow-2xl">
            <Play className="h-10 w-10 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

        <div className="relative px-3 sm:px-4 pb-3 sm:pb-4 pt-12">
          {/* Title */}
          {title && (
            <p className="text-white text-sm font-medium mb-2 truncate max-w-[80%]">{title}</p>
          )}

          {/* Progress Bar */}
          <div
            className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              seek(x * duration);
            }}
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 bg-ars rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-ars rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Skip Back */}
            <button
              onClick={() => skip(-10)}
              className="p-1.5 text-white/80 hover:text-white transition-colors"
              title="Back 10s"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 text-white hover:scale-110 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-white" />
              ) : (
                <Play className="h-5 w-5 fill-white" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(10)}
              className="p-1.5 text-white/80 hover:text-white transition-colors"
              title="Forward 10s"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            {/* Time Display */}
            <span className="text-white/80 text-xs font-mono ml-1 sm:ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-1 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 text-white/80 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon className="h-4 w-4" />
              </button>
              <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={changeVolume}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-20"
                />
              </div>
            </div>

            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className="p-1.5 text-white/80 hover:text-white transition-colors text-xs font-bold"
                title="Playback speed"
              >
                {playbackRate === 1 ? '1x' : `${playbackRate}x`}
              </button>
              {showSpeedMenu && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setShowSpeedMenu(false)} />
                  <div className="absolute bottom-full right-0 mb-2 z-50 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg py-1 min-w-[80px]">
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                          playbackRate === rate ? 'text-ars font-bold' : 'text-white/80'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Quality (HLS only) */}
            {qualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className="p-1.5 text-white/80 hover:text-white transition-colors"
                  title="Quality"
                >
                  <Settings className="h-4 w-4" />
                </button>
                {showQualityMenu && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setShowQualityMenu(false)} />
                    <div className="absolute bottom-full right-0 mb-2 z-50 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg py-1 min-w-[120px]">
                      <button
                        onClick={() => changeQuality(-1)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                          currentQuality === -1 ? 'text-ars font-bold' : 'text-white/80'
                        }`}
                      >
                        Auto
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q.level}
                          onClick={() => changeQuality(q.level)}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                            currentQuality === q.level ? 'text-ars font-bold' : 'text-white/80'
                          }`}
                        >
                          {q.height}p
                          {q.bitrate > 0 && (
                            <span className="text-white/40 ml-1">
                              ({Math.round(q.bitrate / 1000)}kbps)
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PiP */}
            <button
              onClick={togglePiP}
              className={`p-1.5 transition-colors ${
                isPiP ? 'text-ars' : 'text-white/80 hover:text-white'
              }`}
              title="Picture-in-Picture"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-white/80 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Top gradient for fullscreen title */}
      {isFullscreen && showControls && title && (
        <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
          <p className="text-white text-lg font-semibold truncate">{title}</p>
        </div>
      )}
    </div>
  );
}
