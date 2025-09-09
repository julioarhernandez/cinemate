
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  Clapperboard,
  Film,
  Users,
  Sparkles,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface FriendActivityItem {
  friend: { id: string; displayName: string; photoURL?: string; };
  movie: MovieDetailsOutput;
  watchedAt: Timestamp;
}

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [watchedCount, setWatchedCount] = useState<number | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [friendActivity, setFriendActivity] = useState<FriendActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    if (user) {
      const getWatchedCount = async () => {
        try {
          const ratingsCol = collection(db, 'users', user.uid, 'ratings');
          const q = query(ratingsCol, where('watched', '==', true));
          const snapshot = await getCountFromServer(q);
          setWatchedCount(snapshot.data().count);
        } catch (error) {
          console.error("Error fetching watched movies count: ", error);
          setWatchedCount(0);
        }
      };

      const getFriendCount = async () => {
        try {
          const friendsCol = collection(db, 'users', user.uid, 'friends');
          const snapshot = await getDocs(friendsCol);
          setFriendCount(snapshot.size);
        } catch (error) {
          console.error("Error fetching friend count: ", error);
          setFriendCount(0);
        }
      }

      const fetchFriendActivity = async () => {
        setLoadingActivity(true);
        if (!user) {
          setLoadingActivity(false);
          return;
        }
        
        try {
          // 1. Get the user's friends
          const friendsRef = collection(db, 'users', user.uid, 'friends');
          const friendsSnapshot = await getDocs(friendsRef);
          const friends = friendsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (friends.length === 0) {
            setFriendActivity([]);
            setLoadingActivity(false);
            return;
          }

          // 2. Fetch recent ratings for all friends
          let allRatings: {
            friend: { id: string; displayName: string };
            movieId: string;
            watchedAt: Timestamp;
          }[] = [];

          for (const friend of friends) {
            const ratingsRef = collection(db, 'users', friend.id, 'ratings');
            const q = query(
              ratingsRef,
              where('watched', '==', true),
              where('isPrivate', '==', false),
              orderBy('updatedAt', 'desc'),
              limit(10) // Get the last 10 activities per friend to keep it manageable
            );
            const ratingsSnapshot = await getDocs(q);

            ratingsSnapshot.forEach((doc) => {
              const data = doc.data();
              allRatings.push({
                friend: { id: friend.id, displayName: friend.displayName },
                movieId: doc.id,
                watchedAt: data.updatedAt,
              });
            });
          }

          // 3. Sort all activities by date and take the latest 10
          allRatings.sort((a, b) => b.watchedAt.toMillis() - a.watchedAt.toMillis());
          const latestRatings = allRatings.slice(0, 10);

          // 4. Fetch movie details for the latest 10
          const activityWithMovieDetails = await Promise.all(
            latestRatings.map(async (rating) => {
              const movieDetails = await getMovieDetails({
                id: parseInt(rating.movieId, 10),
              });
              return {
                friend: rating.friend,
                movie: movieDetails,
                watchedAt: rating.watchedAt,
              };
            })
          );
          
          // Filter out any movies that couldn't be found
          const finalActivity = activityWithMovieDetails.filter(item => item.movie && item.movie.title !== 'Unknown Movie');
          
          setFriendActivity(finalActivity as FriendActivityItem[]);

        } catch (error) {
          console.error("Error fetching friend activity: ", error);
          setFriendActivity([]);
        } finally {
          setLoadingActivity(false);
        }
      }

      getWatchedCount();
      getFriendCount();
      fetchFriendActivity();
    } else {
      setWatchedCount(0);
      setFriendCount(0);
      setLoadingActivity(false);
    }
  }, [user]);

  const stats = [
    {
      title: 'Movies Watched',
      value: watchedCount,
      icon: Film,
      color: 'text-sky-500',
    },
    {
      title: 'Friends',
      value: friendCount,
      icon: Users,
      color: 'text-amber-500',
    },
    {
      title: 'AI Recommendations',
      value: '5', // This can be made dynamic later
      icon: Sparkles,
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Welcome back, {user?.displayName?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Here's a quick look at your CineMate world.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value === null ? (
                   <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Start a New Journey</CardTitle>
            <CardDescription>
              Ready for your next movie night?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Button asChild className="w-full">
              <Link href="/dashboard/movies">
                <Film className="mr-2 h-4 w-4" /> Browse Movies
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard/ai-recommender">
                <Sparkles className="mr-2 h-4 w-4" /> Get AI Suggestion
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Friend Activity</CardTitle>
            <CardDescription>
              See what your friends have been watching recently.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {loadingActivity ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
             ) : !friendActivity || friendActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No friend activity yet.</p>
                    <p className="text-sm">Once your friends watch movies, they'll show up here.</p>
                </div>
             ) : (
                <div className="space-y-4">
                  {friendActivity.map((item) => (
                    <div key={`${item.friend.id}-${item.movie.id}`} className="flex items-start gap-4">
                      <Avatar className="h-10 w-10 border">
                         <AvatarImage src={item.friend.photoURL} alt={item.friend.displayName} />
                         <AvatarFallback>{item.friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-bold text-foreground">{item.friend.displayName}</span>
                          {' '}watched{' '}
                          <Link href={`/dashboard/movies/${item.movie.id}`} className="font-bold text-foreground hover:underline">{item.movie.title}</Link>
                        </p>
                        <p className="text-xs text-muted-foreground">
                           {formatDistanceToNow(item.watchedAt.toDate(), { addSuffix: true })}
                        </p>
                      </div>
                       <Link href={`/dashboard/movies/${item.movie.id}`}>
                        <Image
                            src={item.movie.imageUrl}
                            alt={item.movie.title}
                            data-ai-hint={item.movie.imageHint}
                            width={40}
                            height={60}
                            className="rounded-sm object-cover aspect-[2/3]"
                          />
                      </Link>
                    </div>
                  ))}
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
