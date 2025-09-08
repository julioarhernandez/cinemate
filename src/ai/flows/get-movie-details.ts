// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines a Genkit flow for retrieving detailed movie information from TMDB.
 *
 * @exports {getMovieDetails} - The main function to trigger the movie details retrieval flow.
 * @exports {MovieDetailsInput} - The input type for the getMovieDetails function.
 * @exports {MovieDetailsOutput} - The output type for the getMovieDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { movies as defaultMovies } from '@/lib/movies';

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
      'A public URL for the movie poster. Find a real poster, do not use placeholders.'
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

// Define the flow
const getMovieDetailsFlow = ai.defineFlow(
  {
    name: 'getMovieDetailsFlow',
    inputSchema: MovieDetailsInputSchema,
    outputSchema: MovieDetailsOutputSchema,
  },
  async ({ title }) => {
    if (!process.env.TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not set. Returning default movie details.');
      // Find a movie from the default list or return a fallback
      const fallbackMovie = defaultMovies.find(m => m.title.toLowerCase() === title.toLowerCase()) || {
        synopsis: 'No details available.',
        genre: 'N/A',
        year: 'N/A',
        rating: 0,
        imageUrl: 'https://picsum.photos/400/600',
        imageHint: 'movie poster',
      };
      return fallbackMovie;
    }

    // 1. Search for the movie to get its ID
    const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
      title
    )}&api_key=${process.env.TMDB_API_KEY}`;
    
    let movieId;
    try {
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error('Failed to search for movie.');
        const searchData = await searchResponse.json();
        if (searchData.results.length === 0) throw new Error('Movie not found.');
        movieId = searchData.results[0].id;
    } catch (error) {
        console.error('Error searching for movie ID:', error);
        // Fallback or throw error
        const fallbackMovie = defaultMovies.find(m => m.title.toLowerCase() === title.toLowerCase()) || {
            synopsis: 'Could not find movie details.',
            genre: 'N/A',
            year: 'N/A',
            rating: 0,
            imageUrl: 'https://picsum.photos/400/600',
            imageHint: 'movie poster',
          };
        return fallbackMovie;
    }


    // 2. Fetch detailed information using the movie ID
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}`;
    
    try {
        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) throw new Error('Failed to fetch movie details.');
        const movie = await detailsResponse.json();

        return {
            synopsis: movie.overview || 'No synopsis available.',
            genre: movie.genres && movie.genres.length > 0 ? movie.genres.map((g: any) => g.name).join(', ') : 'N/A',
            year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
            rating: movie.vote_average ? movie.vote_average / 2 : 0, // Convert 10-point to 5-point rating
            imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w400${movie.poster_path}` : 'https://picsum.photos/400/600',
            imageHint: `${title} poster`,
        };
    } catch (error) {
        console.error('Error fetching movie details:', error);
         // Fallback or throw error
         const fallbackMovie = defaultMovies.find(m => m.title.toLowerCase() === title.toLowerCase()) || {
            synopsis: 'Could not find movie details.',
            genre: 'N/A',
            year: 'N/A',
            rating: 0,
            imageUrl: 'https://picsum.photos/400/600',
            imageHint: 'movie poster',
          };
        return fallbackMovie;
    }
  }
);
