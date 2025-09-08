'use server';

/**
 * @fileOverview This file defines a Genkit flow for searching movies from a database.
 *
 * @exports searchMovies - A function that handles searching for movies.
 * @exports SearchMoviesInput - The input type for the searchMovies function.
 * @exports SearchMoviesOutput - The return type for the searchMovies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MovieSchema = z.object({
  title: z.string(),
  year: z.string(),
  genre: z.string(),
  rating: z.number(),
  imageUrl: z.string().describe("A public URL for the movie poster. Use https://picsum.photos/400/600 for placeholders."),
  imageHint: z.string().describe("A short, two-word hint for the movie poster image, like 'sci-fi poster'."),
});

export const SearchMoviesInputSchema = z.object({
  query: z.string().describe('The search query for movies.'),
});
export type SearchMoviesInput = z.infer<typeof SearchMoviesInputSchema>;

export const SearchMoviesOutputSchema = z.object({
  movies: z
    .array(MovieSchema)
    .describe('An array of movies matching the search query.'),
});
export type SearchMoviesOutput = z.infer<typeof SearchMoviesOutputSchema>;

export async function searchMovies(
  input: SearchMoviesInput
): Promise<SearchMoviesOutput> {
  return searchMoviesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'searchMoviesPrompt',
  input: {schema: SearchMoviesInputSchema},
  output: {schema: SearchMoviesOutputSchema},
  prompt: `You are a movie database API. Find movies that match the following query: {{{query}}}. Return a list of movies. If you don't find any, you can make some up. Return at least 9 results.`,
});

const searchMoviesFlow = ai.defineFlow(
  {
    name: 'searchMoviesFlow',
    inputSchema: SearchMoviesInputSchema,
    outputSchema: SearchMoviesOutputSchema,
  },
  async input => {
    // If the query is empty, return the default list of movies.
    if (!input.query) {
      const { movies } = await import('@/lib/movies');
      return { movies };
    }

    const {output} = await prompt(input);
    return output!;
  }
);
