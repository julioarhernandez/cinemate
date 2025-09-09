
"use client";

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Bot, Loader2, Sparkles, Library } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

import {
  recommendMovie,
  type RecommendMovieOutput,
} from '@/ai/flows/ai-movie-recommendation';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getMovieDetails } from '@/ai/flows/get-movie-details';


const formSchema = z.object({
  userPreferences: z
    .string()
    .min(1, 'Please list some movies or genres you like.')
    .describe(
      'A list of movies or genres that the user likes.'
    ),
});

export function AiRecommenderForm() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const [isFetchingWatched, setIsFetchingWatched] = useState(false);
  const [result, setResult] = useState<RecommendMovieOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userPreferences: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const recommendation = await recommendMovie(values);
      setResult(recommendation);
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

  const handleUseWatchedList = async () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Signed In',
            description: 'You must be signed in to use your watched list.',
        });
        return;
    }
    setIsFetchingWatched(true);
    try {
        const ratingsCollection = collection(db, 'users', user.uid, 'ratings');
        const q = query(ratingsCollection, where('watched', '==', true));
        const snapshot = await getDocs(q);
        
        const movieIds: number[] = [];
        snapshot.forEach((doc) => {
            movieIds.push(parseInt(doc.id));
        });

        if (movieIds.length === 0) {
            toast({
                title: 'Empty Collection',
                description: "You haven't marked any movies as watched yet.",
            });
            return;
        }
        
        const moviePromises = movieIds.map(id => getMovieDetails({ id }));
        const moviesData = await Promise.all(moviePromises);
        
        const movieTitles = moviesData
            .filter(movie => movie && movie.title !== 'Unknown Movie')
            .map(movie => movie.title)
            .join(', ');

        form.setValue('userPreferences', movieTitles);
        toast({
            title: 'Success!',
            description: 'Loaded your watched movies into the text area.',
        });

    } catch (error) {
        console.error('Failed to fetch watched list:', error);
        toast({
            variant: 'destructive',
            title: 'Fetch Failed',
            description: 'Could not fetch your watched list. Please try again.',
        });
    } finally {
        setIsFetchingWatched(false);
    }
  };


  return (
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
                  List movies or genres you like. The more you add, the better the recommendation.
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
             <Button type="button" variant="secondary" onClick={handleUseWatchedList} disabled={isFetchingWatched || loading} className="w-full">
              {isFetchingWatched ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Library className="mr-2 h-4 w-4" />
                  Use My Watched List
                </>
              )}
            </Button>
          </div>

        </form>
      </Form>
      <div className="flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="font-headline text-lg">
              Our AI is finding the perfect movie for you...
            </p>
          </div>
        )}
        {!loading && !result && (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-8 text-center">
            <Bot className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="font-headline text-xl font-semibold">
              Your Recommendation Awaits
            </h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Enter some movies you like, or use your watched list, and our AI will suggest something new.
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
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-3xl font-bold text-primary">
                {result.movieRecommendation}
              </h3>
              <div>
                <h4 className="font-headline font-semibold">Why you'll like it:</h4>
                <p className="mt-1 text-muted-foreground">{result.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
