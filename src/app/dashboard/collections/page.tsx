
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
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star, Loader2, ListFilter, EyeOff, Bookmark, Trash2, Sparkles, History, Share2, Gift, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { genres as allGenres } from '@/lib/movies';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSearchParams } from 'next/navigation';

interface UserMovieData {
  watched?: boolean;
  watchlist?: boolean;
  rating?: number;
  isPrivate?: boolean;
  mediaType?: 'movie' | 'tv';
}

type UserRatings = Record<string, UserMovieData>;

interface AiRecommendation {
  id: string;
  preferences: string;
  recommendations: {
    title: string;
    year: string;
    reasoning: string;
  }[];
  createdAt: Timestamp;
}

interface UserRecommendation {
    id: string;
    createdAt: Timestamp;
    movie: MovieDetailsOutput;
    recipients: {id: string, name: string}[];
}

interface IncomingRecommendation {
    id: string;
    movie: MovieDetailsOutput;
    from: {
        id: string;
        name: string;
        photoURL?: string;
    };
    createdAt: Timestamp;
}

interface User {
  id: string;
  displayName: string;
  photoURL?: string;
}

export default function CollectionsPage() {
  const [user, authLoading] = useAuthState(auth);
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [watchedMovies, setWatchedMovies] = useState<MovieDetailsOutput[]>([]);
  const [watchlistMovies, setWatchlistMovies] = useState<MovieDetailsOutput[]>([]);
  const [aiRecommendationHistory, setAiRecommendationHistory] = useState<AiRecommendation[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<UserRecommendation[]>([]);
  const [incomingRecommendations, setIncomingRecommendations] = useState<IncomingRecommendation[]>([]);

  const [loading, setLoading] = useState(true);
  const [userRatings, setUserRatings] = useState<UserRatings>({});
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'collection');

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

  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const ratingsCollection = collection(db, 'users', user.uid, 'ratings');
        const snapshot = await getDocs(ratingsCollection);
        
        const ratings: UserRatings = {};
        const watchedItems: { id: number; mediaType: 'movie' | 'tv' }[] = [];
        const watchlistItems: { id: number; mediaType: 'movie' | 'tv' }[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data() as UserMovieData;
            const mediaType = data.mediaType || 'movie';
            const itemId = parseInt(doc.id, 10);
            ratings[doc.id] = data;

            if (data.watched) {
                watchedItems.push({ id: itemId, mediaType });
            }
            if (data.watchlist) {
                watchlistItems.push({ id: itemId, mediaType });
            }
        });
        setUserRatings(ratings);
        
        const [watchedMoviesData, watchlistMoviesData] = await Promise.all([
          Promise.all(watchedItems.map(item => getMovieDetails({ id: item.id, mediaType: item.mediaType }))),
          Promise.all(watchlistItems.map(item => getMovieDetails({ id: item.id, mediaType: item.mediaType })))
        ]);

        const filterValidMovies = (data: (MovieDetailsOutput | null)[]) => data.filter((m): m is MovieDetailsOutput & {id: number} => !!m && !!m.title && m.title !== 'Unknown Media' && !!m.id && m.id !== 0);
        
        setWatchedMovies(filterValidMovies(watchedMoviesData));
        setWatchlistMovies(filterValidMovies(watchlistMoviesData));

        // Fetch AI recommendation history
        const aiHistoryCollection = collection(db, 'users', user.uid, 'recommendations');
        const aiHistoryQuery = query(aiHistoryCollection, orderBy('createdAt', 'desc'));
        const aiHistorySnapshot = await getDocs(aiHistoryQuery);
        const aiHistoryData = aiHistorySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as AiRecommendation));
        setAiRecommendationHistory(aiHistoryData);
        
        // Fetch user-sent recommendations
        const userRecsCollection = collection(db, 'users', user.uid, 'sentRecommendations');
        const userRecsQuery = query(userRecsCollection, orderBy('createdAt', 'desc'));
        const userRecsSnapshot = await getDocs(userRecsQuery);

        const friendDocs = await getDocs(collection(db, 'users', user.uid, 'friends'));
        const friendsMap = new Map<string, string>(friendDocs.docs.map(d => [d.id, d.data().displayName]));


        const userRecsData = await Promise.all(userRecsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const movie = await getMovieDetails({id: data.movieId, mediaType: data.mediaType });
            const recipients = (data.recipientIds as string[]).map(id => ({
                id,
                name: friendsMap.get(id) || 'Unknown User'
            }));

            return {
                id: doc.id,
                createdAt: data.createdAt,
                movie,
                recipients
            } as UserRecommendation;
        }));
        setUserRecommendations(userRecsData.filter(r => r.movie.id !== 0));

        // Fetch incoming recommendations
        const incomingRecsRef = collection(db, 'users', user.uid, 'incomingRecommendations');
        const incomingRecsQuery = query(incomingRecsRef, orderBy('createdAt', 'desc'));
        const incomingRecsSnapshot = await getDocs(incomingRecsQuery);
        
        const incomingRecsPromises = incomingRecsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const movieDetails = await getMovieDetails({ id: data.movieId, mediaType: data.mediaType || 'movie' });
            if (!movieDetails || movieDetails.title === 'Unknown Media') return null;

            return {
                id: doc.id,
                movie: movieDetails,
                from: {
                    id: data.fromId,
                    name: data.fromName,
                    photoURL: data.fromPhotoURL,
                },
                createdAt: data.createdAt,
            };
        });
        
        const incomingRecs = await Promise.all(incomingRecsPromises);
        setIncomingRecommendations(incomingRecs.filter((r): r is IncomingRecommendation => r !== null));


    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast({
        variant: 'destructive',
        title: 'Fetch Failed',
        description: 'Could not fetch your data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authLoading) {
        fetchAllData();
    }
  }, [authLoading, fetchAllData]);

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
    setSearchTerm('');
  };
  
  const filteredWatchedMovies = useMemo(() => {
    const moviesWithUserData = watchedMovies.map(movie => {
        const userData = userRatings[movie.id.toString()];
        return {
            ...movie,
            watched: true, // All movies in collection are watched
            userRating: userData?.rating,
            isPrivate: userData?.isPrivate,
        };
    });

    return moviesWithUserData.filter(movie => {
        if (searchTerm && !movie.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (mediaTypeFilter !== 'all' && movie.mediaType !== mediaTypeFilter) return false;
        const movieUserRating = movie.userRating ?? -1;
        if (movieUserRating !== -1 && (ratingRange[0] !== 0 || ratingRange[1] !== 10) && (movieUserRating < ratingRange[0] || movieUserRating > ratingRange[1])) return false;
        const movieYear = parseInt(movie.year);
        const startYear = yearRange.start ? parseInt(yearRange.start) : -Infinity;
        const endYear = yearRange.end ? parseInt(yearRange.end) : Infinity;
        if (!isNaN(movieYear) && (movieYear < startYear || movieYear > endYear)) return false;
        if (selectedGenres.length > 0) {
            const movieGenres = movie.genre?.split(', ').map(g => g.trim()) || [];
            if (!selectedGenres.some(sg => movieGenres.includes(sg))) return false;
        }
        return true;
      });
  }, [watchedMovies, userRatings, searchTerm, ratingRange, yearRange, selectedGenres, mediaTypeFilter]);
  
  const filteredWatchlistMovies = useMemo(() => {
    return watchlistMovies.filter(movie =>
      movie.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [watchlistMovies, searchTerm]);

  const paginatedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredWatchedMovies.slice(startIndex, endIndex);
  }, [filteredWatchedMovies, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredWatchedMovies.length / pageSize);
  }, [filteredWatchedMovies, pageSize]);
  
  const handleRemoveFromWatchlist = async (movieId: number) => {
    if (!user) return;
    try {
        const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieId.toString());
        await setDoc(ratingDocRef, { watchlist: false, updatedAt: serverTimestamp() }, { merge: true });
        setWatchlistMovies(prevMovies => prevMovies.filter(m => m.id !== movieId));
        toast({ title: 'Removed from watchlist.' });
    } catch (error) {
        console.error('Failed to remove from watchlist:', error);
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  const handleDismissRecommendation = async (recommendationId: string) => {
    if (!user) return;
    try {
        const recDocRef = doc(db, 'users', user.uid, 'incomingRecommendations', recommendationId);
        await deleteDoc(recDocRef);
        setIncomingRecommendations(prev => prev.filter(r => r.id !== recommendationId));
        toast({ title: 'Recommendation dismissed.' });
    } catch (error) {
        console.error('Failed to dismiss recommendation:', error);
        toast({ variant: 'destructive', title: 'Could not dismiss recommendation.' });
    }
  }

  const handleSaveToWatchlistAndDismiss = async (recommendation: IncomingRecommendation) => {
    if (!user) return;
    try {
      // 1. Add to watchlist
      const ratingDocRef = doc(db, 'users', user.uid, 'ratings', recommendation.movie.id.toString());
      await setDoc(ratingDocRef, { 
        watchlist: true, 
        mediaType: recommendation.movie.mediaType,
        updatedAt: serverTimestamp() 
      }, { merge: true });

      // 2. Dismiss recommendation
      const recDocRef = doc(db, 'users', user.uid, 'incomingRecommendations', recommendation.id);
      await deleteDoc(recDocRef);

      // 3. Update UI state
      setIncomingRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
      setWatchlistMovies(prev => [recommendation.movie, ...prev]);
      
      toast({ 
        title: 'Saved to Watchlist!',
        description: `"${recommendation.movie.title}" has been added to your watchlist.`,
      });

    } catch (error) {
      console.error('Failed to save to watchlist and dismiss:', error);
      toast({ variant: 'destructive', title: 'Action failed. Please try again.' });
    }
  };

  const handleDeleteAiRecommendation = async (recommendationId: string) => {
    if (!user) return;
    try {
      const recDocRef = doc(db, 'users', user.uid, 'recommendations', recommendationId);
      await deleteDoc(recDocRef);
      setAiRecommendationHistory(prev => prev.filter(r => r.id !== recommendationId));
      toast({ title: 'Recommendation deleted.' });
    } catch (error) {
      console.error('Failed to delete AI recommendation:', error);
      toast({ variant: 'destructive', title: 'Could not delete recommendation.' });
    }
  };


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ratingRange, yearRange, selectedGenres, pageSize, mediaTypeFilter]);


  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          My Library
        </h1>
        <p className="text-muted-foreground">
          Browse your collections, watchlist, and recommendations.
        </p>
      </div>

     <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
                <TabsTrigger value="collection">My Collection ({watchedMovies.length})</TabsTrigger>
                <TabsTrigger value="watchlist">Watchlist ({watchlistMovies.length})</TabsTrigger>
                <TabsTrigger value="ai-recommendations">AI Suggestions ({aiRecommendationHistory.length})</TabsTrigger>
                <TabsTrigger value="my-recommendations">My Recs ({userRecommendations.length})</TabsTrigger>
                <TabsTrigger value="incoming-recommendations">Incoming Recs ({incomingRecommendations.length})</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search current tab..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Watched Collection Tab */}
        <TabsContent value="collection" className="mt-6">
            <div className="space-y-4">
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
                            <div className="space-y-2">
                                <Label>Media Type</Label>
                                <Select value={mediaTypeFilter} onValueChange={(value) => setMediaTypeFilter(value as 'all' | 'movie' | 'tv')}>
                                    <SelectTrigger><SelectValue placeholder="Select media type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Media</SelectItem>
                                        <SelectItem value="movie">Movies</SelectItem>
                                        <SelectItem value="tv">TV Shows</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Your Rating: {ratingRange[0]} - {ratingRange[1]} stars</Label>
                                <Slider value={ratingRange} onValueChange={(value) => setRatingRange(value as [number, number])} max={10} step={1} />
                            </div>
                            <div className="space-y-2">
                                <Label>Release Year</Label>
                                <div className="flex items-center gap-4">
                                    <Input placeholder="From (e.g., 1990)" value={yearRange.start} onChange={e => setYearRange(p => ({...p, start: e.target.value}))} />
                                    <span>-</span>
                                    <Input placeholder="To (e.g., 2024)" value={yearRange.end} onChange={e => setYearRange(p => ({...p, end: e.target.value}))} />
                                </div>
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
                            <Button onClick={() => setIsFiltersOpen(false)} className="w-full">Apply Filters</Button>
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
                
                {!loading && watchedMovies.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center mt-4">
                        <h3 className="text-xl font-bold tracking-tight">Your collection is empty</h3>
                        <p className="text-sm text-muted-foreground mt-2">Browse for media and mark it as watched to build your collection.</p>
                        <Button asChild className="mt-4"><Link href="/dashboard/movies">Browse Media</Link></Button>
                    </div>
                )}
                
                {!loading && watchedMovies.length > 0 && paginatedMovies.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center mt-4">
                        <h3 className="text-xl font-bold tracking-tight">No Results Found</h3>
                        <p className="text-sm text-muted-foreground mt-2">Your filters did not match any items in your collection.</p>
                        <Button variant="outline" className="mt-4" onClick={resetFilters}>Reset Filters</Button>
                    </div>
                )}

                {paginatedMovies.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {paginatedMovies.map((movie) => (
                            <Link href={`/dashboard/movies/${movie.id}?type=${movie.mediaType}`} key={`${movie.id}-${movie.mediaType}`}>
                                <Card className="group overflow-hidden h-full">
                                <CardHeader className="p-0">
                                    <div className="relative h-60 overflow-hidden">
                                    <Image src={movie.imageUrl} alt={movie.title} data-ai-hint={movie.imageHint} width={400} height={600} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <Badge variant={movie.mediaType === 'tv' ? 'destructive' : 'secondary'} className="absolute bottom-2 left-2">{movie.mediaType === 'tv' ? 'TV' : 'Movie'}</Badge>
                                    {movie.isPrivate ? (
                                        <Badge variant="destructive" className="absolute top-2 right-2 flex items-center gap-1"><EyeOff className="h-3 w-3"/> Private</Badge>
                                    ) : (
                                        <Badge className="absolute top-2 right-2 bg-primary/80">Watched</Badge>
                                    )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3"><CardTitle className="truncate text-base font-bold">{movie.title}</CardTitle><p className="text-sm text-muted-foreground">{movie.year}</p></CardContent>
                                <CardFooter className="p-3 pt-0">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Star className="h-4 w-4 text-amber-400" /> <span>{movie.rating.toFixed(1)}</span>
                                        {movie.userRating && (<span className="flex items-center gap-1 text-primary font-bold">( <Star className="h-4 w-4"/> {movie.userRating} )</span>)}
                                    </div>
                                </CardFooter>
                                </Card>
                            </Link>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-muted-foreground">{totalPages > 0 ? `Page ${currentPage} of ${totalPages} ` : ''}({filteredWatchedMovies.length} item{filteredWatchedMovies.length === 1 ? '' : 's'})</p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                                <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="watchlist" className="mt-6">
            {!loading && watchlistMovies.length > 0 && filteredWatchlistMovies.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                    <h3 className="text-xl font-bold tracking-tight">No items found</h3>
                    <p className="text-sm text-muted-foreground mt-2">Your search for "{searchTerm}" did not match any items in your watchlist.</p>
                </div>
            )}
            {!loading && watchlistMovies.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                    <h3 className="text-xl font-bold tracking-tight">Your watchlist is empty</h3>
                    <p className="text-sm text-muted-foreground mt-2">Browse for movies and TV shows and add them to your watchlist.</p>
                    <Button asChild className="mt-4"><Link href="/dashboard/movies">Browse Media</Link></Button>
                </div>
            )}
            {filteredWatchlistMovies.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {filteredWatchlistMovies.map((movie) => (
                    <Card key={`${movie.id}-${movie.mediaType}`} className="group overflow-hidden h-full flex flex-col">
                        <div className="relative">
                        <Link href={`/dashboard/movies/${movie.id}?type=${movie.mediaType}`}>
                            <div className="relative h-60 overflow-hidden">
                                <Image src={movie.imageUrl} alt={movie.title} data-ai-hint={movie.imageHint} width={400} height={600} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <Badge className="absolute bottom-2 left-2" variant={movie.mediaType === 'tv' ? 'destructive' : 'secondary'}>{movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}</Badge>
                            </div>
                        </Link>
                        <div className="absolute top-2 right-2">
                            <AlertDialog><AlertDialogTrigger asChild>
                                <Badge variant="secondary" className="flex items-center gap-1 cursor-pointer hover:bg-destructive/80 hover:text-destructive-foreground" onClick={(e) => {e.stopPropagation()}}>
                                    <Bookmark className="h-3 w-3" /> Watchlist
                                </Badge>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader><AlertDialogTitle>Remove from Watchlist?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove "{movie.title}" from your watchlist?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveFromWatchlist(movie.id)} className="bg-destructive hover:bg-destructive/90"><Trash2 className="mr-2 h-4 w-4" /> Remove</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        </div>
                        <Link href={`/dashboard/movies/${movie.id}?type=${movie.mediaType}`} className="block flex-grow flex flex-col">
                            <CardContent className="p-3 flex-grow"><CardTitle className="truncate text-base font-bold">{movie.title}</CardTitle><p className="text-sm text-muted-foreground">{movie.year}</p></CardContent>
                            <CardFooter className="p-3 pt-0"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="h-4 w-4 text-amber-400" /><span>{movie.rating.toFixed(1)}</span></div></CardFooter>
                        </Link>
                    </Card>
                    ))}
                </div>
            )}
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="ai-recommendations" className="mt-6">
            {!loading && aiRecommendationHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                    <h3 className="text-xl font-bold tracking-tight">No history yet</h3>
                    <p className="text-sm text-muted-foreground mt-2">Your past AI recommendations will appear here.</p>
                     <Button asChild className="mt-4"><Link href="/dashboard/ai-recommender">Get a Recommendation</Link></Button>
                </div>
            )}
            {aiRecommendationHistory.length > 0 && (
                <div className="space-y-6">
                    {aiRecommendationHistory
                        .filter(item => !searchTerm || item.preferences.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(item => (
                        <Card key={item.id}>
                            <CardHeader>
                                <CardTitle className="text-lg">Based on: &quot;{item.preferences}&quot;</CardTitle>
                                <CardDescription>{formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                            {item.recommendations.map((rec, index) => (
                                <div key={index} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
                                    <Link href={`/dashboard/movies?search=${encodeURIComponent(rec.title)}&year=${rec.year}`}>
                                        <h3 className="text-xl font-bold text-primary hover:underline">{rec.title} ({rec.year})</h3>
                                    </Link>
                                    <div>
                                        <h4 className="font-headline text-sm font-semibold">Why you might like it:</h4>
                                        <p className="mt-1 text-sm text-muted-foreground">{rec.reasoning}</p>
                                    </div>
                                </div>
                            ))}
                            </CardContent>
                            <CardFooter className="flex justify-end">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete this AI recommendation from your history.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleDeleteAiRecommendation(item.id)}
                                            className="bg-destructive hover:bg-destructive/90"
                                        >
                                            Delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </TabsContent>

         {/* My Recommendations Tab */}
        <TabsContent value="my-recommendations" className="mt-6">
            {!loading && userRecommendations.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                    <h3 className="text-xl font-bold tracking-tight">You haven't recommended anything</h3>
                    <p className="text-sm text-muted-foreground mt-2">Movies you recommend to friends will appear here.</p>
                     <Button asChild className="mt-4"><Link href="/dashboard/movies">Browse Media</Link></Button>
                </div>
            )}
            {userRecommendations.length > 0 && (
                <div className="space-y-4">
                    {userRecommendations
                        .filter(item => !searchTerm || item.movie.title.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(item => (
                        <Card key={item.id} className="p-4">
                            <div className="flex items-start gap-4">
                                <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`} className="flex-shrink-0">
                                    <Image
                                        src={item.movie.imageUrl}
                                        alt={item.movie.title}
                                        data-ai-hint={item.movie.imageHint}
                                        width={80}
                                        height={120}
                                        className="rounded-sm object-cover aspect-[2/3]"
                                    />
                                </Link>
                                <div className="flex-1">
                                    <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`}>
                                        <h3 className="text-lg font-bold hover:underline">{item.movie.title} ({item.movie.year})</h3>
                                    </Link>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}
                                    </p>
                                    <div className="text-sm">
                                        <p className="font-semibold">You recommended this to:</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {item.recipients.map(recipient => (
                                                <Badge key={recipient.id} variant="secondary">{recipient.name}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </TabsContent>

        {/* Incoming Recommendations Tab */}
        <TabsContent value="incoming-recommendations" className="mt-6">
             {!loading && incomingRecommendations.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                    <Gift className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold tracking-tight">No incoming recommendations</h3>
                    <p className="text-sm text-muted-foreground mt-2">When a friend recommends a movie to you, it will appear here.</p>
                </div>
            )}
            {incomingRecommendations.length > 0 && (
                <div className="space-y-4">
                    {incomingRecommendations
                        .filter(item => !searchTerm || item.movie.title.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(item => (
                        <Card key={item.id} className="p-4">
                            <div className="flex items-start gap-4">
                                <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`} className="flex-shrink-0">
                                    <Image
                                        src={item.movie.imageUrl}
                                        alt={item.movie.title}
                                        data-ai-hint={item.movie.imageHint}
                                        width={80}
                                        height={120}
                                        className="rounded-sm object-cover aspect-[2/3]"
                                    />
                                </Link>
                                <div className="flex-1">
                                    <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`}>
                                        <h3 className="text-lg font-bold hover:underline">{item.movie.title} ({item.movie.year})</h3>
                                    </Link>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}
                                    </p>
                                    <div className="text-sm flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={item.from.photoURL} alt={item.from.name} />
                                            <AvatarFallback>{item.from.name?.charAt(0) ?? 'U'}</AvatarFallback>
                                        </Avatar>
                                        <p>Recommended by <span className="font-semibold">{item.from.name}</span></p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleSaveToWatchlistAndDismiss(item)}>
                                        <Bookmark className="mr-2 h-4 w-4" /> Save to Watchlist
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="outline"><Trash2 className="mr-2 h-4 w-4" /> Dismiss</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Dismiss Recommendation?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to dismiss this recommendation for "{item.movie.title}"?
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDismissRecommendation(item.id)} variant="destructive">
                                                Dismiss
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </TabsContent>

     </Tabs>
    </div>
  );
}
