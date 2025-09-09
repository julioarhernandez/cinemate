
'use server';

/**
 * @fileOverview This file defines a function for searching and discovering movies from The Movie Database (TMDB) API.
 *
 * @exports searchMovies - A function that handles searching and filtering for movies.
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
  const validatedInput = SearchMoviesInputSchema.parse(input);
  const { query, year, genres, page = 1, sortBy = 'popularity.desc' } = validatedInput;

  if (!process.env.TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not set. Returning default movies.');
    return { movies: defaultMovies, hasMore: false };
  }

  let url;
  const params = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY,
    page: page.toString(),
  });

  // If there is a search query, use the /search/movie endpoint
  if (query) {
    url = `https://api.themoviedb.org/3/search/movie`;
    params.append('query', query);
    if (year) {
      params.append('primary_release_year', year);
    }
  } else {
    // Otherwise, use the /discover/movie endpoint for advanced filtering
    url = `https://api.themoviedb.org/3/discover/movie`;
    params.append('sort_by', sortBy);
    // TMDB release_date filter is inclusive.
    if (year) {
      params.append('primary_release_date.gte', `${year}-01-01`);
      params.append('primary_release_date.lte', `${year}-12-31`);
    }
     if (genres && genres.length > 0) {
      params.append('with_genres', genres.join(','));
    }
  }
  
  const fullUrl = `${url}?${params.toString()}`;

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.error('Failed to fetch from TMDB API:', response.statusText, await response.text());
      return { movies: [], hasMore: false };
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

    const hasMore = data.page < data.total_pages;

    // Validate output before returning
    return SearchMoviesOutputSchema.parse({ movies, hasMore });
  } catch (error) {
    console.error('Error fetching movies from TMDB:', error);
    return { movies: [], hasMore: false };
  }
}
