
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AiRecommenderForm } from '@/components/ai-recommender-form';
import { Button } from '@/components/ui/button';
import { Library, History, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AiRecommendation {
  id: string;
  preferences: string;
  recommendations: {
    title: string;
    year: string;
    reasoning: string;
  }[];
  createdAt: Timestamp;
}

export default function AiRecommenderPage() {
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);
  const [recommendationHistory, setRecommendationHistory] = useState<AiRecommendation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [key, setKey] = useState(0); // Used to force a re-fetch of history

  const fetchHistory = async () => {
    if (!user) {
        setLoadingHistory(false);
        return;
    };
    setLoadingHistory(true);
    try {
        const historyCollection = collection(db, 'users', user.uid, 'recommendations');
        const historyQuery = query(historyCollection, orderBy('createdAt', 'desc'), limit(5));
        const historySnapshot = await getDocs(historyQuery);
        const historyData = historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as AiRecommendation));
        setRecommendationHistory(historyData);
    } catch (error) {
        console.error("Failed to fetch recommendation history:", error);
        toast({ variant: 'destructive', title: 'Could not load history.' });
    } finally {
        setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchHistory();
    }
  }, [user, authLoading, key]);

  const handleNewRecommendation = () => {
    toast({
        title: "Recommendation Saved!",
        description: "Your new recommendation has been saved to your library.",
    });
    // Increment key to trigger a re-fetch of the history
    setKey(prevKey => prevKey + 1);
  };
  
  const handleDeleteRecommendation = async (recommendationId: string) => {
    if (!user) return;
    try {
      const recDocRef = doc(db, 'users', user.uid, 'recommendations', recommendationId);
      await deleteDoc(recDocRef);
      setRecommendationHistory(prev => prev.filter(r => r.id !== recommendationId));
      toast({ title: 'Recommendation deleted.' });
    } catch (error) {
      console.error('Failed to delete recommendation:', error);
      toast({ variant: 'destructive', title: 'Could not delete recommendation.' });
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
            AI Movie Recommender
            </h1>
            <p className="text-muted-foreground">
            Let our AI find the perfect movie for you based on your unique tastes.
            </p>
        </div>
        <Button asChild>
            <Link href="/dashboard/collections?tab=ai-recommendations">
                <Library className="mr-2 h-4 w-4" />
                View Full Library
            </Link>
        </Button>
      </div>

      <AiRecommenderForm onNewRecommendation={handleNewRecommendation} />
      
      <div className="space-y-4 pt-8">
        <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-muted-foreground" />
            <h2 className="font-headline text-2xl font-bold tracking-tight">Recent Suggestions</h2>
        </div>

        {loadingHistory ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : recommendationHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                <h3 className="text-xl font-bold tracking-tight">No history yet</h3>
                <p className="text-sm text-muted-foreground mt-2">Your past AI recommendations will appear here.</p>
            </div>
        ) : (
            <div className="grid gap-6">
                {recommendationHistory.map(item => (
                    <Card key={item.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">Based on: &quot;{item.preferences}&quot;</CardTitle>
                            <CardDescription>{formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        {item.recommendations.map((rec, index) => (
                            <div key={index} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
                                <Link href={`/dashboard/movies?search=${encodeURIComponent(rec.title)}&year=${rec.year}`}>
                                    <h3 className="text-xl font-bold text-primary hover:underline">{rec.title} ({rec.year})</h3>
                                </Link>
                                <div>
                                    <h4 className="font-headline text-sm font-semibold">Why you might like it:</h4>
                                    <p className="mt-1 text-sm text-muted-foreground">{rec.reasoning}</p>
                                </div>
                            </div>
                        ))}
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete this AI recommendation from your history.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDeleteRecommendation(item.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )}
      </div>

    </div>
  );
}
