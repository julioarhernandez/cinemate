import {z} from 'zod';

export const MovieSchema = z.object({
  id: z.number().describe('The unique ID of the media.'),
  title: z.string(),
  year: z.string(),
  genre: z.string().optional(), // Genre might not be available on all search results
  rating: z.number(),
  mediaType: z.enum(['movie', 'tv']),
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

export const SearchMoviesInputSchema = z.object({
  query: z.string().optional().describe('The search query for movies.'),
  year: z.string().optional().describe('Filter movies by a specific release year.'),
  genres: z.array(z.string()).optional().describe('An array of genre IDs to filter by.'),
  page: z.number().optional().describe('The page number of results to fetch.'),
  sortBy: z.string().optional().describe('The sorting preference for results.'),
  mediaType: z.enum(['movie', 'tv']).default('movie').optional(),
});
export type SearchMoviesInput = z.infer<typeof SearchMoviesInputSchema>;

export const SearchMoviesOutputSchema = z.object({
  movies: z
    .array(MovieSchema)
    .describe('An array of movies matching the search query.'),
  hasMore: z.boolean().describe('Indicates if there are more pages of results available.'),
});
export type SearchMoviesOutput = z.infer<typeof SearchMoviesOutputSchema>;
