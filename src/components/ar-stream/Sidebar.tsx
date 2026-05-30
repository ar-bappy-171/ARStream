'use client';

import { useState } from 'react';
import {
  Home,
  Clock,
  ListChecks,
  Heart,
  LayoutGrid,
  TrendingUp,
  Star,
  Sparkles,
  Calendar,
  Swords,
  Rocket,
  Skull,
  Smile,
  Film,
  Globe,
  Radio,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  X,
  Tv,
  BarChart3,
  CalendarDays,
  Settings,
  MonitorPlay,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  section: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface ExpandableNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  section: string;
  subItems?: { id: string; label: string; section: string }[];
}

const navigationGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Navigation',
    items: [
      { id: 'home', label: 'Home', icon: Home, section: 'home' },
      { id: 'all-content', label: 'All Content', icon: LayoutGrid, section: 'all-content' },
      { id: 'recommendations', label: 'For You', icon: Sparkles, section: 'recommendations' },
      { id: 'continue-watching', label: 'Continue Watching', icon: Clock, section: 'continue-watching' },
      { id: 'my-lists', label: 'My Lists', icon: ListChecks, section: 'my-lists' },
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, section: 'dashboard' },
      { id: 'activity', label: 'Activity', icon: CalendarDays, section: 'activity' },
      { id: 'settings', label: 'Settings', icon: Settings, section: 'settings' },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'popular-movies', label: 'Popular Now', icon: TrendingUp, section: 'popular-movies' },
      { id: 'top-rated', label: 'Top Rated', icon: Star, section: 'top-rated' },
      { id: 'now-playing', label: 'New Releases', icon: Sparkles, section: 'now-playing' },
      { id: 'upcoming', label: 'Upcoming', icon: Calendar, section: 'upcoming' },
    ],
  },
];

const streamNavItem: NavItem = {
  id: 'stream',
  label: 'Stream Player',
  icon: MonitorPlay,
  section: 'stream',
};

const genreItems: ExpandableNavItem[] = [
  { id: 'action', label: 'Action & Adventure', icon: Swords, section: 'action' },
  { id: 'sci-fi', label: 'Sci-Fi & Fantasy', icon: Rocket, section: 'sci-fi' },
  { id: 'horror', label: 'Horror & Thriller', icon: Skull, section: 'horror' },
  { id: 'comedy', label: 'Comedy', icon: Smile, section: 'comedy' },
  { id: 'romance', label: 'Romance', icon: Heart, section: 'romance' },
  { id: 'documentary', label: 'Documentary', icon: Film, section: 'documentary' },
];

const regionalItems: NavItem[] = [
  { id: 'bollywood', label: 'Bollywood', icon: Globe, section: 'bollywood' },
  { id: 'k-drama', label: 'K-Drama & Asian', icon: Globe, section: 'k-drama' },
];

const animeItem: ExpandableNavItem = {
  id: 'anime',
  label: 'Anime',
  icon: Tv,
  section: 'anime',
  subItems: [
    { id: 'anime-airing', label: 'Top Airing', section: 'anime-airing' },
    { id: 'anime-alltime', label: 'All-Time Top', section: 'anime-alltime' },
    { id: 'anime-popular', label: 'Most Popular', section: 'anime-popular' },
    { id: 'anime-upcoming', label: 'Upcoming Season', section: 'anime-upcoming' },
  ],
};

const liveTvItem: NavItem = {
  id: 'live-tv',
  label: 'Live TV',
  icon: Radio,
  section: 'live-tv',
};

export default function Sidebar() {
  const {
    activeSection,
    setActiveSection,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    openStream,
  } = useAppStore();

  const [genresOpen, setGenresOpen] = useState(false);
  const [animeOpen, setAnimeOpen] = useState(false);

  const handleItemClick = (section: string) => {
    if (section === 'stream') {
      openStream();
      setMobileSidebarOpen(false);
      return;
    }
    setActiveSection(section);
    setMobileSidebarOpen(false);
  };

  const isItemActive = (section: string) => activeSection === section;

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item.section);
    const collapsed = sidebarCollapsed;

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.section)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active && 'sidebar-item-active text-ars-foreground',
          collapsed && 'justify-center px-0'
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  const renderGenreItem = (item: ExpandableNavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item.section);
    const collapsed = sidebarCollapsed;

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.section)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active && 'sidebar-item-active text-ars-foreground',
          collapsed && 'justify-center px-0'
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && (
          <ChevronRight className="ml-auto size-3 shrink-0 text-muted-foreground" />
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Mobile close button */}
      <div className="flex items-center justify-between px-3 py-2 md:hidden">
        <span className="text-sm font-semibold text-foreground">Menu</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(false)}
          className="size-8"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="min-h-0 flex-1 px-2 py-2">
        <div className="flex flex-col gap-1">
          {/* Navigation & Content groups */}
          {navigationGroups.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="mb-1 px-3 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
              )}
              {sidebarCollapsed && <div className="my-2" />}
              {group.items.map(renderNavItem)}
            </div>
          ))}

          <Separator className="my-2" />

          {/* Stream Player */}
          {(() => {
            const Icon = streamNavItem.icon;
            const collapsed = sidebarCollapsed;
            return (
              <button
                onClick={() => handleItemClick('stream')}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                  'hover:bg-ars/10 hover:text-ars',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'text-ars',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? streamNavItem.label : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate font-semibold">{streamNavItem.label}</span>}
              </button>
            );
          })()}

          <Separator className="my-2" />
          {!sidebarCollapsed ? (
            <Collapsible open={genresOpen} onOpenChange={setGenresOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    genreItems.some((g) => isItemActive(g.section)) && 'text-ars-foreground'
                  )}
                >
                  <Film className="size-4 shrink-0" />
                  <span className="truncate">Genres</span>
                  <ChevronRight
                    className={cn(
                      'ml-auto size-3 shrink-0 text-muted-foreground transition-transform duration-200',
                      genresOpen && 'rotate-90'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4">
                {genreItems.map(renderGenreItem)}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="my-2">
              <button
                onClick={() => {
                  setSidebarCollapsed(false);
                  setGenresOpen(true);
                }}
                className={cn(
                  'flex w-full items-center justify-center rounded-md py-2 transition-colors duration-150',
                  'hover:bg-accent hover:text-accent-foreground',
                  genreItems.some((g) => isItemActive(g.section)) && 'text-ars-foreground'
                )}
                title="Genres"
              >
                <Film className="size-4 shrink-0" />
              </button>
            </div>
          )}

          <Separator className="my-2" />

          {/* Regional section */}
          {!sidebarCollapsed && (
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Regional
            </p>
          )}
          {regionalItems.map(renderNavItem)}

          <Separator className="my-2" />

          {/* Anime section */}
          {!sidebarCollapsed ? (
            <Collapsible open={animeOpen} onOpenChange={setAnimeOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    (isItemActive('anime') || animeItem.subItems?.some((s) => isItemActive(s.section))) &&
                      'text-ars-foreground'
                  )}
                >
                  <Tv className="size-4 shrink-0" />
                  <span className="truncate">Anime</span>
                  <ChevronRight
                    className={cn(
                      'ml-auto size-3 shrink-0 text-muted-foreground transition-transform duration-200',
                      animeOpen && 'rotate-90'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4">
                {animeItem.subItems?.map((sub) => {
                  const active = isItemActive(sub.section);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleItemClick(sub.section)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active && 'sidebar-item-active text-ars-foreground'
                      )}
                    >
                      <span className="ml-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="my-2">
              <button
                onClick={() => {
                  setSidebarCollapsed(false);
                  setAnimeOpen(true);
                }}
                className={cn(
                  'flex w-full items-center justify-center rounded-md py-2 transition-colors duration-150',
                  'hover:bg-accent hover:text-accent-foreground',
                  (isItemActive('anime') || animeItem.subItems?.some((s) => isItemActive(s.section))) &&
                    'text-ars-foreground'
                )}
                title="Anime"
              >
                <Tv className="size-4 shrink-0" />
              </button>
            </div>
          )}

          <Separator className="my-2" />

          {/* Live TV */}
          {renderNavItem(liveTvItem)}
        </div>
      </ScrollArea>

      {/* Collapse toggle - desktop only */}
      <div className="hidden border-t border-border px-2 py-2 md:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            'flex w-full items-center gap-2',
            sidebarCollapsed ? 'justify-center' : 'justify-start'
          )}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-[260px] bg-card shadow-xl sidebar-transition md:hidden',
          mobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        )}
        style={{ top: '0px' }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 z-30 hidden h-[calc(100vh-64px)] bg-card border-r border-border sidebar-transition md:block',
          sidebarCollapsed ? 'w-16' : 'w-[240px]'
        )}
        style={{ top: '64px' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
