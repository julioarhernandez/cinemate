
"use client";

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
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
import { Search, Star, Loader2, ListFilter, EyeOff, X, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs } from 'firebase/firestore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { genres as allGenres, languages as allLanguages, countries as allCountries } from '@/lib/movies';
import { useMovieSearch } from '@/hooks/use-movie-search';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRatingInfo } from '@/lib/ratings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

interface UserMovieData {
  watched?: boolean;
  rating?: number;
  isPrivate?: boolean;
}

type UserRatings = Record<string, UserMovieData>;

function MoviesPageContent() {
  const [user, authLoading] = useAuthState(auth);
  const [userRatings, setUserRatings] = useState<UserRatings>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false);
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [hideWatched, setHideWatched] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const {
    searchTerm,
    setSearchTerm,
    year,
    setYear,
    selectedGenres,
    setSelectedGenres,
    sortBy,
    setSortBy,
    language,
    setLanguage,
    cast,
    setCast,
    movies,
    loading,
    loadingMore,
    hasMore,
    loadMoreMovies,
    handleLinkClick,
    isInitialized,
    mediaType,
    handleMediaTypeChange,
    handleSearch,
    resetFilters,
    originCountry,
    setOriginCountry
  } = useMovieSearch();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (year) count++;
    if (selectedGenres.length > 0) count++;
    if (language) count++;
    if (cast) count++;
    if (originCountry) count++;
    return count;
  }, [year, selectedGenres, language, cast, originCountry]);

  const isDiscoveryFiltered = useMemo(() => {
    return selectedGenres.length > 0 || !!language || !!cast || !!originCountry;
  }, [selectedGenres, language, cast, originCountry]);

  useEffect(() => {
    if (isDiscoveryFiltered && searchTerm) {
      setSearchTerm('');
    }
  }, [isDiscoveryFiltered, searchTerm, setSearchTerm]);

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

  // Handle clicking outside the filter panel to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }
      
      const target = event.target;
  
      // Check if the click is within the filter panel itself
      if (filtersRef.current && filtersRef.current.contains(target)) {
        return;
      }
  
      // Check if the click is inside any Radix Popover content
      if (target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
  
      // If none of the above, close the filter panel
      setIsFiltersOpen(false);
    }
  
    if (isFiltersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFiltersOpen]);
  
  const moviesWithUserData = useMemo(() => {
    const moviesWithData = movies.map(movie => {
      const userData = userRatings[movie.id.toString()];
      return {
        ...movie,
        watched: userData?.watched === true,
        userRating: userData?.rating,
        isPrivate: userData?.isPrivate,
      };
    });
    
    if (hideWatched) {
        return moviesWithData.filter(movie => !movie.watched);
    }

    return moviesWithData;
  }, [movies, userRatings, hideWatched]);

  const showLoadingSpinner = loading && !isInitialized;
  const showInitialLoad = loading && isInitialized && movies.length === 0;

  const handleGenreSelect = (genreId: string) => {
    setSelectedGenres(prev => {
        if (prev.includes(genreId)) {
            return prev.filter(id => id !== genreId);
        } else {
            return [...prev, genreId];
        }
    });
  };

  const selectedGenreNames = useMemo(() => {
      return selectedGenres.map(id => allGenres.find(g => g.id.toString() === id)?.name).filter(Boolean) as string[];
  }, [selectedGenres]);

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Browse Media
        </h1>
        <p className="text-muted-foreground">
          Search for movies and TV shows to rate and add to your collection.
        </p>
      </div>

      <div className="space-y-4">
        <div className='flex items-center gap-4'>
         <Tabs value={mediaType} onValueChange={(value) => handleMediaTypeChange(value as 'movie' | 'tv')} className="w-full">
            <TabsList>
                <TabsTrigger value="movie">Movies</TabsTrigger>
                <TabsTrigger value="tv">TV Shows</TabsTrigger>
            </TabsList>
         </Tabs>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'TV shows'}...`}
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isDiscoveryFiltered}
                  />
                  {loading && movies.length > 0 && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  Search
              </Button>
            </div>
             {isDiscoveryFiltered && (
              <Alert variant="default" className="text-xs border-none p-0">
                <AlertDescription>
                  Advanced filters (Genre, Language, Cast, Country) only apply when discovering media, not when searching with keywords.
                </AlertDescription>
              </Alert>
            )}
        </form>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-2">
                <Collapsible ref={filtersRef} open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="w-full sm:w-auto">
                    <CollapsibleTrigger asChild>
                        <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "w-full sm:w-auto",
                            activeFilterCount > 0 && "border-primary text-primary"
                        )}
                        >
                            <ListFilter className="mr-2 h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                {activeFilterCount}
                            </span>
                            )}
                        </Button>
                    </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 sm:absolute sm:z-10 animate-in fade-in-0 zoom-in-95">
                    <div className="rounded-lg border p-4 bg-background w-[280px]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-semibold">Filters</h4>
                            {activeFilterCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={resetFilters} className="-mr-2 h-auto p-1">
                                    Reset
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Release Year</Label>
                                <Input placeholder="e.g., 2024" value={year} onChange={e => setYear(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Original Language</Label>
                                <Popover open={languagePopoverOpen} onOpenChange={setLanguagePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={languagePopoverOpen}
                                        className="w-full justify-between font-normal"
                                        >
                                        <span className="truncate">
                                        {language
                                            ? allLanguages.find((lang) => lang.iso_639_1 === language)?.english_name
                                            : "Select language..."}
                                        </span>
                                        {language ? (
                                        <X className="ml-2 h-4 w-4 shrink-0 opacity-50" onClick={(e) => { e.stopPropagation(); setLanguage('')}}/>
                                        ) : (
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[240px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search language..." />
                                            <CommandEmpty>No language found.</CommandEmpty>
                                            <CommandGroup>
                                                <ScrollArea className='h-40'>
                                                {allLanguages.map((lang) => (
                                                    <CommandItem
                                                    key={lang.iso_639_1}
                                                    value={lang.english_name}
                                                    onSelect={(currentValue) => {
                                                        const selectedLang = allLanguages.find(l => l.english_name.toLowerCase() === currentValue.toLowerCase());
                                                        if (selectedLang) {
                                                        setLanguage(selectedLang.iso_639_1 === language ? "" : selectedLang.iso_639_1);
                                                        }
                                                        setLanguagePopoverOpen(false);
                                                    }}
                                                    >
                                                    <Check
                                                        className={cn(
                                                        "mr-2 h-4 w-4",
                                                        language === lang.iso_639_1 ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {lang.english_name}
                                                    </CommandItem>
                                                ))}
                                                </ScrollArea>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Origin Country</Label>
                                <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={countryPopoverOpen}
                                        className="w-full justify-between font-normal"
                                        >
                                        <span className="truncate">
                                        {originCountry
                                            ? allCountries.find((country) => country.iso_3166_1 === originCountry)?.english_name
                                            : "Select country..."}
                                        </span>
                                        {originCountry ? (
                                        <X className="ml-2 h-4 w-4 shrink-0 opacity-50" onClick={(e) => { e.stopPropagation(); setOriginCountry('')}}/>
                                        ) : (
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[240px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search country..." />
                                            <CommandEmpty>No country found.</CommandEmpty>
                                            <CommandGroup>
                                                <ScrollArea className='h-40'>
                                                {allCountries.map((country) => (
                                                    <CommandItem
                                                    key={country.iso_3166_1}
                                                    value={country.english_name}
                                                    onSelect={(currentValue) => {
                                                        const selectedCountry = allCountries.find(c => c.english_name.toLowerCase() === currentValue.toLowerCase());
                                                        if (selectedCountry) {
                                                        setOriginCountry(selectedCountry.iso_3166_1 === originCountry ? "" : selectedCountry.iso_3166_1);
                                                        }
                                                        setCountryPopoverOpen(false);
                                                    }}
                                                    >
                                                    <Check
                                                        className={cn(
                                                        "mr-2 h-4 w-4",
                                                        originCountry === country.iso_3166_1 ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {country.english_name}
                                                    </CommandItem>
                                                ))}
                                                </ScrollArea>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>


                            <div className="space-y-2">
                                <Label>Cast Member</Label>
                                <Input placeholder="e.g., Tom Hanks" value={cast} onChange={e => setCast(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                            <Label>Genre</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between font-normal h-auto"
                                    >
                                        <div className="flex flex-wrap gap-1 items-center">
                                        {selectedGenreNames.length > 0 ? (
                                            selectedGenreNames.map(name => (
                                                <Badge
                                                    variant="secondary"
                                                    key={name}
                                                    className="rounded-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const genreToUnselect = allGenres.find(g => g.name === name);
                                                        if (genreToUnselect) {
                                                            handleGenreSelect(genreToUnselect.id.toString());
                                                        }
                                                    }}
                                                >
                                                    {name}
                                                    <X className="ml-1 h-3 w-3" />
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground">Select genres...</span>
                                        )}
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[240px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search genres..." />
                                        <CommandList>
                                            <CommandEmpty>No genre found.</CommandEmpty>
                                            <CommandGroup>
                                            <ScrollArea className="h-40">
                                                {allGenres.map((genre) => {
                                                    const isSelected = selectedGenres.includes(genre.id.toString());
                                                    return (
                                                        <CommandItem
                                                            key={genre.id}
                                                            value={genre.name}
                                                            onSelect={() => handleGenreSelect(genre.id.toString())}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    isSelected ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {genre.name}
                                                        </CommandItem>
                                                    );
                                                })}
                                            </ScrollArea>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        </div>
                    </div>
                </CollapsibleContent>
                </Collapsible>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="hide-watched" checked={hideWatched} onCheckedChange={(checked) => setHideWatched(checked as boolean)} />
                    <Label htmlFor="hide-watched" className="font-normal">Hide Watched</Label>
                </div>
            </div>
             <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="popularity.desc">Popularity</SelectItem>
                    <SelectItem value={mediaType === 'movie' ? "primary_release_date.desc" : "first_air_date.desc"}>Newest First</SelectItem>
                    <SelectItem value={mediaType === 'movie' ? "primary_release_date.asc" : "first_air_date.asc"}>Oldest First</SelectItem>
                    <SelectItem value="vote_average.desc">Rating</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {showLoadingSpinner && (
         <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {showInitialLoad && (
         <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && movies.length === 0 && isInitialized && (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">No results found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
      )}


      {moviesWithUserData.length > 0 && (
        <>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {moviesWithUserData.map((movie) => {
                const ratingInfo = getRatingInfo(movie.userRating);
                return (
                    <Link
                        href={`/dashboard/movies/${movie.id}?type=${movie.mediaType}`}
                        key={`${movie.id}-${movie.mediaType}`}
                        onClick={(e) => handleLinkClick(e, `/dashboard/movies/${movie.id}?type=${movie.mediaType}`)}
                    >
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
                                {ratingInfo && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex items-center gap-1 text-lg font-bold cursor-default">( {ratingInfo.emoji} )</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-bold">{ratingInfo.label}</p>
                                            <p>{ratingInfo.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </CardFooter>
                        </Card>
                    </Link>
                )
            })}
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
    </TooltipProvider>
  );
}

export default function MoviesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <MoviesPageContent />
        </Suspense>
    )
}

    