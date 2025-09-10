
// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines functions for retrieving detailed movie or TV show information from TMDB.
 *
 * @exports {getMovieDetails} - The main function to retrieve media details.
 * @exports {MovieDetailsInput} - The input type for the getMovieDetails function.
 * @exports {MovieDetailsOutput} - The output type for the getMovieDetails function.
 */

import { z } from 'zod';
import { movies as defaultMovies } from '@/lib/movies';
import type { MediaItem } from '@/lib/movies';

// Define the input schema
const MovieDetailsInputSchema = z.object({
  id: z.number().describe('The ID of the media to get details for.'),
  mediaType: z.enum(['movie', 'tv']).describe('The type of media to get details for.'),
});
export type MovieDetailsInput = z.infer<typeof MovieDetailsInputSchema>;

// Define the output schema
const MovieDetailsOutputSchema = z.object({
  id: z.number(),
  title: z.string(),
  mediaType: z.enum(['movie', 'tv']),
  synopsis: z
    .string()
    .describe('A detailed synopsis of the media.'),
  genre: z.string().describe('The genre of the media.'),
  year: z.string().describe('The release year of the media.'),
  rating: z.number().describe('The rating of the media out of 10.'),
  imageUrl: z
    .string()
    .describe(
      'A public URL for the media poster. Find a real poster, do not use placeholders.'
    ),
  imageHint: z
    .string()
    .describe(
      "A short, two-word hint for the media poster image, like 'sci-fi poster'."
    ),
});
export type MovieDetailsOutput = z.infer<typeof MovieDetailsOutputSchema>;

const UnknownMovie: MovieDetailsOutput = {
    id: 0,
    title: 'Unknown Media',
    mediaType: 'movie',
    synopsis: 'Details for this media could not be found.',
    genre: 'N/A',
    year: 'N/A',
    rating: 0,
    imageUrl: 'https://picsum.photos/400/600',
    imageHint: 'media poster',
}

// Helper function to get fallback movie data
function getFallbackMovie(id: number, mediaType: 'movie' | 'tv'): MovieDetailsOutput {
  const fallbackMovie = defaultMovies.find(m => m.id === id);
  // Ensure the synopsis is always a string.
  return fallbackMovie ? { ...fallbackMovie, synopsis: fallbackMovie.synopsis ?? 'No synopsis available.' } : { ...UnknownMovie, id, mediaType };
}

// Main function to get movie details
export async function getMovieDetails(
  input: MovieDetailsInput
): Promise<MovieDetailsOutput> {
  const { id, mediaType } = input;

  // Check if TMDB API key is available
  if (!process.env.TMDB_API_KEY) {
    console.warn('TMDB_API_KEY is not set. Returning fallback movie details.');
    return getFallbackMovie(id, mediaType);
  }

  try {
    // Fetch detailed information using the movie ID
    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${process.env.TMDB_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);

    // If the movie is not found on TMDB, fall back.
    if (detailsResponse.status === 404) {
        console.warn(`Media with ID "${id}" and type "${mediaType}" not found in TMDB.`);
        return getFallbackMovie(id, mediaType);
    }
    
    if (!detailsResponse.ok) {
      throw new Error(`Details request failed: ${detailsResponse.status}`);
    }
    
    const media = await detailsResponse.json();

    const isMovie = mediaType === 'movie';
    const title = isMovie ? media.title : media.name;
    const releaseDate = isMovie ? media.release_date : media.first_air_date;

    // 3. Format and return the movie details
    return {
      id: media.id,
      title: title || 'Untitled',
      mediaType,
      synopsis: media.overview || 'No synopsis available.',
      genre: media.genres && media.genres.length > 0 
        ? media.genres.map((g: any) => g.name).join(', ') 
        : 'N/A',
      year: releaseDate ? releaseDate.substring(0, 4) : 'N/A',
      rating: media.vote_average || 0,
      imageUrl: media.poster_path 
        ? `https://image.tmdb.org/t/p/w400${media.poster_path}` 
        : 'https://picsum.photos/400/600',
      imageHint: `${title} poster`,
    };

  } catch (error) {
    console.error('Error fetching media details for ID', id, ':', error);
    return getFallbackMovie(id, mediaType);
  }
}
