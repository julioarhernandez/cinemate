
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
    .describe('A list of movies or genres that the user likes.'),
});
export type RecommendMovieInput = z.infer<typeof RecommendMovieInputSchema>;

// Define the output schema for a single recommendation
const RecommendationSchema = z.object({
    title: z.string().describe('The title of the recommended movie.'),
    year: z.string().describe('The release year of the recommended movie.'),
    reasoning: z.string().describe('The reasoning for recommending this specific movie.'),
});

// Define the final output schema
const RecommendMovieOutputSchema = z.object({
    recommendations: z.array(RecommendationSchema).describe('A list of at least 3 personalized movie recommendations, including their release year.'),
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
  prompt: `You are a movie recommendation expert. Your task is to recommend at least 3 movies to a user based on a list of movies and genres they like. For each movie, you must provide its title, its release year, and a reason for the recommendation.

User's Liked Movies & Genres: {{{userPreferences}}}

Based on this information, recommend a list of at least 3 specific movies that the user is likely to enjoy. 
- Do not recommend movies that are already on their list.
- Provide a unique set of recommendations if asked multiple times with the same input.
- Explain why you are recommending each movie.
- It is critical that you find the correct release year for each movie.`,
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
