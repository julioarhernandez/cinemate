
"use client";

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { useState, useEffect, use, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const StarRatingInput = ({
  rating,
  setRating,
}: {
  rating: number;
  setRating: (rating: number) => void;
}) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(10)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button
            key={index}
            type="button"
            onMouseEnter={() => setHover(ratingValue)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(ratingValue)}
          >
            <Star
              className={`h-6 w-6 cursor-pointer transition-colors ${
                ratingValue <= (hover || rating)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};


// Define the type for the movie details to avoid using 'any'
interface MovieDetails {
  synopsis: string;
  genre: string;
  year: string;
  rating: number;
  imageUrl: string;
  imageHint: string;
}

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const movieTitle = decodeURIComponent(resolvedParams.slug.replace(/-/g, ' '));
  const [user, authLoading] = useAuthState(auth);

  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const { toast } = useToast();
  const isInitialMount = useRef(true);


  useEffect(() => {
    if (!movieTitle) return;

    async function fetchDetailsAndUserRating() {
      setLoading(true);
      try {
        // 1. Fetch movie details first
        const details = await getMovieDetails({ title: movieTitle });
        if (!details) {
          setMovieDetails(null);
          return;
        }
        setMovieDetails(details);
        // Set initial rating from TMDB as a fallback. It will be overwritten by user data if it exists.
        setUserRating(details.rating);

        // 2. Then, fetch user-specific data from Firestore if the user is logged in
        if (user) {
          const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieTitle);
          const ratingDoc = await getDoc(ratingDocRef);
          
          if (ratingDoc.exists()) {
            const data = ratingDoc.data();
            // Overwrite with user's saved data if it exists
            setUserRating(data.rating || details.rating);
            setWatched(data.watched || false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch movie data", error);
        setMovieDetails(null);
      } finally {
        setLoading(false);
      }
    }

    // Only run this when the auth state is resolved (user is loaded or not logged in)
    if (!authLoading) {
      fetchDetailsAndUserRating();
    }

  }, [movieTitle, user, authLoading]); // Re-run when user or auth state changes
  
  const handleSave = async (dataToSave: { rating?: number; watched?: boolean }) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Signed In',
        description: 'You must be signed in to save changes.',
      });
      return false;
    }
  
    try {
      const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieTitle);
      await setDoc(ratingDocRef, dataToSave, { merge: true });
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your changes. Please try again.',
      });
      return false;
    }
  };
  
  const handleSaveRating = async () => {
    const success = await handleSave({ rating: userRating });
    if (success) {
      toast({
        title: 'Rating Saved!',
        description: `You rated ${movieTitle} ${userRating.toFixed(1)} stars.`,
      });
    }
  };

  useEffect(() => {
    // This effect handles auto-saving the 'watched' status.
    // It should only run AFTER the initial data load.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Prevent saving if the user is not loaded yet
    if (!user || authLoading) return;

    // Prevent saving if movieDetails haven't loaded yet
    if (!movieDetails) return;

    async function autoSaveWatched() {
      const success = await handleSave({ watched: watched });
      if (success) {
         toast({
          title: 'Watched Status Updated!',
          description: watched ? `Marked "${movieTitle}" as watched.` : `Marked "${movieTitle}" as unwatched.`,
        });
      }
    }
    autoSaveWatched();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);


  if (loading || authLoading) {
    return <div className="flex justify-center items-center h-64">Loading movie details...</div>;
  }

  if (!movieDetails) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard/movies">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Movies
          </Link>
        </Button>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Image
            src={movieDetails.imageUrl}
            alt={movieTitle}
            data-ai-hint={movieDetails.imageHint}
            width={400}
            height={600}
            className="w-full h-auto object-cover rounded-lg shadow-lg"
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Badge variant="secondary">{movieDetails.genre}</Badge>
          <h1 className="font-headline text-4xl font-bold tracking-tight">
            {movieTitle}
          </h1>
          <p className="text-xl text-muted-foreground">{movieDetails.year}</p>

          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <span className="text-lg font-bold">
              {movieDetails.rating.toFixed(1)} / 10.0 (TMDB)
            </span>
          </div>

          <div className="pt-4 space-y-6">
            <div className="flex items-center space-x-2">
              <Switch id="watched-toggle" checked={watched} onCheckedChange={setWatched} />
              <Label htmlFor="watched-toggle" className="text-lg">
                Mark as Watched
              </Label>
            </div>

            <div>
              <Label className="text-lg">Your Rating</Label>
              <div className="flex flex-col items-start gap-4 mt-2 sm:flex-row sm:items-center">
                <StarRatingInput rating={userRating} setRating={setUserRating} />
                <Button onClick={handleSaveRating}>Save Rating</Button>
              </div>
               <p className="text-sm text-muted-foreground mt-1">{userRating > 0 ? `You selected ${userRating.toFixed(1)} out of 10 stars.` : 'Rate this movie.'}</p>
            </div>
          </div>

          <div className="pt-4">
            <h2 className="font-headline text-2xl font-bold">Synopsis</h2>
            <p className="mt-2 text-muted-foreground max-w-prose">
              {movieDetails.synopsis}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
