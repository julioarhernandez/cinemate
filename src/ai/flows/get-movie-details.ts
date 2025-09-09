
// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines functions for retrieving detailed movie information from TMDB.
 *
 * @exports {getMovieDetails} - The main function to retrieve movie details.
 * @exports {MovieDetailsInput} - The input type for the getMovieDetails function.
 * @exports {MovieDetailsOutput} - The output type for the getMovieDetails function.
 */

import { z } from 'zod';
import { movies as defaultMovies } from '@/lib/movies';

// Define the input schema
const MovieDetailsInputSchema = z.object({
  id: z.number().describe('The ID of the movie to get details for.'),
});
export type MovieDetailsInput = z.infer<typeof MovieDetailsInputSchema>;

// Define the output schema
const MovieDetailsOutputSchema = z.object({
  title: z.string(),
  synopsis: z
    .string()
    .describe('A detailed synopsis of the movie.'),
  genre: z.string().describe('The genre of the movie.'),
  year: z.string().describe('The release year of the movie.'),
  rating: z.number().describe('The rating of the movie out of 10.'),
  imageUrl: z
    .string()
    .describe(
      'A public URL for the movie poster. Find a real poster, do not use placeholders.'
    ),
  imageHint: z
    .string()
    .describe(
      "A short, two-word hint for the movie poster image, like 'sci-fi poster'."
    ),
});
export type MovieDetailsOutput = z.infer<typeof MovieDetailsOutputSchema>;

const UnknownMovie: MovieDetailsOutput = {
    title: 'Unknown Movie',
    synopsis: 'Details for this movie could not be found.',
    genre: 'N/A',
    year: 'N/A',
    rating: 0,
    imageUrl: 'https://picsum.photos/400/600',
    imageHint: 'movie poster',
}

// Helper function to get fallback movie data
function getFallbackMovie(id: number): MovieDetailsOutput {
  const fallbackMovie = defaultMovies.find(m => m.id === id);
  // Ensure the synopsis is always a string.
  return fallbackMovie ? { ...fallbackMovie, synopsis: fallbackMovie.synopsis ?? 'No synopsis available.' } : UnknownMovie;
}

// Main function to get movie details
export async function getMovieDetails(
  input: MovieDetailsInput
): Promise<MovieDetailsOutput> {
  const { id } = input;

  // Check if TMDB API key is available
  if (!process.env.TMDB_API_KEY) {
    console.warn('TMDB_API_KEY is not set. Returning fallback movie details.');
    return getFallbackMovie(id);
  }

  try {
    // Fetch detailed information using the movie ID
    const detailsUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);

    // If the movie is not found on TMDB, fall back.
    if (detailsResponse.status === 404) {
        console.warn(`Movie with ID "${id}" not found in TMDB.`);
        return getFallbackMovie(id);
    }
    
    if (!detailsResponse.ok) {
      throw new Error(`Details request failed: ${detailsResponse.status}`);
    }
    
    const movie = await detailsResponse.json();

    // 3. Format and return the movie details
    return {
      title: movie.title || 'Untitled',
      synopsis: movie.overview || 'No synopsis available.',
      genre: movie.genres && movie.genres.length > 0 
        ? movie.genres.map((g: any) => g.name).join(', ') 
        : 'N/A',
      year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
      rating: movie.vote_average || 0,
      imageUrl: movie.poster_path 
        ? `https://image.tmdb.org/t/p/w400${movie.poster_path}` 
        : 'https://picsum.photos/400/600',
      imageHint: `${movie.title} poster`,
    };

  } catch (error) {
    console.error('Error fetching movie details for ID', id, ':', error);
    return getFallbackMovie(id);
  }
}
