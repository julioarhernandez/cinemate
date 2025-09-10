
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { Search, Star, Loader2, Bookmark, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { Button } from '@/components/ui/button';
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
} from "@/components/ui/alert-dialog"


export default function WatchlistPage() {
  const [user, authLoading] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [movies, setMovies] = useState<MovieDetailsOutput[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const ratingsCollection = collection(db, 'users', user.uid, 'ratings');
        const q = query(ratingsCollection, where('watchlist', '==', true));
        const snapshot = await getDocs(q);
        
        const mediaItems: { id: number; mediaType: 'movie' | 'tv' }[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            mediaItems.push({
                id: parseInt(doc.id),
                mediaType: data.mediaType || 'movie', // Default to movie if not specified
            });
        });
        
        const moviePromises = mediaItems.map(item => getMovieDetails({ id: item.id, mediaType: item.mediaType }));
        const moviesData = await Promise.all(moviePromises);
        
        const fetchedMovies = moviesData
          .filter((m): m is MovieDetailsOutput & {id: number} => !!m && !!m.title && m.title !== 'Unknown Media' && !!m.id && m.id !== 0);

        setMovies(fetchedMovies);

    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
      toast({
        variant: 'destructive',
        title: 'Fetch Failed',
        description: 'Could not fetch your movie watchlist. Please try again.',
      });
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authLoading) {
        fetchWatchlist();
    }
  }, [authLoading, fetchWatchlist]);


  const handleRemoveFromWatchlist = async (movieId: number) => {
    if (!user) return;
    try {
        const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieId.toString());
        await setDoc(ratingDocRef, { watchlist: false, updatedAt: serverTimestamp() }, { merge: true });

        // Optimistically remove from UI
        setMovies(prevMovies => prevMovies.filter(m => m.id !== movieId));

        toast({
            title: 'Removed from watchlist.',
        });

    } catch (error) {
        console.error('Failed to remove from watchlist:', error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not remove the item from your watchlist.',
        });
    }
  };


  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          My Watchlist
        </h1>
        <p className="text-muted-foreground">
          Movies and TV shows you want to watch later.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your watchlist..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && movies.length > 0 && filteredMovies.length === 0 && (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">No items found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your search for "{searchTerm}" did not match any items in your watchlist.
            </p>
          </div>
      )}

      {!loading && movies.length === 0 && (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">Your watchlist is empty</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Browse for movies and TV shows and add them to your watchlist.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/movies">Browse Media</Link>
            </Button>
          </div>
      )}

      {!loading && filteredMovies.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredMovies.map((movie) => (
              <Card key={`${movie.id}-${movie.mediaType}`} className="group overflow-hidden h-full flex flex-col">
                <div className="relative">
                  <Link href={`/dashboard/movies/${movie.id}?type=${movie.mediaType}`}>
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
                       <Badge className="absolute top-2 left-2" variant={movie.mediaType === 'tv' ? 'destructive' : 'secondary'}>
                          {movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                       </Badge>
                    </div>
                  </Link>

                  <div className="absolute top-2 right-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Badge 
                            variant="secondary" 
                            className="flex items-center gap-1 cursor-pointer hover:bg-destructive/80 hover:text-destructive-foreground"
                            onClick={(e) => {e.stopPropagation()}}
                        >
                            <Bookmark className="h-3 w-3" /> Watchlist
                        </Badge>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from Watchlist?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{movie.title}" from your watchlist?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveFromWatchlist(movie.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                <Link href={`/dashboard/movies/${movie.id}?type=${movie.mediaType}`} className="block flex-grow flex flex-col">
                    <CardContent className="p-3 flex-grow">
                        <CardTitle className="truncate text-base font-bold">{movie.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{movie.year}</p>
                    </CardContent>
                    <CardFooter className="p-3 pt-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star className="h-4 w-4 text-amber-400" /> 
                            <span>{movie.rating.toFixed(1)}</span>
                        </div>
                    </CardFooter>
                </Link>
              </Card>
            ))}
        </div>
      )}

    </div>
  );
}
