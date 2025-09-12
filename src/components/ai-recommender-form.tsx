
"use client";

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Bot, Loader2, Sparkles, Library } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';

import {
  recommendMovie,
  type RecommendMovieOutput,
} from '@/ai/flows/ai-movie-recommendation';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { MovieSelectionDialog } from './movie-selection-dialog';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';


const formSchema = z.object({
  userPreferences: z
    .string()
    .min(1, 'Please list some movies or genres you like.')
    .describe(
      'A list of movies or genres that the user likes.'
    ),
});

interface AiRecommenderFormProps {
  onNewRecommendation: () => void;
}

export function AiRecommenderForm({ onNewRecommendation }: AiRecommenderFormProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [result, setResult] = useState<RecommendMovieOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userPreferences: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not signed in',
            description: 'You need to be signed in to get recommendations.',
        });
        return;
    }
    setLoading(true);
    setResult(null);
    try {
      // Fetch watched and watchlist movies to exclude them from recommendations
      const ratingsCollection = collection(db, 'users', user.uid, 'ratings');
      const watchedQuery = query(ratingsCollection, where('watched', '==', true));
      const watchlistQuery = query(ratingsCollection, where('watchlist', '==', true));

      const [watchedSnapshot, watchlistSnapshot] = await Promise.all([
        getDocs(watchedQuery),
        getDocs(watchlistQuery),
      ]);

      const watchedMovieIds = watchedSnapshot.docs.map(doc => ({ id: parseInt(doc.id), mediaType: doc.data().mediaType || 'movie' }));
      const watchlistMovieIds = watchlistSnapshot.docs.map(doc => ({ id: parseInt(doc.id), mediaType: doc.data().mediaType || 'movie' }));

      const watchedMovieDetails = await Promise.all(watchedMovieIds.map(m => getMovieDetails({ id: m.id, mediaType: m.mediaType })));
      const watchlistMovieDetails = await Promise.all(watchlistMovieIds.map(m => getMovieDetails({ id: m.id, mediaType: m.mediaType })));

      const watchedMovieTitles = watchedMovieDetails.map(m => m.title).filter(Boolean);
      const watchlistMovieTitles = watchlistMovieDetails.map(m => m.title).filter(Boolean);


      const recommendation = await recommendMovie({
        ...values,
        watchedMovies: watchedMovieTitles,
        watchlistMovies: watchlistMovieTitles,
      });

      setResult(recommendation);

      // Save the recommendation to Firestore
      const recommendationsCollection = collection(db, 'users', user.uid, 'recommendations');
      await addDoc(recommendationsCollection, {
        preferences: values.userPreferences,
        recommendations: recommendation.recommendations,
        createdAt: serverTimestamp(),
      });
      
      onNewRecommendation();
      form.reset();

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description:
          'Failed to get recommendation. Please check your input and try again.',
      });
    } finally {
      setLoading(false);
    }
  }
  
  const handleSelectMovies = (selectedMovies: {id: number, title: string}[]) => {
    const currentPrefs = form.getValues('userPreferences');
    const newTitles = selectedMovies.map(m => m.title).join(', ');
    
    // Append with a comma if there's existing text
    const newValue = currentPrefs ? `${currentPrefs}, ${newTitles}` : newTitles;
    form.setValue('userPreferences', newValue, { shouldValidate: true });

     toast({
        title: 'Movies Added!',
        description: `Added ${selectedMovies.length} movie(s) to your preferences.`,
      });
  };


  return (
    <>
      <MovieSelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelectMovies={handleSelectMovies}
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="userPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Favorite Movies & Genres</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., The Matrix, Sci-Fi, Thrillers, Inception, Parasite"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    List movies or genres you like, or select from your library.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Recommendation
                  </>
                )}
              </Button>
               <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(true)} disabled={loading} className="w-full">
                  <Library className="mr-2 h-4 w-4" />
                  Select from Library
              </Button>
            </div>

          </form>
        </Form>
        <div className="flex items-start justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground pt-12">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="font-headline text-lg">
                Our AI is finding the perfect movies for you...
              </p>
            </div>
          )}
          {!loading && !result && (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-8 text-center">
              <Bot className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="font-headline text-xl font-semibold">
                Your Recommendations Await
              </h3>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Enter some movies you like, and our AI will suggest something new. Results will appear here.
              </p>
            </div>
          )}
          {result && (
            <Card className="w-full animate-in fade-in-50">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-2xl">
                  <Sparkles className="h-6 w-6 text-accent" />
                  We Recommend
                </CardTitle>
                <CardDescription>
                    Here are a few movies you might enjoy. This has been added to your library.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.recommendations.map((rec, index) => (
                    <div key={index} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
                        <Link href={`/dashboard/movies?search=${encodeURIComponent(rec.title)}&year=${rec.year}`}>
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
          )}
        </div>
      </div>
    </>
  );
}
