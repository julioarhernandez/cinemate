// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing personalized movie recommendations based on user history,
 * friend ratings, and common viewing patterns.
 *
 * @exports {recommendMovie} - The main function to trigger the movie recommendation flow.
 * @exports {RecommendMovieInput} - The input type for the recommendMovie function.
 * @exports {RecommendMovieOutput} - The output type for the recommendMovie function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema
const RecommendMovieInputSchema = z.object({
  userMovieHistory: z
    .string()
    .describe(
      'A list of movies the user has watched, including titles and ratings.'
    ),
  friendRatings: z
    .string()
    .describe(
      'A list of movie ratings from the user’s friends, including user and their ratings.'
    ),
  commonViewingPatterns: z
    .string()
    .describe(
      'Common viewing patterns among users with similar tastes, including genres and popular movies.'
    ),
});
export type RecommendMovieInput = z.infer<typeof RecommendMovieInputSchema>;

// Define the output schema
const RecommendMovieOutputSchema = z.object({
  movieRecommendation: z
    .string()
    .describe(
      'A personalized movie recommendation based on the user’s viewing history, friend ratings, and common viewing patterns.'
    ),
  reasoning: z
    .string()
    .describe(
      'The reasoning behind the recommendation, explaining how the input data influenced the choice.'
    ),
});
export type RecommendMovieOutput = z.infer<typeof RecommendMovieOutputSchema>;

// Define the main function that calls the flow
export async function recommendMovie(input: RecommendMovieInput): Promise<RecommendMovieOutput> {
  return recommendMovieFlow(input);
}

// Define the prompt
const recommendMoviePrompt = ai.definePrompt({
  name: 'recommendMoviePrompt',
  input: { schema: RecommendMovieInputSchema },
  output: { schema: RecommendMovieOutputSchema },
  prompt: `You are a movie recommendation expert. Consider the user's movie history, friend ratings, and common viewing patterns to provide a personalized movie recommendation.

User Movie History: {{{userMovieHistory}}}
Friend Ratings: {{{friendRatings}}}
Common Viewing Patterns: {{{commonViewingPatterns}}}

Based on this information, what movie would you recommend to the user and why? Explain the reasoning behind your recommendation.

Recommendation:`,
});

// Define the flow
const recommendMovieFlow = ai.defineFlow(
  {
    name: 'recommendMovieFlow',
    inputSchema: RecommendMovieInputSchema,
    outputSchema: RecommendMovieOutputSchema,
  },
  async input => {
    const { output } = await recommendMoviePrompt(input);
    return output!;
  }
);
