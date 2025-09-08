// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines a Genkit flow for retrieving detailed movie information.
 *
 * @exports {getMovieDetails} - The main function to trigger the movie details retrieval flow.
 * @exports {MovieDetailsInput} - The input type for the getMovieDetails function.
 * @exports {MovieDetailsOutput} - The output type for the getMovieDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema
const MovieDetailsInputSchema = z.object({
  title: z.string().describe('The title of the movie to get details for.'),
});
export type MovieDetailsInput = z.infer<typeof MovieDetailsInputSchema>;

// Define the output schema
const MovieDetailsOutputSchema = z.object({
  synopsis: z
    .string()
    .describe('A detailed synopsis of the movie.'),
  genre: z.string().describe('The genre of the movie.'),
  year: z.string().describe('The release year of the movie.'),
  rating: z.number().describe('The rating of the movie out of 5.'),
  imageUrl: z
    .string()
    .describe(
      'A public URL for the movie poster. Use https://picsum.photos/400/600 for placeholders.'
    ),
  imageHint: z
    .string()
    .describe(
      "A short, two-word hint for the movie poster image, like 'sci-fi poster'."
    ),
});
export type MovieDetailsOutput = z.infer<typeof MovieDetailsOutputSchema>;

// Define the main function that calls the flow
export async function getMovieDetails(
  input: MovieDetailsInput
): Promise<MovieDetailsOutput> {
  return getMovieDetailsFlow(input);
}

// Define the prompt
const getMovieDetailsPrompt = ai.definePrompt({
  name: 'getMovieDetailsPrompt',
  input: { schema: MovieDetailsInputSchema },
  output: { schema: MovieDetailsOutputSchema },
  prompt: `You are a movie database expert. Provide a detailed synopsis, the genre, release year, a rating out of 5, and a poster image URL for the following movie: {{{title}}}.`,
});

// Define the flow
const getMovieDetailsFlow = ai.defineFlow(
  {
    name: 'getMovieDetailsFlow',
    inputSchema: MovieDetailsInputSchema,
    outputSchema: MovieDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await getMovieDetailsPrompt(input);
    return output!;
  }
);
