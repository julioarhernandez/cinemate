
"use client";

import { useState, useEffect, useCallback } from 'react';
import { AiRecommenderForm } from '@/components/ai-recommender-form';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, History } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Recommendation {
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
  const [user] = useAuthState(auth);
  const [history, setHistory] = useState<Recommendation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const historyCollection = collection(db, 'users', user.uid, 'recommendations');
      const q = query(historyCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Recommendation));
      setHistory(historyData);
    } catch (error) {
      console.error("Failed to fetch recommendation history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleNewRecommendation = () => {
    // Re-fetch history to show the new item
    fetchHistory();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          AI Movie Recommender
        </h1>
        <p className="text-muted-foreground">
          Let our AI find the perfect movie for you based on your unique tastes.
        </p>
      </div>

      <AiRecommenderForm onNewRecommendation={handleNewRecommendation} />

      <div className="space-y-4 pt-8">
        <h2 className="font-headline text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6" />
          Recommendation History
        </h2>

        {loadingHistory && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {!loadingHistory && history.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-bold tracking-tight">No history yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your past recommendations will appear here.
            </p>
          </div>
        )}

        {!loadingHistory && history.length > 0 && (
          <div className="space-y-6">
            {history.map(item => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">Based on: &quot;{item.preferences}&quot;</CardTitle>
                  <CardDescription>
                     {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.recommendations.map((rec, index) => (
                      <div key={index} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
                          <Link href={`/dashboard/movies?search=${encodeURIComponent(rec.title + ' ' + rec.year)}`}>
                            <h3 className="text-xl font-bold text-primary hover:underline">
                              {rec.title} ({rec.year})
                            </h3>
                          </Link>
                          <div>
                          <h4 className="font-headline text-sm font-semibold">Why you might like it:</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{rec.reasoning}</p>
                          </div>
                      </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
