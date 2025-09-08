
"use client";

import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { MovieDetailsOutput } from '@/ai/flows/get-movie-details';

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

export function MovieDetailsClient({ movieDetails, movieId }: { movieDetails: MovieDetailsOutput, movieId: number }) {
  const [user, authLoading] = useAuthState(auth);
  const [watched, setWatched] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUserRating() {
      if (user) {
        const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieId.toString());
        const ratingDoc = await getDoc(ratingDocRef);
        
        if (ratingDoc.exists()) {
          const data = ratingDoc.data();
          setUserRating(data.rating || 0);
          setWatched(data.watched === true);
        }
      }
      setIsDataLoaded(true);
    }
    
    if (!authLoading) {
      fetchUserRating();
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
    if (userRating === 0) return;
    const success = await handleSave({ rating: userRating });
    if (success) {
      toast({
        title: 'Rating Saved!',
        description: `You rated ${movieDetails.title} ${userRating.toFixed(0)} stars.`,
      });
    }
  };

  const handleWatchedChange = async (newWatchedState: boolean) => {
    setWatched(newWatchedState);
    const success = await handleSave({ watched: newWatchedState });
     if (success) {
        toast({
        title: 'Watched Status Updated!',
        description: newWatchedState ? `Marked "${movieDetails.title}" as watched.` : `Marked "${movieDetails.title}" as unwatched.`,
        });
    }
  };

  if (authLoading || !isDataLoaded) {
    return <div className="space-y-6 pt-4">
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
    </div>
  }

  return (
    <div className="pt-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Switch id="watched-toggle" checked={watched} onCheckedChange={handleWatchedChange} />
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
  );
}
