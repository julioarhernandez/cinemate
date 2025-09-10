
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
import { Search, Star, Loader2, ListFilter, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { genres as allGenres } from '@/lib/movies';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserMovieData {
  watched?: boolean;
  rating?: number;
  isPrivate?: boolean;
  mediaType?: 'movie' | 'tv';
}

type UserRatings = Record<string, UserMovieData>;

export default function CollectionsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [movies, setMovies] = useState<MovieDetailsOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRatings, setUserRatings] = useState<UserRatings>({});

  // Filter states
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [yearRange, setYearRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { toast } = useToast();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (ratingRange[0] !== 0 || ratingRange[1] !== 10) count++;
    if (yearRange.start || yearRange.end) count++;
    if (selectedGenres.length > 0) count++;
    if (mediaTypeFilter !== 'all') count++;
    return count;
  }, [ratingRange, yearRange, selectedGenres, mediaTypeFilter]);

  const resetFilters = () => {
    setRatingRange([0, 10]);
    setYearRange({ start: '', end: '' });
    setSelectedGenres([]);
    setMediaTypeFilter('all');
    setCurrentPage(1);
  };

  const fetchCollection = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const ratingsCollection = collection(db, 'users', user.uid, 'ratings');
        const q = query(ratingsCollection, where('watched', '==', true));
        const snapshot = await getDocs(q);
        
        const ratings: UserRatings = {};
        const mediaItems: { id: number; mediaType: 'movie' | 'tv' }[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as UserMovieData;
            mediaItems.push({
                id: parseInt(doc.id),
                mediaType: data.mediaType || 'movie',
            });
            ratings[doc.id] = data;
        });
        setUserRatings(ratings);
        
        const moviePromises = mediaItems.map(item => getMovieDetails({ id: item.id, mediaType: item.mediaType }));
        const moviesData = await Promise.all(moviePromises);
        
        const fetchedMovies = moviesData
          .filter((m): m is MovieDetailsOutput & {id: number} => !!m && !!m.title && m.title !== 'Unknown Media' && !!m.id && m.id !== 0);

        setMovies(fetchedMovies);

    } catch (error) {
      console.error('Failed to fetch collection:', error);
      toast({
        variant: 'destructive',
        title: 'Fetch Failed',
        description: 'Could not fetch your movie collection. Please try again.',
      });
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authLoading) {
        fetchCollection();
    }
  }, [authLoading, fetchCollection]);


  const filteredMovies = useMemo(() => {
    const moviesWithUserData = movies.map(movie => {
        const userData = userRatings[movie.id.toString()];
        return {
            ...movie,
            watched: true, // All movies in collection are watched
            userRating: userData?.rating,
            isPrivate: userData?.isPrivate,
        };
    });

    return moviesWithUserData.filter(movie => {
        // Search term filter
        if (searchTerm && !movie.title.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Media Type filter
        if (mediaTypeFilter !== 'all' && movie.mediaType !== mediaTypeFilter) {
          return false;
        }

        // Rating range filter (on user rating)
        const movieUserRating = movie.userRating ?? -1;
        if (movieUserRating !== -1 && (ratingRange[0] !== 0 || ratingRange[1] !== 10) && (movieUserRating < ratingRange[0] || movieUserRating > ratingRange[1])) {
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
  }, [movies, userRatings, searchTerm, ratingRange, yearRange, selectedGenres, mediaTypeFilter]);

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
  }, [searchTerm, ratingRange, yearRange, selectedGenres, pageSize, mediaTypeFilter]);


  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          My Collection
        </h1>
        <p className="text-muted-foreground">
          Browse, search, and filter the media you've watched.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your collection..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                    {/* Media Type Filter */}
                     <div className="space-y-2">
                        <Label>Media Type</Label>
                        <Select value={mediaTypeFilter} onValueChange={(value) => setMediaTypeFilter(value as 'all' | 'movie' | 'tv')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select media type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Media</SelectItem>
                                <SelectItem value="movie">Movies</SelectItem>
                                <SelectItem value="tv">TV Shows</SelectItem>
                            </SelectContent>
                        </Select>
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
                                    <div key={genre.name} className="flex items-center space-x-2">
                                        <Checkbox id={`genre-${genre.name}`} checked={selectedGenres.includes(genre.name)} onCheckedChange={(checked) => {
                                            return checked
                                                ? setSelectedGenres([...selectedGenres, genre.name])
                                                : setSelectedGenres(selectedGenres.filter(g => g !== genre.name));
                                        }} />
                                        <Label htmlFor={`genre-${genre.name}`} className="font-normal">{genre.name}</Label>
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
                    <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && movies.length === 0 && (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">Your collection is empty</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Start by browsing movies and TV shows and marking them as watched.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/movies">Browse Media</Link>
            </Button>
          </div>
      )}
      
      {!loading && movies.length > 0 && filteredMovies.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">No Results Found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your filters did not match any items in your collection.
            </p>
            <Button variant="outline" className="mt-4" onClick={resetFilters}>Reset Filters</Button>
          </div>
      )}

      {!loading && paginatedMovies.length > 0 && (
        <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {paginatedMovies.map((movie) => (
                <Link href={`/dashboard/movies/${movie.id}?type=${movie.mediaType}`} key={`${movie.id}-${movie.mediaType}`}>
                    <Card className="group overflow-hidden h-full">
                    <CardHeader className="p-0">
                        <div className="relative h-60 overflow-hidden">
                        <Image
                            src={movie.imageUrl}
                            alt={movie.title}
                            data-ai-hint={movie.imageHint}
                            width={400}
                            height={600}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Badge variant={movie.mediaType === 'tv' ? 'destructive' : 'secondary'} className="absolute bottom-2 left-2">{movie.mediaType === 'tv' ? 'TV' : 'Movie'}</Badge>
                        {movie.isPrivate ? (
                            <Badge variant="destructive" className="absolute top-2 right-2 flex items-center gap-1">
                                <EyeOff className="h-3 w-3"/> Private
                            </Badge>
                        ) : (
                            <Badge className="absolute top-2 right-2 bg-primary/80">Watched</Badge>
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
             <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                    {totalPages > 0 ? `Page ${currentPage} of ${totalPages} ` : ''}
                    ({filteredMovies.length} item{filteredMovies.length === 1 ? '' : 's'})
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
                    disabled={currentPage === totalPages}
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

    