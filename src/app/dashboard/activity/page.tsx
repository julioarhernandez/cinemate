
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Loader2, Star, ListFilter, X, Check } from 'lucide-react';
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
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([1, 5]);
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  const fetchFriendsAndActivity = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Get the user's friends list if we don't have it
      let fetchedFriends = friends;
      if (friends.length === 0) {
        const friendsRef = collection(db, 'users', user.uid, 'friends');
        const friendsSnapshot = await getDocs(friendsRef);
        fetchedFriends = friendsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as { displayName: string; photoURL?: string }),
        }));
        setFriends(fetchedFriends);
      }

      let friendsToQuery = fetchedFriends;
      if (selectedFriends.length > 0) {
        friendsToQuery = fetchedFriends.filter(f => selectedFriends.includes(f.id));
      }

      if (friendsToQuery.length === 0 && selectedFriends.length > 0) {
        setActivity([]);
        setLoading(false);
        return;
      }

      // 2. Fetch recent ratings for all friends in parallel
      let allRatings: {
        friend: User;
        movieId: string;
        mediaType: 'movie' | 'tv';
        rating: number;
        watchedAt: Timestamp;
        notes?: string;
      }[] = [];

      const ratingQueries = friendsToQuery.map(async (friend) => {
        const ratingsRef = collection(db, 'users', friend.id, 'ratings');
        // Simplified query to avoid needing a composite index
        const q = query(
          ratingsRef,
          where('watched', '==', true),
          orderBy('updatedAt', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Filter for public ratings on the client side
          if (data.isPrivate !== true) {
            allRatings.push({
              friend,
              movieId: doc.id,
              mediaType: data.mediaType || 'movie',
              rating: data.rating || 0,
              watchedAt: data.updatedAt,
              notes: data.notes || '',
            });
          }
        });
      });

      await Promise.all(ratingQueries);

      // 3. Sort all activities by date and take the most recent ones.
      allRatings.sort((a, b) => b.watchedAt.toMillis() - b.watchedAt.toMillis());
      const latestRatings = allRatings.slice(0, 20);

      // 4. Fetch movie details for the latest ratings.
      const activityWithMovieDetails = await Promise.all(
        latestRatings.map(async (rating) => {
          const movieDetails = await getMovieDetails({
            id: parseInt(rating.movieId, 10),
            mediaType: rating.mediaType,
          });
          if (movieDetails && movieDetails.title !== 'Unknown Media') {
            return {
              friend: rating.friend,
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
  }, [user, selectedFriends, toast, friends]);

  useEffect(() => {
    if (user) {
      fetchFriendsAndActivity();
    }
  }, [user, selectedFriends, fetchFriendsAndActivity]);


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

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriends(prev => {
        if (prev.includes(friendId)) {
            return prev.filter(id => id !== friendId);
        } else {
            return [...prev, friendId];
        }
    });
  };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                 <div className="space-y-2">
                    <Label htmlFor="friend-filter">Friend</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                            >
                                <span className="truncate">
                                    {selectedFriends.length === 0 && 'All Friends'}
                                    {selectedFriends.length === 1 && friends.find(f => f.id === selectedFriends[0])?.displayName}
                                    {selectedFriends.length > 1 && `${selectedFriends.length} friends selected`}
                                </span>
                                {selectedFriends.length > 0 && (
                                    <X className="ml-2 h-4 w-4 shrink-0 opacity-50" onClick={(e) => { e.stopPropagation(); setSelectedFriends([])}}/>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                           <ScrollArea className="max-h-60">
                            <div className="p-2">
                            {friends.map(friend => (
                                <div key={friend.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent" onClick={() => handleFriendSelect(friend.id)}>
                                    <Checkbox
                                        id={`friend-${friend.id}`}
                                        checked={selectedFriends.includes(friend.id)}
                                        onCheckedChange={() => handleFriendSelect(friend.id)}
                                    />
                                    <Label htmlFor={`friend-${friend.id}`} className="font-normal flex-1 cursor-pointer">{friend.displayName}</Label>
                                </div>
                            ))}
                            </div>
                           </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label>Rating: {getRatingInfo(ratingRange[0])?.emoji} to {getRatingInfo(ratingRange[1])?.emoji}</Label>
                    <Slider value={ratingRange} onValueChange={setRatingRange} min={1} max={5} step={1} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time-range-filter">Time Range</Label>
                     <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
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
              No friend activity matches your filters. Or maybe it's time to make some friends!
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
