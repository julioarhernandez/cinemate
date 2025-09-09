
"use client";

import React, { useState, useEffect, useCallback, Suspense, useTransition, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star, Loader2, ListFilter, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type Movie } from '@/lib/movies';
import { searchMovies } from '@/ai/flows/search-movies';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs } from 'firebase/firestore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { genres as allGenres } from '@/lib/movies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface UserMovieData {
  watched?: boolean;
  rating?: number;
  isPrivate?: boolean;
}

type UserRatings = Record<string, UserMovieData>;

function MoviesPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialYear = searchParams.get('year') || '';


  const [user, authLoading] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRatings, setUserRatings] = useState<UserRatings>({});

  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [year, setYear] = useState(initialYear);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popularity.desc');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUserRatings() {
      if (user) {
        const ratingsCollection = collection(db, 'users', user.uid, 'ratings');
        const snapshot = await getDocs(ratingsCollection);
        const ratings: UserRatings = {};
        snapshot.forEach((doc) => {
          ratings[doc.id] = doc.data() as UserMovieData;
        });
        setUserRatings(ratings);
      }
    }
    if (!authLoading) {
      fetchUserRatings();
    }
  }, [user, authLoading]);
  

  const runSearch = useCallback(async (searchOptions: {
      query?: string;
      year?: string;
      genres?: string[];
      sortBy?: string;
      page: number;
      append?: boolean;
    }) => {
    
    if (searchOptions.append) {
        setLoadingMore(true);
    } else {
        setLoading(true);
    }

    try {
      const result = await searchMovies({
        query: searchOptions.query,
        year: searchOptions.year,
        genres: searchOptions.genres,
        page: searchOptions.page,
        sortBy: searchOptions.sortBy,
      });
      
      const moviesWithUserData = result.movies.map(movie => {
        const userData = userRatings[movie.id.toString()];
        return {
          ...movie,
          watched: userData?.watched === true,
          userRating: userData?.rating,
          isPrivate: userData?.isPrivate,
        };
      });

      if (searchOptions.append) {
        setMovies(prev => [...prev, ...moviesWithUserData]);
      } else {
        setMovies(moviesWithUserData);
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
       if (searchOptions.append) {
        setLoadingMore(false);
    } else {
        setLoading(false);
    }
    }
  }, [toast, userRatings]);

  // Effect to run search when filters change
  useEffect(() => {
    setPage(1);
    startTransition(() => {
      runSearch({
        query: debouncedSearchTerm,
        year: year,
        genres: selectedGenres,
        sortBy: sortBy,
        page: 1,
        append: false,
      });
    });
  }, [debouncedSearchTerm, year, selectedGenres, sortBy, runSearch]);

  const loadMoreMovies = () => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    startTransition(() => {
      runSearch({
        query: debouncedSearchTerm,
        year,
        genres: selectedGenres,
        sortBy,
        page: nextPage,
        append: true,
      });
    });
  };

  const moviesWithUserData = useMemo(() => {
    return movies.map(movie => {
      const userData = userRatings[movie.id.toString()];
      return {
        ...movie,
        watched: userData?.watched === true,
        userRating: userData?.rating,
        isPrivate: userData?.isPrivate,
      };
    });
  }, [movies, userRatings]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Browse Movies
        </h1>
        <p className="text-muted-foreground">
          Search for movies to rate and add to your collection.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search movies..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="w-full sm:w-auto">
                <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 sm:absolute sm:z-10 animate-in fade-in-0 zoom-in-95">
                <div className="rounded-lg border p-4 bg-background space-y-4 w-[280px]">
                    <div className="space-y-2">
                        <Label>Release Year</Label>
                        <Input placeholder="e.g., 2024" value={year} onChange={e => setYear(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Genre</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                 <Button variant="outline" className="w-full justify-start font-normal">
                                    {selectedGenres.length > 0 ? `${selectedGenres.length} selected` : "Select genres"}
                                 </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                               <div className="p-4 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                {allGenres.map(genre => (
                                    <div key={genre.id} className="flex items-center space-x-2">
                                        <Checkbox id={`genre-${genre.id}`} checked={selectedGenres.includes(genre.id.toString())} onCheckedChange={(checked) => {
                                            const genreId = genre.id.toString();
                                            return checked
                                                ? setSelectedGenres([...selectedGenres, genreId])
                                                : setSelectedGenres(selectedGenres.filter(g => g !== genreId));
                                        }} />
                                        <Label htmlFor={`genre-${genre.id}`} className="font-normal">{genre.name}</Label>
                                    </div>
                                ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
             <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="popularity.desc">Popularity</SelectItem>
                    <SelectItem value="primary_release_date.desc">Newest First</SelectItem>
                    <SelectItem value="primary_release_date.asc">Oldest First</SelectItem>
                    <SelectItem value="vote_average.desc">Rating</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {!loading && movies.length === 0 && (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">No movies found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
      )}


      {moviesWithUserData.length > 0 && (
        <>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {moviesWithUserData.map((movie) => (
            <Link href={`/dashboard/movies/${movie.id}`} key={movie.id}>
                <Card className="group overflow-hidden h-full">
                <CardHeader className="p-0">
                    <div className="relative h-60">
                    <Image
                        src={movie.imageUrl}
                        alt={movie.title}
                        data-ai-hint={movie.imageHint}
                        width={400}
                        height={600}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {movie.watched && (
                        movie.isPrivate ? (
                            <Badge variant="destructive" className="absolute top-2 right-2 flex items-center gap-1">
                                <EyeOff className="h-3 w-3"/> Private
                            </Badge>
                        ) : (
                            <Badge className="absolute top-2 right-2 bg-primary/80">Watched</Badge>
                        )
                    )}
                    </div>
                </CardHeader>
                <CardContent className="p-3">
                    <CardTitle className="truncate text-base font-bold">{movie.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{movie.year}</p>
                </CardContent>
                <CardFooter className="p-3 pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 text-amber-400" /> 
                        <span>{movie.rating.toFixed(1)}</span>
                        {movie.userRating && (
                            <span className="flex items-center gap-1 text-primary font-bold">( <Star className="h-4 w-4"/> {movie.userRating} )</span>
                        )}
                    </div>
                </CardFooter>
                </Card>
            </Link>
            ))}
        </div>
        <div className="flex items-center justify-center pt-4">
          {hasMore && (
            <Button onClick={loadMoreMovies} disabled={loadingMore}>
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          )}
        </div>
        </>
      )}
    </div>
  );
}

export default function MoviesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MoviesPageContent />
        </Suspense>
    )
}
