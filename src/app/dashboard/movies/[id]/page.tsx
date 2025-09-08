
"use client";

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { useState, useEffect, useRef } from 'react';
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


export default function MovieDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const movieId = parseInt(params.id, 10);
  const [user, authLoading] = useAuthState(auth);

  const [movieDetails, setMovieDetails] = useState<MovieDetailsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { toast } = useToast();
  const initialLoadRef = useRef(true);


  useEffect(() => {
    if (isNaN(movieId)) return;

    async function fetchDetailsAndUserRating() {
      setLoading(true);
      initialLoadRef.current = true;
      try {
        const details = await getMovieDetails({ id: movieId });
        setMovieDetails(details); // Always set details, even if it's the fallback
        
        if (user) {
          const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieId.toString());
          const ratingDoc = await getDoc(ratingDocRef);
          
          if (ratingDoc.exists()) {
            const data = ratingDoc.data();
            setUserRating(data.rating || 0); // Default to 0 if no rating
            setWatched(data.watched === true);
          } else {
             setUserRating(0); // No rating yet
             setWatched(false);
          }
        } else {
            setUserRating(0);
            setWatched(false);
        }
      } catch (error) {
        console.error("Failed to fetch movie data", error);
        setMovieDetails(null); // Set to null only on catastrophic error
      } finally {
        setLoading(false);
        // Use a timeout to ensure this runs after the initial state updates have settled
        setTimeout(() => {
          setIsDataLoaded(true);
          initialLoadRef.current = false;
        }, 100);
      }
    }

    if (!authLoading) {
      fetchDetailsAndUserRating();
    }

  }, [movieId, user, authLoading]);
  
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
      const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieId.toString());
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
    if (!movieDetails || userRating === 0) return;
    const success = await handleSave({ rating: userRating });
    if (success) {
      toast({
        title: 'Rating Saved!',
        description: `You rated ${movieDetails.title} ${userRating.toFixed(0)} stars.`,
      });
    }
  };

  useEffect(() => {
    // Prevent saving on the initial render cycle
    if (initialLoadRef.current || !isDataLoaded || !movieDetails) {
        return;
    }

    async function autoSaveWatched() {
        const success = await handleSave({ watched: watched });
        if (success) {
            toast({
            title: 'Watched Status Updated!',
            description: watched ? `Marked "${movieDetails.title}" as watched.` : `Marked "${movieDetails.title}" as unwatched.`,
            });
        }
    }

    // Only save if the user is logged in
    if (user) {
      autoSaveWatched();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched, isDataLoaded]);


  if (loading || authLoading || isNaN(movieId)) {
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
            alt={movieDetails.title}
            data-ai-hint={movieDetails.imageHint}
            width={400}
            height={600}
            className="w-full h-auto object-cover rounded-lg shadow-lg"
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Badge variant="secondary">{movieDetails.genre}</Badge>
          <h1 className="font-headline text-4xl font-bold tracking-tight">
            {movieDetails.title}
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
               <p className="text-sm text-muted-foreground mt-1">{userRating > 0 ? `You selected ${userRating.toFixed(0)} out of 10 stars.` : 'Rate this movie.'}</p>
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
