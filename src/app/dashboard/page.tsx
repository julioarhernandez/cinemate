
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
  Star,
  Gift,
  Bookmark,
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
import { collection, query, where, getCountFromServer, getDocs, orderBy, limit, Timestamp, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getRatingInfo } from '@/lib/ratings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface FriendActivityItem {
  friend: { id: string; displayName: string; photoURL?: string; };
  movie: MovieDetailsOutput;
  rating: number;
  watchedAt: Timestamp;
}

export interface IncomingRecommendation {
    id: string;
    movie: MovieDetailsOutput;
    from: {
        id: string;
        name: string;
        photoURL?: string;
    };
    createdAt: Timestamp;
}

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [watchedCount, setWatchedCount] = useState<number | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [recommendationCount, setRecommendationCount] = useState<number | null>(null);
  const [friendActivity, setFriendActivity] = useState<FriendActivityItem[]>([]);
  const [incomingRecommendations, setIncomingRecommendations] = useState<IncomingRecommendation[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const { toast } = useToast();

  const handleSaveToWatchlistAndDismiss = async (recommendation: IncomingRecommendation) => {
    if (!user) return;
    try {
      // 1. Add to watchlist
      const ratingDocRef = doc(db, 'users', user.uid, 'ratings', recommendation.movie.id.toString());
      await setDoc(ratingDocRef, { 
        watchlist: true, 
        mediaType: recommendation.movie.mediaType,
        updatedAt: serverTimestamp() 
      }, { merge: true });

      // 2. Dismiss recommendation
      const recDocRef = doc(db, 'users', user.uid, 'incomingRecommendations', recommendation.id);
      await deleteDoc(recDocRef);

      // 3. Update UI state
      setIncomingRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
      
      toast({ 
        title: 'Saved to Watchlist!',
        description: `"${recommendation.movie.title}" has been added to your watchlist.`,
      });

    } catch (error) {
      console.error('Failed to save to watchlist and dismiss:', error);
      toast({ variant: 'destructive', title: 'Action failed. Please try again.' });
    }
  };

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
          const snapshot = await getCountFromServer(friendsCol);
          setFriendCount(snapshot.data().count);
        } catch (error) {
          console.error("Error fetching friend count: ", error);
          setFriendCount(0);
        }
      }
      
      const getRecommendationCount = async () => {
        try {
            const recommendationsCol = collection(db, 'users', user.uid, 'sentRecommendations');
            const snapshot = await getCountFromServer(recommendationsCol);
            setRecommendationCount(snapshot.data().count);
        } catch (error) {
            console.error("Error fetching recommendation count: ", error);
            setRecommendationCount(0);
        }
      };

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
            ...(doc.data() as { displayName: string; photoURL?: string }),
          }));

          if (friends.length === 0) {
            setFriendActivity([]);
            setLoadingActivity(false);
            return;
          }

          // 2. Fetch recent ratings for all friends
          let allRatings: {
            friend: { id: string; displayName: string; photoURL?: string };
            movieId: string;
            mediaType: 'movie' | 'tv';
            rating: number;
            watchedAt: Timestamp;
          }[] = [];

          for (const friend of friends) {
            const ratingsRef = collection(db, 'users', friend.id, 'ratings');
            // Simplified query to avoid composite index requirement
            const q = query(
              ratingsRef,
              where('watched', '==', true),
              orderBy('updatedAt', 'desc'),
              limit(20) 
            );
            const ratingsSnapshot = await getDocs(q);

            ratingsSnapshot.forEach((doc) => {
              const data = doc.data();
              // Filter in the code instead of in the query
              if (data.isPrivate !== true) {
                 allRatings.push({
                    friend: { id: friend.id, displayName: friend.displayName, photoURL: friend.photoURL },
                    movieId: doc.id,
                    mediaType: data.mediaType || 'movie', // Default to movie for older records
                    rating: data.rating || 0,
                    watchedAt: data.updatedAt,
                });
              }
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
                mediaType: rating.mediaType,
              });
              return {
                friend: rating.friend,
                movie: movieDetails,
                rating: rating.rating,
                watchedAt: rating.watchedAt,
              };
            })
          );
          
          // Filter out any movies that couldn't be found
          const finalActivity = activityWithMovieDetails.filter(item => item.movie && item.movie.title !== 'Unknown Media');
          
          setFriendActivity(finalActivity as FriendActivityItem[]);

        } catch (error) {
          console.error("Error fetching friend activity: ", error);
          setFriendActivity([]);
        } finally {
          setLoadingActivity(false);
        }
      }

      const fetchRecommendations = async () => {
        setLoadingRecs(true);
        if (!user) {
            setLoadingRecs(false);
            return;
        }

        try {
            const recsRef = collection(db, 'users', user.uid, 'incomingRecommendations');
            const q = query(recsRef, orderBy('createdAt', 'desc'), limit(10));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setIncomingRecommendations([]);
                setLoadingRecs(false);
                return;
            }

            const recommendationsPromises = snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const movieDetails = await getMovieDetails({
                    id: data.movieId,
                    mediaType: data.mediaType || 'movie',
                });
                
                if (!movieDetails || movieDetails.title === 'Unknown Media') {
                    return null;
                }

                return {
                    id: doc.id,
                    movie: movieDetails,
                    from: {
                        id: data.fromId,
                        name: data.fromName,
                        photoURL: data.fromPhotoURL,
                    },
                    createdAt: data.createdAt,
                };
            });

            const recommendations = await Promise.all(recommendationsPromises);
            
            // Filter out any null results (e.g., movie not found)
            const validRecommendations = recommendations.filter((rec): rec is IncomingRecommendation => rec !== null);
            setIncomingRecommendations(validRecommendations);

        } catch (error) {
            console.error("Error fetching incoming recommendations:", error);
            setIncomingRecommendations([]);
        } finally {
          setLoadingRecs(false);
        }
      }


      getWatchedCount();
      getFriendCount();
      getRecommendationCount();
      fetchFriendActivity();
      fetchRecommendations();
    } else {
      setWatchedCount(0);
      setFriendCount(0);
      setRecommendationCount(0);
      setLoadingActivity(false);
      setLoadingRecs(false);
    }
  }, [user]);

  const stats = [
    {
      title: 'Movies Watched',
      value: watchedCount,
      icon: Film,
      color: 'text-sky-500',
      href: '/dashboard/collections',
    },
    {
      title: 'Friends',
      value: friendCount,
      icon: Users,
      color: 'text-amber-500',
      href: '/dashboard/friends',
    },
    {
      title: 'Sent Recommendations',
      value: recommendationCount,
      icon: Gift,
      color: 'text-violet-500',
      href: '/dashboard/collections?tab=my-recommendations',
    },
  ];

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Welcome back, {user?.displayName?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Here's a quick look at your MovieCircles world.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.title}>
            <Card className="hover:bg-muted/50 transition-colors">
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
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                  {friendActivity.map((item) => {
                    const ratingInfo = getRatingInfo(item.rating);
                    return (
                        <div key={`${item.friend.id}-${item.movie.id}`} className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={item.friend.photoURL} alt={item.friend.displayName} />
                            <AvatarFallback>{item.friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                            <span className="font-bold text-foreground">{item.friend.displayName}</span>
                            {' '}watched{' '}
                            <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`} className="block font-bold hover:underline">{item.movie.title}</Link>
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
                        </div>
                        <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`}>
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
                    )
                  })}
                </div>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recommended For You</CardTitle>
            <CardDescription>
              Movies your friends think you'd like.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {loadingRecs ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
             ) : !incomingRecommendations || incomingRecommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No new recommendations.</p>
                    <p className="text-sm">Recommendations from friends will appear here.</p>
                </div>
             ) : (
                <div className="space-y-4">
                  {incomingRecommendations.map((item) => (
                    <div key={item.id} className="flex items-start gap-4">
                       <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`} className="flex-shrink-0">
                        <Image
                            src={item.movie.imageUrl}
                            alt={item.movie.title}
                            data-ai-hint={item.movie.imageHint}
                            width={56}
                            height={84}
                            className="rounded-sm object-cover aspect-[2/3]"
                          />
                      </Link>
                      <div className="flex-1">
                        <Link href={`/dashboard/movies/${item.movie.id}?type=${item.movie.mediaType}`} className="font-bold hover:underline">{item.movie.title}</Link>
                        <div className="text-xs text-muted-foreground mt-1 mb-2">
                            <span>{formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}</span>
                        </div>
                        <div className="text-sm flex items-center gap-2 mb-3">
                           <Avatar className="h-6 w-6">
                              <AvatarImage src={item.from.photoURL} alt={item.from.name} />
                              <AvatarFallback>{item.from.name?.charAt(0) ?? 'U'}</AvatarFallback>
                           </Avatar>
                           <p>From <span className="font-semibold">{item.from.name}</span></p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleSaveToWatchlistAndDismiss(item)}>
                            <Bookmark className="mr-2 h-4 w-4" /> Save to Watchlist
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </CardContent>
        </Card>
      </div>

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
                <Film className="mr-2 h-4 w-4" /> Browse Movies/Shows
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard/ai-recommender">
                <Sparkles className="mr-2 h-4 w-4" /> Get AI Suggestion
              </Link>
            </Button>
          </CardContent>
        </Card>
    </div>
    </TooltipProvider>
  );
}
