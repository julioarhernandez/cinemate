'use server';

/**
 * @fileOverview This file defines a flow for searching movies from The Movie Database (TMDB) API.
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
import { movies as defaultMovies } from '@/lib/movies';
import { Movie } from '@/lib/movies';

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
  async (input): Promise<SearchMoviesOutput> => {
    // If the query is empty, return the default list of movies.
    if (!input.query) {
      return { movies: defaultMovies };
    }
    
    if (!process.env.TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not set. Returning default movies.');
      // Optionally, you could throw an error here to make it clearer on the client-side.
      return { movies: defaultMovies };
    }

    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(input.query)}&api_key=${process.env.TMDB_API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to fetch from TMDB API:', response.statusText);
        return { movies: [] };
      }
      const data = await response.json();

      const movies: Movie[] = data.results.map((movie: any) => ({
        title: movie.title,
        year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
        // Genre information is not available in the search result, so we'll leave it empty.
        // The details page will fetch it.
        genre: '',
        rating: movie.vote_average ? movie.vote_average / 2 : 0, // Convert 10-point to 5-point rating
        imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w400${movie.poster_path}` : 'https://picsum.photos/400/600',
        imageHint: `${movie.title} poster`,
      }));

      return { movies };

    } catch (error) {
      console.error('Error fetching movies from TMDB:', error);
      return { movies: [] };
    }
  }
);
