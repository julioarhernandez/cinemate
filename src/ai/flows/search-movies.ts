
'use server';

/**
 * @fileOverview This file defines a function for searching movies from The Movie Database (TMDB) API.
 *
 * @exports searchMovies - A function that handles searching for movies.
 * @exports SearchMoviesInput - The input type for the searchMovies function.
 * @exports SearchMoviesOutput - The return type for the searchMovies function.
 */

import {
  SearchMoviesInputSchema,
  SearchMoviesOutputSchema,
  type SearchMoviesInput,
  type SearchMoviesOutput,
} from '@/ai/schemas/movie-schemas';
import { movies as defaultMovies, type Movie } from '@/lib/movies';

export type {SearchMoviesInput, SearchMoviesOutput};


export async function searchMovies(
  input: SearchMoviesInput
): Promise<SearchMoviesOutput> {
  // Validate input if necessary, though schema is exported for external validation
  const validatedInput = SearchMoviesInputSchema.parse(input);

  if (!process.env.TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not set. Returning default movies.');
    return { movies: defaultMovies };
  }

  let url;
  // If the query is empty, fetch the latest movies (Now Playing).
  if (!validatedInput.query) {
    url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.TMDB_API_KEY}`;
  } else {
    url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
      validatedInput.query
    )}&api_key=${process.env.TMDB_API_KEY}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch from TMDB API:', response.statusText);
      return { movies: [] };
    }
    const data = await response.json();

    const movies: Movie[] = data.results.map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
      genre: '', // Genre data not in this response, fetched on details page.
      rating: movie.vote_average ? movie.vote_average : 0,
      imageUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w400${movie.poster_path}`
        : 'https://picsum.photos/400/600',
      imageHint: `${movie.title} poster`,
    }));

    // Validate output before returning
    return SearchMoviesOutputSchema.parse({ movies });
  } catch (error) {
    console.error('Error fetching movies from TMDB:', error);
    return { movies: [] };
  }
}
