
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

export interface IncomingRecommendation {
    id: string;
    movie: MovieDetailsOutput;
    from: {
        id: string;
        name: string;
        photoURL?: string;
    };
    fromRating?: number;
    createdAt: Timestamp;
}

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [watchedCount, setWatchedCount] = useState<number | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [recommendationCount, setRecommendationCount] = useState<number | null>(null);
  const [incomingRecommendations, setIncomingRecommendations] = useState<IncomingRecommendation[]>([]);
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
                    fromRating: data.fromRating,
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
      fetchRecommendations();
    } else {
      setWatchedCount(0);
      setFriendCount(0);
      setRecommendationCount(0);
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
      <div className="relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-xl border p-6 shadow-sm">
        <Image
          src="/bg.png"
          alt="Abstract cinema background"
          data-ai-hint="abstract cinema"
          fill
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="text-white">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-white">
            Welcome back, {user?.displayName?.split(' ')[0] || 'there'}!
            </h1>
            <p className="mt-2 text-lg text-white/80">
            Here's a quick look at your MovieCircles world.
            </p>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-2">
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
                    {incomingRecommendations.slice(0, 2).map((item) => {
                        const ratingInfo = getRatingInfo(item.fromRating);
                        return (
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
                                {ratingInfo && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 text-lg cursor-default">
                                            {ratingInfo.emoji}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p><span className="font-semibold">{item.from.name}</span> rated it:</p>
                                        <p className="font-bold">{ratingInfo.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                                )}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleSaveToWatchlistAndDismiss(item)}>
                                <Bookmark className="mr-2 h-4 w-4" /> Save to Watchlist
                            </Button>
                        </div>
                        </div>
                        )
                    })}
                    </div>
                )}
            </CardContent>
        </Card>
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
    </div>
    </TooltipProvider>
  );
}
