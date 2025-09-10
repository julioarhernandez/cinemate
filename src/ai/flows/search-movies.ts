
'use server';

/**
 * @fileOverview This file defines a function for searching and discovering movies and TV shows from The Movie Database (TMDB) API.
 *
 * @exports searchMovies - A function that handles searching and filtering for media.
 * @exports SearchMoviesInput - The input type for the searchMovies function.
 * @exports SearchMoviesOutput - The return type for the searchMovies function.
 */

import {
  SearchMoviesInputSchema,
  SearchMoviesOutputSchema,
  type SearchMoviesInput,
  type SearchMoviesOutput,
} from '@/ai/schemas/movie-schemas';
import { movies as defaultMovies, type MediaItem } from '@/lib/movies';

export type {SearchMoviesInput, SearchMoviesOutput};

async function getPersonId(name: string): Promise<string | null> {
    if (!name.trim()) return null;
    const url = `https://api.themoviedb.org/3/search/person?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].id.toString();
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch person ID:', error);
        return null;
    }
}


export async function searchMovies(
  input: SearchMoviesInput
): Promise<SearchMoviesOutput> {
  const validatedInput = SearchMoviesInputSchema.parse(input);
  const { query, year, genres, page = 1, sortBy = 'popularity.desc', mediaType = 'movie', language, withCast: castName } = validatedInput;

  if (!process.env.TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not set. Returning default movies.');
    return { movies: defaultMovies, hasMore: false };
  }

  let url;
  const params = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY,
    page: page.toString(),
  });

  const endpoint = mediaType === 'tv' ? 'tv' : 'movie';

  // If there is a search query, use the /search/ endpoint
  if (query) {
    url = `https://api.themoviedb.org/3/search/${endpoint}`;
    params.append('query', query);
    if (year) {
      params.append(mediaType === 'tv' ? 'first_air_date_year' : 'primary_release_year', year);
    }
  } else {
    // Otherwise, use the /discover/ endpoint for advanced filtering
    url = `https://api.themoviedb.org/3/discover/${endpoint}`;
    params.append('sort_by', sortBy);
    
    const today = new Date().toISOString().split('T')[0];
    const dateParamPrefix = mediaType === 'tv' ? 'first_air_date' : 'primary_release_date';

    params.append(`${dateParamPrefix}.lte`, today);

    if (year) {
      params.append(`${dateParamPrefix}.gte`, `${year}-01-01`);
      params.append(`${dateParamPrefix}.lte`, `${year}-12-31`);
    }
     if (genres && genres.length > 0) {
      params.append('with_genres', genres.join(','));
    }
    if (language) {
      params.append('with_original_language', language);
    }
    if (castName) {
        const personId = await getPersonId(castName);
        if (personId) {
            params.append('with_cast', personId);
        }
    }
  }
  
  const fullUrl = `${url}?${params.toString()}`;
  console.log(`Fetching from TMDB API: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
    if (!response.ok) {
      console.error('Failed to fetch from TMDB API:', response.statusText, await response.text());
      return { movies: [], hasMore: false };
    }
    const data = await response.json();
    
    const isMovie = mediaType === 'movie';

    const movies: MediaItem[] = data.results.map((item: any) => ({
      id: item.id,
      title: isMovie ? item.title : item.name,
      year: (isMovie ? item.release_date : item.first_air_date)?.substring(0, 4) || 'N/A',
      genre: '', // Genre data not in this response, fetched on details page.
      rating: item.vote_average || 0,
      imageUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w400${item.poster_path}`
        : 'https://picsum.photos/400/600',
      imageHint: `${isMovie ? item.title : item.name} poster`,
      mediaType: mediaType,
    }));

    const hasMore = data.page < data.total_pages;

    // Validate output before returning
    return SearchMoviesOutputSchema.parse({ movies, hasMore });
  } catch (error) {
    console.error(`Error fetching ${mediaType} from TMDB:`, error);
    return { movies: [], hasMore: false };
  }
}
