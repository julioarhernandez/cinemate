
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star, Loader2, ListFilter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type Movie } from '@/lib/movies';
import { searchMovies } from '@/ai/flows/search-movies';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { genres as allGenres } from '@/lib/movies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';


interface UserMovieData {
  watched?: boolean;
  rating?: number;
}

type UserRatings = Record<string, UserMovieData>;

export default function MoviesPage() {
  const [user, authLoading] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRatings, setUserRatings] = useState<UserRatings>({});

  // Filter states
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [watchedFilter, setWatchedFilter] = useState<'all' | 'watched' | 'not-watched'>('all');
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [yearRange, setYearRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { toast } = useToast();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (watchedFilter !== 'all') count++;
    if (ratingRange[0] !== 0 || ratingRange[1] !== 10) count++;
    if (yearRange.start || yearRange.end) count++;
    if (selectedGenres.length > 0) count++;
    return count;
  }, [watchedFilter, ratingRange, yearRange, selectedGenres]);

  const resetFilters = () => {
    setWatchedFilter('all');
    setRatingRange([0, 10]);
    setYearRange({ start: '', end: '' });
    setSelectedGenres([]);
  }

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
  

  const handleSearch = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const result = await searchMovies({ query });
      
      const moviesWithGenre = await Promise.all(result.movies.map(async movie => {
        // The genre will be fetched on the details page.
        // For now we set it to unknown
        return { ...movie, genre: movie.genre ?? 'Unknown' };
      }));
      setMovies(moviesWithGenre);
      
    } catch (error) {
      console.error('Failed to search for movies:', error);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: 'Could not fetch movie results. Please try again.',
      });
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, handleSearch]);


  const filteredMovies = useMemo(() => {
    const moviesWithUserData = movies.map(movie => {
        const userData = userRatings[movie.id.toString()];
        return {
            ...movie,
            watched: userData?.watched === true,
            userRating: userData?.rating,
        };
    });

    return moviesWithUserData.filter(movie => {
        // Watched status filter
        if (watchedFilter === 'watched') {
          if (!movie.watched) return false;
        }
        if (watchedFilter === 'not-watched') {
          if (movie.watched) return false;
        }

        // Rating range filter (on user rating)
        const movieUserRating = movie.userRating ?? -1; // Use -1 for unrated
        if (movieUserRating !== -1 && (movieUserRating < ratingRange[0] || movieUserRating > ratingRange[1])) {
          return false;
        }

        // Year range filter
        const movieYear = parseInt(movie.year);
        const startYear = yearRange.start ? parseInt(yearRange.start) : -Infinity;
        const endYear = yearRange.end ? parseInt(yearRange.end) : Infinity;
        if (!isNaN(movieYear) && (movieYear < startYear || movieYear > endYear)) {
          return false;
        }

        // Genre filter
        if (selectedGenres.length > 0) {
            const movieGenres = movie.genre?.split(', ').map(g => g.trim()) || [];
            if (!selectedGenres.some(sg => movieGenres.includes(sg))) {
                return false;
            }
        }

        return true;
      });
  }, [movies, userRatings, watchedFilter, ratingRange, yearRange, selectedGenres]);

    const paginatedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredMovies.slice(startIndex, endIndex);
  }, [filteredMovies, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredMovies.length / pageSize);
  }, [filteredMovies, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ratingRange, yearRange, selectedGenres, pageSize, watchedFilter]);


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
        
        <div className="flex items-center gap-2">
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="flex-1">
                <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{activeFilterCount}</span>}
                        </Button>
                    </CollapsibleTrigger>
                    {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>}
                </div>
              <CollapsibleContent className="mt-4 animate-in fade-in-0 zoom-in-95">
                <div className="rounded-lg border p-4 space-y-6">
                    {/* Watched Filter */}
                    <div className="space-y-2">
                        <Label>Watched Status</Label>
                        <div className="flex gap-2">
                            <Button variant={watchedFilter === 'all' ? 'secondary' : 'outline'} onClick={() => setWatchedFilter('all')}>All</Button>
                            <Button variant={watchedFilter === 'watched' ? 'secondary' : 'outline'} onClick={() => setWatchedFilter('watched')}>Watched</Button>
                            <Button variant={watchedFilter === 'not-watched' ? 'secondary' : 'outline'} onClick={() => setWatchedFilter('not-watched')}>Not Watched</Button>
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div className="space-y-2">
                        <Label>Your Rating: {ratingRange[0]} - {ratingRange[1]} stars</Label>
                        <Slider value={ratingRange} onValueChange={(value) => setRatingRange(value as [number, number])} max={10} step={1} />
                    </div>

                    {/* Year Filter */}
                    <div className="space-y-2">
                        <Label>Release Year</Label>
                        <div className="flex items-center gap-4">
                            <Input placeholder="From (e.g., 1990)" value={yearRange.start} onChange={e => setYearRange(p => ({...p, start: e.target.value}))} />
                            <span>-</span>
                            <Input placeholder="To (e.g., 2024)" value={yearRange.end} onChange={e => setYearRange(p => ({...p, end: e.target.value}))} />
                        </div>
                    </div>

                    {/* Genre Filter */}
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
                                    <div key={genre} className="flex items-center space-x-2">
                                        <Checkbox id={`genre-${genre}`} checked={selectedGenres.includes(genre)} onCheckedChange={(checked) => {
                                            return checked
                                                ? setSelectedGenres([...selectedGenres, genre])
                                                : setSelectedGenres(selectedGenres.filter(g => g !== genre));
                                        }} />
                                        <Label htmlFor={`genre-${genre}`} className="font-normal">{genre}</Label>
                                    </div>
                                ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <Button onClick={() => setIsFiltersOpen(false)} className="w-full">
                        Apply Filters
                     </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Movies per page" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {!loading && filteredMovies.length === 0 && (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">No movies found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
      )}


      {!loading && filteredMovies.length > 0 && (
        <>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {paginatedMovies.map((movie) => (
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
                    <Badge variant="secondary" className="absolute bottom-2 left-2">{movie.genre}</Badge>
                    {movie.watched && <Badge className="absolute top-2 right-2 bg-primary/80">Watched</Badge>}
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
        <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
                {totalPages > 0 ? `Page ${currentPage} of ${totalPages} ` : ''}
                ({filteredMovies.length} movie{filteredMovies.length === 1 ? '' : 's'})
            </p>
            <div className="flex items-center gap-2">
                <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                >
                Previous
                </Button>
                <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                >
                Next
                </Button>
            </div>
        </div>
        </>
      )}
    </div>
  );
}

    