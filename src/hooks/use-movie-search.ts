
"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchMovies, type SearchMoviesInput } from '@/ai/flows/search-movies';
import { useToast } from '@/hooks/use-toast';
import { type MediaItem } from '@/lib/movies';
import { useDebounce } from './use-debounce';


const SESSION_STORAGE_KEY = 'mediaSearchState';

interface MediaSearchState {
    searchTerm: string;
    year: string;
    selectedGenres: string[];
    sortBy: string;
    mediaType: 'movie' | 'tv';
    movies: MediaItem[];
    page: number;
    hasMore: boolean;
    scrollPosition: number;
}

export function useMovieSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isInitialized, setIsInitialized] = useState(false);

  // State initialization
  const [searchTerm, setSearchTerm] = useState('');
  const [year, setYear] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const debouncedYear = useDebounce(year, 500);

  const runSearch = useCallback(async (options: {
    query?: string;
    year?: string;
    genres?: string[];
    sortBy?: string;
    mediaType: 'movie' | 'tv';
    page: number;
    append?: boolean;
  }) => {
    if (options.append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await searchMovies({
        query: options.query,
        year: options.year,
        genres: options.genres,
        page: options.page,
        sortBy: options.sortBy,
        mediaType: options.mediaType,
      });

      if (options.append) {
        setMovies(prev => {
            const newMovies = result.movies || [];
            const combined = [...prev, ...newMovies];
            // Use a Map to efficiently handle deduplication based on movie ID
            const uniqueMovies = Array.from(new Map(combined.map(m => [`${m.id}-${m.mediaType}`, m])).values());
            return uniqueMovies;
        });
      } else {
        setMovies(result.movies || []);
      }
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to search for movies:', error);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: 'Could not fetch movie results. Please try again.',
      });
      setMovies([]);
      setHasMore(false);
    } finally {
      if (options.append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [toast]);


  // Effect for initializing state from sessionStorage or URL params
  useEffect(() => {
    const savedStateString = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const querySearch = searchParams.get('search');
    const queryYear = searchParams.get('year');
    
    // A new search is defined by search params being present in the URL
    const isNewSearch = querySearch !== null || queryYear !== null;

    if (savedStateString && !isNewSearch) {
        try {
            const savedState: MediaSearchState = JSON.parse(savedStateString);
            setSearchTerm(savedState.searchTerm || '');
            setYear(savedState.year || '');
            setSelectedGenres(savedState.selectedGenres || []);
            setSortBy(savedState.sortBy || 'popularity.desc');
            setMediaType(savedState.mediaType || 'movie');
            setMovies(savedState.movies || []);
            setPage(savedState.page || 1);
            setHasMore(savedState.hasMore === undefined ? true : savedState.hasMore);
            // Restore scroll position after a short delay to allow content to render
            if(savedState.scrollPosition) {
                setTimeout(() => window.scrollTo(0, savedState.scrollPosition), 0);
            }
        } catch (e) {
            console.error("Failed to parse saved movie search state", e);
        } finally {
            setLoading(false);
        }
    } else {
        // This is a new search, so we reset state and fetch based on URL params
        const newSearchTerm = querySearch || '';
        const newYear = queryYear || '';
        const newMediaType = searchParams.get('type') as 'movie' | 'tv' || 'movie';

        setSearchTerm(newSearchTerm);
        setYear(newYear);
        setSelectedGenres([]);
        setSortBy('popularity.desc');
        setMediaType(newMediaType);
        setPage(1);
        
        startTransition(() => {
            runSearch({
                query: newSearchTerm,
                year: newYear,
                genres: [],
                sortBy: 'popularity.desc',
                mediaType: newMediaType,
                page: 1,
                append: false,
            });
        });
    }
    setIsInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This effect should only run once on component mount

  
  // Effect to save state to sessionStorage whenever it changes, but only after initialization
  useEffect(() => {
    if (!isInitialized) return;
    const stateToSave: MediaSearchState = {
        searchTerm,
        year,
        selectedGenres,
        sortBy,
        mediaType,
        movies,
        page,
        hasMore,
        scrollPosition: window.scrollY
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [searchTerm, year, selectedGenres, sortBy, movies, page, hasMore, isInitialized, mediaType]);
  

  const handleSearch = () => {
    // Create a new URLSearchParams object
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (year) params.set('year', year);
    if (mediaType) params.set('type', mediaType);
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    // Use replaceState to avoid adding to browser history for filter changes
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);

    setPage(1);
    startTransition(() => {
        runSearch({
            query: searchTerm,
            year: year,
            genres: selectedGenres,
            sortBy: sortBy,
            mediaType: mediaType,
            page: 1,
            append: false,
        });
    });
  };

  const loadMoreMovies = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    startTransition(() => {
      runSearch({
        query: searchTerm,
        year,
        genres: selectedGenres,
        sortBy,
        mediaType,
        page: nextPage,
        append: true,
      });
    });
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Save state before navigating
    const stateToSave: MediaSearchState = {
        searchTerm,
        year,
        selectedGenres,
        sortBy,
        mediaType,
        movies,
        page,
        hasMore,
        scrollPosition: window.scrollY,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
    // Default navigation will be prevented if we use router.push, but since we are
    // not preventing default, we just let the Link component handle it.
  };
  
  const handleMediaTypeChange = (newMediaType: 'movie' | 'tv') => {
    if (newMediaType !== mediaType) {
        setMediaType(newMediaType);
        setSearchTerm('');
        setYear('');
        setSelectedGenres([]);
        setSortBy('popularity.desc');
        setMovies([]);
        setHasMore(true);
        setPage(1);
        
        // Trigger a new search for the new media type
        startTransition(() => {
            runSearch({
                mediaType: newMediaType,
                page: 1,
                sortBy: 'popularity.desc'
            });
        });
    }
  };


  return {
    searchTerm,
    setSearchTerm,
    year,
    setYear,
    selectedGenres,
    setSelectedGenres,
    sortBy,
    setSortBy,
    mediaType,
    setMediaType,
    movies,
    page,
    setPage,
    hasMore,
    loading,
    loadingMore,
    isPending,
    loadMoreMovies,
    handleLinkClick,
    isInitialized,
    handleMediaTypeChange,
    handleSearch,
  };
}
