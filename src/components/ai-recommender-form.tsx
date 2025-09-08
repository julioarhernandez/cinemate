"use client";

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Bot, Loader2, Sparkles } from 'lucide-react';

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

const formSchema = z.object({
  userMovieHistory: z
    .string()
    .min(1, 'Please provide your movie history.')
    .describe(
      'A list of movies the user has watched, including titles and ratings.'
    ),
  friendRatings: z
    .string()
    .min(1, 'Please provide ratings from friends.')
    .describe(
      'A list of movie ratings from the user’s friends, including user and their ratings.'
    ),
  commonViewingPatterns: z
    .string()
    .min(1, 'Please provide common viewing patterns.')
    .describe(
      'Common viewing patterns among users with similar tastes, including genres and popular movies.'
    ),
});

export function AiRecommenderForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendMovieOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userMovieHistory: '',
      friendRatings: '',
      commonViewingPatterns: '',
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

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="userMovieHistory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Movie History</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., The Matrix (5/5), Inception (5/5), The Notebook (2/5)"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  List some movies you've watched and how you'd rate them.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="friendRatings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Friend's Ratings</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., John Doe: The Dark Knight (5/5), Parasite (5/5). Jane Smith: La La Land (5/5)."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  What do your friends think about certain movies?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commonViewingPatterns"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Common Viewing Patterns</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., We usually watch sci-fi and thrillers. Not a fan of horror movies."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Describe genres or types of movies you and your friends enjoy.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
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
              Fill out the details on the left, and our AI will suggest a movie
              you're sure to love.
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
