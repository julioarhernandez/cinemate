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
import { movies as allMovies } from '@/lib/movies';

export type {SearchMoviesInput, SearchMoviesOutput};

export async function searchMovies(
  input: SearchMoviesInput
): Promise<SearchMoviesOutput> {
  return searchMoviesFlow(input);
}

const searchMoviesFlow = ai.defineFlow(
  {
    name: 'searchMoviesFlow',
    inputSchema: SearchMoviesInputSchema,
    outputSchema: SearchMoviesOutputSchema,
  },
  async input => {
    // If the query is empty, return the default list of movies.
    if (!input.query) {
      return { movies: allMovies };
    }

    const filteredMovies = allMovies.filter(movie => movie.title.toLowerCase().includes(input.query.toLowerCase()));

    return { movies: filteredMovies };
  }
);
