'use client';

import { useState, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Search, Menu, Sun, Moon, ListChecks, Lock, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import ThemeSelector from '@/components/ar-stream/ThemeSelector';
import SearchAutocomplete from '@/components/ar-stream/SearchAutocomplete';

export default function Header() {
  const {
    searchQuery,
    setSearchQuery,
    setActiveSection,
    setMobileSidebarOpen,
    activeSection,
    kidsModeEnabled,
    openStream,
  } = useAppStore();

  const { theme, setTheme } = useTheme();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setActiveSection('search');
    } else if (activeSection === 'search') {
      setActiveSection('home');
    }
  }, [searchQuery, activeSection, setActiveSection]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
      // Forward arrow keys and Escape to autocomplete
      if (['ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) {
        const event = new CustomEvent('autocomplete-keydown', { detail: e });
        window.dispatchEvent(event);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
        }
      }
    },
    [handleSearch]
  );

  const handleSearchIconClick = useCallback(() => {
    // On mobile, first open the search bar
    if (!mobileSearchOpen) {
      setMobileSearchOpen(true);
      setSearchFocused(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
      return;
    }
    handleSearch();
  }, [mobileSearchOpen, handleSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchFocused(false);
    if (activeSection === 'search') {
      setActiveSection('home');
    }
    setMobileSearchOpen(false);
  }, [activeSection, setActiveSection, setSearchQuery]);

  const handleAutocompleteClose = useCallback(() => {
    setSearchFocused(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(true);
  }, [setMobileSidebarOpen]);

  const handleMyListsClick = useCallback(() => {
    setActiveSection('my-lists');
  }, [setActiveSection]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 md:px-6">
        {/* Left Section: Mobile Menu + Logo */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={toggleMobileSidebar}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Logo */}
          <button
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-1.5 shrink-0 group"
            aria-label="AR-Stream Home"
          >
            <div className="relative flex items-center justify-center size-8 rounded-lg overflow-hidden shadow-lg shadow-ars/20 group-hover:shadow-ars/40 transition-shadow duration-300 bg-black">
              <svg viewBox="0 0 512 512" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <circle cx="256" cy="256" r="256" fill="#000000"/>
                <polygon points="192,140 192,372 392,256" fill="#ffffff"/>
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-ars via-orange-400 to-amber-400 bg-clip-text text-transparent">
              AR-Stream
            </span>
            {/* Kids Mode Badge */}
            {kidsModeEnabled && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <Lock className="h-2.5 w-2.5" />
                Kids
              </span>
            )}
          </button>
        </div>

        {/* Center Section: Search Bar (Desktop) */}
        <div className="hidden sm:flex flex-1 max-w-xl mx-4 lg:mx-8">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-ars transition-colors" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search movies, TV shows, anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setSearchFocused(true)}
              className="pl-9 pr-9 h-9 w-full rounded-full bg-muted/50 border-transparent focus-visible:border-ars/50 focus-visible:ring-ars/20 transition-all duration-300 placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
            {/* Desktop Autocomplete */}
            <SearchAutocomplete
              searchQuery={searchQuery}
              isFocused={searchFocused}
              onClose={handleAutocompleteClose}
            />
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden shrink-0"
            onClick={handleSearchIconClick}
            aria-label="Search"
          >
            <Search className="size-5" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="shrink-0"
            aria-label="Toggle theme"
          >
            <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Color Theme Selector */}
          <ThemeSelector />

          {/* My Lists Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMyListsClick}
            className="shrink-0"
            aria-label="My Lists"
          >
            <ListChecks className="size-5" />
          </Button>

          {/* Stream Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openStream()}
            className="shrink-0 text-ars hover:text-ars hover:bg-ars/10"
            aria-label="Stream Player"
          >
            <MonitorPlay className="size-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar (Expandable) */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-3 pb-3 fade-in">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-ars transition-colors" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search movies, TV shows, anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setSearchFocused(true)}
              autoFocus
              className="pl-9 pr-9 h-9 w-full rounded-full bg-muted/50 border-transparent focus-visible:border-ars/50 focus-visible:ring-ars/20 transition-all duration-300 placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
            {/* Mobile Autocomplete */}
            <SearchAutocomplete
              searchQuery={searchQuery}
              isFocused={searchFocused}
              onClose={handleAutocompleteClose}
            />
          </div>
        </div>
      )}
    </header>
  );
}
