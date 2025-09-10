
"use client";

import { useState, useEffect } from 'react';
import { EyeOff, Star, Bookmark } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { Skeleton } from './ui/skeleton';

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
  const [isPrivate, setIsPrivate] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieId.toString());
        const ratingDoc = await getDoc(ratingDocRef);
        
        if (ratingDoc.exists()) {
          const data = ratingDoc.data();
          setUserRating(data.rating || 0);
          setWatched(data.watched === true);
          setIsPrivate(data.isPrivate === true);
          setInWatchlist(data.watchlist === true);
        }
      }
      setIsDataLoaded(true);
    }
    
    if (!authLoading) {
      fetchUserData();
    }
  }, [movieId, user, authLoading]);

  const handleSave = async (dataToSave: { rating?: number; watched?: boolean; isPrivate?: boolean, watchlist?: boolean }) => {
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
      // Always include the mediaType and an updatedAt timestamp
      const dataWithTimestamp = { ...dataToSave, mediaType: movieDetails.mediaType, updatedAt: serverTimestamp() };
      await setDoc(ratingDocRef, dataWithTimestamp, { merge: true });
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
    // Saving a rating implies it's watched and removes it from the watchlist
    const success = await handleSave({ rating: userRating, watched: true, watchlist: false });
    if (success) {
      setWatched(true);
      setInWatchlist(false);
      toast({
        title: 'Rating Saved!',
        description: `You rated ${movieDetails.title} ${userRating.toFixed(0)} stars.`,
      });
    }
  };

  const handleWatchedChange = async (newWatchedState: boolean) => {
    setWatched(newWatchedState);
    const dataToSave: { watched: boolean; rating?: number, isPrivate?: boolean, watchlist?: boolean } = { watched: newWatchedState };
    if (!newWatchedState) {
        dataToSave.rating = 0; // Reset rating if marked as unwatched
        dataToSave.isPrivate = false; // Reset privacy if unwatched
        setUserRating(0);
        setIsPrivate(false);
    } else {
        // If marking as watched, remove from watchlist
        dataToSave.watchlist = false;
        setInWatchlist(false);
    }
    const success = await handleSave(dataToSave);
     if (success) {
        toast({
        title: 'Watched Status Updated!',
        description: newWatchedState ? `Marked "${movieDetails.title}" as watched.` : `Marked "${movieDetails.title}" as unwatched.`,
        });
    }
  };

  const handlePrivacyChange = async (newPrivateState: boolean) => {
    setIsPrivate(newPrivateState);
    // Marking private implies it's watched and removes from watchlist
    const success = await handleSave({ isPrivate: newPrivateState, watched: true, watchlist: false });
    if (success) {
        setWatched(true); 
        setInWatchlist(false);
        toast({
            title: 'Privacy Setting Updated!',
            description: newPrivateState
            ? `"${movieDetails.title}" is now private.`
            : `"${movieDetails.title}" is now public.`,
        });
    }
  };

  const handleWatchlistToggle = async () => {
    const newWatchlistState = !inWatchlist;
    // Cannot be in watchlist if already watched
    if (watched) {
         toast({
            variant: 'destructive',
            title: 'Already Watched',
            description: 'You cannot add a watched movie to your watchlist.',
        });
        return;
    }
    setInWatchlist(newWatchlistState);
    const success = await handleSave({ watchlist: newWatchlistState });
    if (success) {
        toast({
            title: `"${movieDetails.title}" ${newWatchlistState ? 'added to' : 'removed from'} your watchlist.`,
        });
    }
  };


  if (authLoading || !isDataLoaded) {
    return <div className="space-y-6 pt-4">
      <div className="flex items-center space-x-4">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24 rounded-md" />
        <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-80 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    </div>
  }

  return (
    <div className="pt-6 border-t mt-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="flex items-center space-x-2">
                <Switch id="watched-toggle" checked={watched} onCheckedChange={handleWatchedChange} />
                <Label htmlFor="watched-toggle" className="text-lg">
                Watched
                </Label>
            </div>
            {watched && (
                <div className="flex items-center space-x-2 animate-in fade-in-50">
                    <Switch id="private-toggle" checked={isPrivate} onCheckedChange={handlePrivacyChange} />
                    <Label htmlFor="private-toggle" className="text-lg flex items-center gap-2">
                        <EyeOff className="h-4 w-4"/> Make Private
                    </Label>
                </div>
            )}
        </div>

        <Button
            onClick={handleWatchlistToggle}
            variant={inWatchlist ? "secondary" : "outline"}
            disabled={watched}
        >
            <Bookmark className={`mr-2 h-4 w-4 ${inWatchlist ? "fill-primary" : ""}`} />
            {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </Button>


      {watched && (
        <div className="animate-in fade-in-50">
          <Label className="text-lg">Your Rating</Label>
          <div className="flex flex-col items-start gap-4 mt-2 sm:flex-row sm:items-center">
            <StarRatingInput rating={userRating} setRating={setUserRating} />
            <Button onClick={handleSaveRating} disabled={userRating === 0}>Save Rating</Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{userRating > 0 ? `You selected ${userRating.toFixed(0)} out of 10 stars.` : 'Select a rating to save.'}</p>
        </div>
      )}
    </div>
  );
}
