
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Loader2, Star, ListFilter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/ai/schemas/user-schemas';
import type { FriendActivityItem } from '@/ai/schemas/friend-activity-schemas';
import { getFriends } from '@/ai/flows/get-friends';
import { getFriendActivity } from '@/ai/flows/get-friend-activity';


export default function ActivityPage() {
  const [user, authLoading] = useAuthState(auth);
  const [activity, setActivity] = useState<FriendActivityItem[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Filter states
  const [selectedFriend, setSelectedFriend] = useState<'all' | string>('all');
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[Activity Page] Fetching friends...');
      const friendsResult = await getFriends({ userId: user.uid });
      console.log('[Activity Page] Fetched friends list:', friendsResult.friends);
      setFriends(friendsResult.friends);
    } catch (error) {
      console.error("Failed to fetch friends:", error);
      toast({ variant: 'destructive', title: 'Could not load friends list.' });
    }
  }, [user, toast]);

  const fetchActivity = useCallback(async () => {
    if (!user || friends.length === 0) {
        if (!user) console.log('[Activity Page] Skipping fetchActivity: no user.');
        if (friends.length === 0) console.log('[Activity Page] Skipping fetchActivity: no friends.');
        setLoading(false);
        setActivity([]);
        return;
    };
    setLoading(true);
    try {
      const activityResult = await getFriendActivity({
        userId: user.uid,
        friendId: selectedFriend === 'all' ? undefined : selectedFriend,
      });
      setActivity(activityResult.activity);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
      toast({ variant: 'destructive', title: 'Could not load friend activity.' });
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedFriend, toast, friends]);

  // Effect to fetch the initial list of friends
  useEffect(() => {
    if (user) {
        fetchFriends();
    }
  }, [user, fetchFriends]);

  // Effect to fetch activity whenever the selected friend filter changes,
  // or when the initial friends list is loaded.
  useEffect(() => {
    if (user) {
        fetchActivity();
    }
  }, [user, selectedFriend, friends, fetchActivity]);


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
             <Collapsible>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 animate-in fade-in-0 zoom-in-95">
                <div className="rounded-lg border p-4 grid md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <Label>Friend</Label>
                        <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a friend" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Friends</SelectItem>
                                {friends.map(friend => (
                                    <SelectItem key={friend.id} value={friend.id}>{friend.displayName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Rating: {ratingRange[0]} - {ratingRange[1]} stars</Label>
                        <Slider value={ratingRange} onValueChange={(value) => setRatingRange(value as [number, number])} max={10} step={1} />
                    </div>
                    <div className="space-y-2">
                        <Label>Time Range</Label>
                         <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
                            <SelectTrigger>
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
              </CollapsibleContent>
            </Collapsible>
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
          {filteredActivity.map((item) => (
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
                        {item.rating > 0 && (
                        <>
                            <span>&middot;</span>
                            <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span>{item.rating}</span>
                            </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
