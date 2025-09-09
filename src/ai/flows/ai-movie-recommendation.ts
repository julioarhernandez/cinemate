
// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing personalized movie recommendations based on a user's favorite movies and genres.
 *
 * @exports {recommendMovie} - The main function to trigger the movie recommendation flow.
 * @exports {RecommendMovieInput} - The input type for the recommendMovie function.
 * @exports {RecommendMovieOutput} - The output type for the recommendMovie function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema
const RecommendMovieInputSchema = z.object({
  userPreferences: z
    .string()
    .describe(
      'A list of movies or genres that the user likes.'
    ),
});
export type RecommendMovieInput = z.infer<typeof RecommendMovieInputSchema>;

// Define the output schema
const RecommendMovieOutputSchema = z.object({
  movieRecommendation: z
    .string()
    .describe(
      'A personalized movie recommendation based on the user’s favorite movies and genres.'
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
  prompt: `You are a movie recommendation expert. Your task is to recommend a movie to a user based on a list of movies and genres they like.

User's Liked Movies & Genres: {{{userPreferences}}}

Based on this information, recommend a single, specific movie that the user is likely to enjoy. Do not recommend a movie that is already on their list. Explain why you are recommending this movie.`,
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
