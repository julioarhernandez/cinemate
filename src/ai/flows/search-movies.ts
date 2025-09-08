'use server';

/**
 * @fileOverview This file defines a Genkit flow for searching movies from a database.
 *
 * @exports searchMovies - A function that handles searching for movies.
 * @exports SearchMoviesInput - The input type for the searchMovies function.
 * @exports SearchMoviesOutput - The return type for the searchMovies function.
 */

import {ai} from '@/ai/genkit';
import {
  SearchMoviesInputSchema,
  SearchMoviesOutputSchema,
  type SearchMoviesInput,
  type SearchMoviesOutput,
} from '@/ai/schemas/movie-schemas';

export type {SearchMoviesInput, SearchMoviesOutput};

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
