
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Loader2, Star, ListFilter, X, Check, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, Timestamp } from 'firebase/firestore';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRatingInfo } from '@/lib/ratings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
  id: string;
  displayName?: string;
  photoURL?: string;
}

interface FriendActivityItem {
  friend: User;
  movie: MovieDetailsOutput;
  rating: number;
  watchedAt: Timestamp;
  notes?: string;
}

export default function ActivityPage() {
  const [user, authLoading] = useAuthState(auth);
  const [activity, setActivity] = useState<FriendActivityItem[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Filter states
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [ratingRange, setRatingRange] = useState<[number, number]>([1, 5]);
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  // Staged filter states for form submission
  const [stagedSelectedFriend, setStagedSelectedFriend] = useState<string | null>(null);
  const [stagedRatingRange, setStagedRatingRange] = useState<[number, number]>([1, 5]);
  const [stagedTimeRange, setStagedTimeRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
        const friendsRef = collection(db, 'users', user.uid, 'friends');
        const friendsSnapshot = await getDocs(friendsRef);
        const fetchedFriends = friendsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as { displayName: string; photoURL?: string }),
        }));
        setFriends(fetchedFriends);
    } catch (error) {
        console.error("Failed to fetch friends:", error);
        toast({ variant: 'destructive', title: 'Could not load friends list.' });
    } finally {
        setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const fetchActivity = useCallback(async () => {
    if (!user || !selectedFriend) {
      setActivity([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const friendToQuery = friends.find(f => f.id === selectedFriend);

      if (!friendToQuery) {
        setActivity([]);
        setLoading(false);
        return;
      }

      let ratings: {
        movieId: string;
        mediaType: 'movie' | 'tv';
        rating: number;
        watchedAt: Timestamp;
        notes?: string;
      }[] = [];

      const ratingsRef = collection(db, 'users', friendToQuery.id, 'ratings');
      let q = query(
        ratingsRef,
        where('watched', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isPrivate !== true) {
          ratings.push({
            movieId: doc.id,
            mediaType: data.mediaType || 'movie',
            rating: data.rating || 0,
            watchedAt: data.updatedAt,
            notes: data.notes || '',
          });
        }
      });
      
      const activityWithMovieDetails = await Promise.all(
        ratings.map(async (rating) => {
          const movieDetails = await getMovieDetails({
            id: parseInt(rating.movieId, 10),
            mediaType: rating.mediaType,
          });
          if (movieDetails && movieDetails.title !== 'Unknown Media') {
            return {
              friend: friendToQuery,
              movie: movieDetails,
              rating: rating.rating,
              watchedAt: rating.watchedAt,
              notes: rating.notes,
            };
          }
          return null;
        })
      );
      
      const finalActivity = activityWithMovieDetails.filter((item): item is FriendActivityItem => item !== null);
      setActivity(finalActivity);

    } catch (error) {
      console.error("Failed to fetch activity:", error);
      toast({ variant: 'destructive', title: 'Could not load friend activity.' });
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [user, friends, selectedFriend, toast]);
  
  const handleApplyFilters = () => {
    setSelectedFriend(stagedSelectedFriend);
    setRatingRange(stagedRatingRange);
    setTimeRange(stagedTimeRange);
  };

  useEffect(() => {
    if (selectedFriend) {
      fetchActivity();
    } else {
      setActivity([]);
    }
  }, [selectedFriend, fetchActivity]);


  const filteredActivity = useMemo(() => {
    return activity.filter(item => {
      // Rating filter
      if (item.rating > 0 && (item.rating < ratingRange[0] || item.rating > ratingRange[1])) {
        return false;
      }
      
      // Time range filter
      if (timeRange !== 'all') {
        const activityDate = item.watchedAt.toDate();
        const now = new Date();
        let startDate = new Date();
        
        if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
        if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
        if (timeRange === 'year') startDate.setFullYear(now.getFullYear() - 1);

        if (activityDate < startDate) {
            return false;
        }
      }

      return true;
    });
  }, [activity, ratingRange, timeRange]);

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Friend Activity
        </h1>
        <p className="text-muted-foreground">
          See what your friends have been watching recently.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                 <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="friend-filter">Friend</Label>
                     <Select value={stagedSelectedFriend || ''} onValueChange={(value) => setStagedSelectedFriend(value)}>
                        <SelectTrigger id="friend-filter">
                            <SelectValue placeholder="Select a friend" />
                        </SelectTrigger>
                        <SelectContent>
                            {friends.map(friend => (
                                <SelectItem key={friend.id} value={friend.id}>{friend.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2 md:col-span-1">
                    <Label>Rating: {getRatingInfo(stagedRatingRange[0])?.emoji} to {getRatingInfo(stagedRatingRange[1])?.emoji}</Label>
                    <Slider value={stagedRatingRange} onValueChange={(value) => setStagedRatingRange(value as [number, number])} min={1} max={5} step={1} />
                </div>
                <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="time-range-filter">Time Range</Label>
                     <Select value={stagedTimeRange} onValueChange={(value) => setStagedTimeRange(value as any)}>
                        <SelectTrigger id="time-range-filter">
                            <SelectValue placeholder="Select a time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="week">Past Week</SelectItem>
                            <SelectItem value="month">Past Month</SelectItem>
                            <SelectItem value="year">Past Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-1">
                  <Button onClick={handleApplyFilters} className="w-full" disabled={!stagedSelectedFriend}>
                    <Search className="mr-2 h-4 w-4" />
                    Apply Filters
                  </Button>
                </div>
            </div>
        </CardContent>
      </Card>

      {authLoading || loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredActivity.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">No Activity Found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {!selectedFriend ? "Select a friend and apply filters to see their activity." : "No friend activity matches your filters. Or maybe it's time to make some friends!"}
            </p>
             <Button asChild className="mt-4">
              <Link href="/dashboard/friends">Manage Friends</Link>
            </Button>
          </div>
      ) : (
        <div className="space-y-6">
          {filteredActivity.map((item) => {
            const ratingInfo = getRatingInfo(item.rating);
            return (
                <Card key={`${item.friend.id}-${item.movie.id}-${item.watchedAt.seconds}`} className="p-4">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={item.friend.photoURL} alt={item.friend.displayName} />
                            <AvatarFallback>{item.friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                        <p className="text-sm">
                            <span className="font-bold">{item.friend.displayName}</span>
                            {' '}watched{' '}
                            <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`} className="font-bold hover:underline">{item.movie.title}</Link>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDistanceToNow(item.watchedAt.toDate(), { addSuffix: true })}</span>
                            {ratingInfo && (
                            <>
                                <span>&middot;</span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 text-lg cursor-default">
                                            {ratingInfo.emoji}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-bold">{ratingInfo.label}</p>
                                        <p>{ratingInfo.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </>
                            )}
                        </div>
                        {item.notes && <p className="text-sm text-muted-foreground mt-2 pl-4 border-l-2">{item.notes}</p>}
                        </div>
                        <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`}>
                        <Image
                            src={item.movie.imageUrl}
                            alt={item.movie.title}
                            data-ai-hint={item.movie.imageHint}
                            width={64}
                            height={96}
                            className="rounded-sm object-cover aspect-[2/3]"
                            />
                        </Link>
                    </div>
                </Card>
            )
          })}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
