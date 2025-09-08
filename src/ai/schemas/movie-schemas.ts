import {z} from 'zod';

export const MovieSchema = z.object({
  title: z.string(),
  year: z.string(),
  genre: z.string().optional(), // Genre might not be available on all search results
  rating: z.number(),
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

export const SearchMoviesInputSchema = z.object({
  query: z.string().describe('The search query for movies.'),
});
export type SearchMoviesInput = z.infer<typeof SearchMoviesInputSchema>;

export const SearchMoviesOutputSchema = z.object({
  movies: z
    .array(MovieSchema)
    .describe('An array of movies matching the search query.'),
});
export type SearchMoviesOutput = z.infer<typeof SearchMoviesOutputSchema>;
