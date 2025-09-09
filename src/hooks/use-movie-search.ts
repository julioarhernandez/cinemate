
"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchMovies, type SearchMoviesInput, type SearchMoviesOutput } from '@/ai/flows/search-movies';
import { useToast } from '@/hooks/use-toast';
import { type Movie } from '@/lib/movies';
import { useDebounce } from './use-debounce';


const SESSION_STORAGE_KEY = 'movieSearchState';

interface MovieSearchState {
    searchTerm: string;
    year: string;
    selectedGenres: string[];
    sortBy: string;
    movies: Movie[];
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
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const searchStateRef = useRef<MovieSearchState>();

  const runSearch = useCallback(async (options: {
    query?: string;
    year?: string;
    genres?: string[];
    sortBy?: string;
    page: number;
    pageSize?: number;
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
        pageSize: options.pageSize,
      });

      if (options.append) {
        setMovies(prev => {
            const combined = [...prev, ...result.movies];
            const uniqueMovies = Array.from(new Map(combined.map(m => [m.id, m])).values());
            return uniqueMovies;
        });
      } else {
        setMovies(result.movies);
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
    
    // Check if we're landing from an external link with search params
    const isNewSearch = querySearch !== null || queryYear !== null;

    if (savedStateString && !isNewSearch) {
        try {
            const savedState: MovieSearchState = JSON.parse(savedStateString);
            setSearchTerm(savedState.searchTerm || '');
            setYear(savedState.year || '');
            setSelectedGenres(savedState.selectedGenres || []);
            setSortBy(savedState.sortBy || 'popularity.desc');
            setMovies(savedState.movies || []);
            setPage(savedState.page || 1);
            setHasMore(savedState.hasMore === undefined ? true : savedState.hasMore);
            setLoading(false); // We have state, so we're not loading initially
            if(savedState.scrollPosition) {
                setTimeout(() => window.scrollTo(0, savedState.scrollPosition), 0);
            }
        } catch (e) {
            console.error("Failed to parse saved movie search state", e);
            setLoading(false);
        }
    } else {
        // This is a new navigation or search, use URL params
        const newSearchTerm = querySearch || '';
        const newYear = queryYear || '';
        setSearchTerm(newSearchTerm);
        setYear(newYear);
        setSelectedGenres([]);
        setSortBy('popularity.desc');
        setPage(1);
        
        startTransition(() => {
            runSearch({
                query: newSearchTerm,
                year: newYear,
                genres: [],
                sortBy: 'popularity.desc',
                page: 1,
                pageSize: 10,
                append: false,
            });
        });
    }
    setIsInitialized(true);
  }, []); // Runs only once on mount

  
  // Effect to save state to sessionStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    const stateToSave: MovieSearchState = {
        searchTerm,
        year,
        selectedGenres,
        sortBy,
        movies,
        page,
        hasMore,
        scrollPosition: window.scrollY
    };
    searchStateRef.current = stateToSave;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [searchTerm, year, selectedGenres, sortBy, movies, page, hasMore, isInitialized]);
  

  // Effect to run search when filters change, but not on initial load
  useEffect(() => {
    if (!isInitialized) return;
    const newPage = 1;
    setPage(newPage);
    startTransition(() => {
        runSearch({
            query: debouncedSearchTerm,
            year: year,
            genres: selectedGenres,
            sortBy: sortBy,
            page: newPage,
            pageSize: 10,
            append: false,
        });
    });
  }, [debouncedSearchTerm, year, selectedGenres, sortBy, isInitialized]);


  const loadMoreMovies = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    startTransition(() => {
      runSearch({
        query: debouncedSearchTerm,
        year,
        genres: selectedGenres,
        sortBy,
        page: nextPage,
        pageSize: 10,
        append: true,
      });
    });
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const stateToSave: MovieSearchState = {
        searchTerm,
        year,
        selectedGenres,
        sortBy,
        movies,
        page,
        hasMore,
        scrollPosition: window.scrollY,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
    router.push(href);
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
  };
}
