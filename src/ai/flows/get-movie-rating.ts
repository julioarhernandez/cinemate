'use server';

/**
 * @fileOverview This file defines a Genkit flow for retrieving a user's movie rating from Firestore.
 *
 * @exports getUserMovieRating - The main function to trigger the rating retrieval flow.
 * @exports GetUserMovieRatingInput - The input type for the getUserMovieRating function.
 * @exports GetUserMovieRatingOutput - The output type for the getUserMovieRating function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc } from "firebase/firestore";

// Define the input schema
const GetUserMovieRatingInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  movieTitle: z.string().describe('The title of the movie.'),
});
export type GetUserMovieRatingInput = z.infer<typeof GetUserMovieRatingInputSchema>;

// Define the output schema
const GetUserMovieRatingOutputSchema = z.object({
  rating: z.number().nullable().describe('The rating the user gave the movie, or null if not rated.'),
  watched: z.boolean().describe('Whether the user has marked the movie as watched.'),
});
export type GetUserMovieRatingOutput = z.infer<typeof GetUserMovieRatingOutputSchema>;

export async function getUserMovieRating(input: GetUserMovieRatingInput): Promise<GetUserMovieRatingOutput> {
  return getUserMovieRatingFlow(input);
}

const getUserMovieRatingFlow = ai.defineFlow(
  {
    name: 'getUserMovieRatingFlow',
    inputSchema: GetUserMovieRatingInputSchema,
    outputSchema: GetUserMovieRatingOutputSchema,
  },
  async ({ userId, movieTitle }) => {
    try {
      const ratingDocRef = doc(db, 'users', userId, 'ratings', movieTitle);
      const ratingDoc = await getDoc(ratingDocRef);

      if (ratingDoc.exists()) {
        const data = ratingDoc.data();
        return {
          rating: data.rating || null,
          watched: data.watched || false,
        };
      } else {
        return { rating: null, watched: false };
      }
    } catch (error) {
      console.error("Error getting user's movie rating:", error);
      // In case of error, return a default state
      return { rating: null, watched: false };
    }
  }
);
