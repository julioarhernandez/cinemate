"use client";

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { useState, useEffect, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';


const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 text-amber-400 ${
          i < Math.round(rating) ? 'fill-current' : ''
        }`}
      />
    ))}
  </div>
);

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

  useEffect(() => {
    if (!movieTitle) return;

    async function fetchDetails() {
      setLoading(true);
      try {
        const details = await getMovieDetails({ title: movieTitle });
        if (details) {
          setMovieDetails(details);
          // Set initial rating from TMDB, will be overwritten by user's if it exists
          setUserRating(details.rating);
        } else {
          setMovieDetails(null);
        }
      } catch (error) {
        console.error("Failed to fetch movie details", error);
        setMovieDetails(null);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [movieTitle]);

  useEffect(() => {
    // This effect runs when user or movieDetails state changes.
    // It's responsible for fetching the user's specific rating data from Firestore.
    if (!user || !movieTitle || !movieDetails) return;

    async function fetchUserRating() {
      try {
        const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieTitle);
        const ratingDoc = await getDoc(ratingDocRef);
        
        if (ratingDoc.exists()) {
          const data = ratingDoc.data();
          // If a user rating exists, it overwrites the default TMDB one
          setUserRating(data.rating || movieDetails.rating);
          setWatched(data.watched || false);
        } else {
           // If no rating in DB, use TMDB's as a default starting point
           setUserRating(movieDetails.rating);
           setWatched(false);
        }
      } catch (error) {
        console.error("Failed to fetch user rating", error);
      }
    }

    fetchUserRating();
  }, [user, movieTitle, movieDetails]); // Re-run when user, title, or movieDetails are available

  const handleSaveRating = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Signed In',
        description: 'You must be signed in to save a rating.',
      });
      return;
    }

    try {
      const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieTitle);
      await setDoc(ratingDocRef, { rating: userRating, watched: watched }, { merge: true });

      toast({
        title: 'Rating Saved!',
        description: `You rated ${movieTitle} ${userRating.toFixed(1)} stars.`,
      });
    } catch (error) {
      console.error('Failed to save rating:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your rating. Please try again.',
      });
    }
  };

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

          <div className="flex items-center gap-4">
            <StarRating rating={movieDetails.rating} />
            <span className="text-lg font-bold">
              {movieDetails.rating.toFixed(1)} / 5.0 (TMDB)
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
              <Label htmlFor="rating-slider" className="text-lg">Your Rating: {userRating.toFixed(1)}</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="rating-slider"
                  min={0}
                  max={5}
                  step={0.5}
                  value={[userRating]}
                  onValueChange={(value) => setUserRating(value[0])}
                  className="w-[200px]"
                />
                <Button onClick={handleSaveRating}>Save Rating</Button>
              </div>
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
