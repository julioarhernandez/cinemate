'use server';

/**
 * @fileOverview This file defines a Genkit flow for saving a user's movie rating to Firestore.
 *
 * @exports saveMovieRating - The main function to trigger the rating saving flow.
 * @exports SaveMovieRatingInput - The input type for the saveMovieRating function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, setDoc } from "firebase/firestore"; 

// Define the input schema
const SaveMovieRatingInputSchema = z.object({
  userId: z.string().describe('The ID of the user saving the rating.'),
  movieTitle: z.string().describe('The title of the movie being rated.'),
  rating: z.number().min(0).max(5).describe('The rating from 0 to 5.'),
  watched: z.boolean().describe('Whether the user has marked the movie as watched.'),
});
export type SaveMovieRatingInput = z.infer<typeof SaveMovieRatingInputSchema>;

export async function saveMovieRating(input: SaveMovieRatingInput): Promise<void> {
  return saveMovieRatingFlow(input);
}

const saveMovieRatingFlow = ai.defineFlow(
  {
    name: 'saveMovieRatingFlow',
    inputSchema: SaveMovieRatingInputSchema,
    outputSchema: z.void(),
  },
  async ({ userId, movieTitle, rating, watched }) => {
    try {
      // Create a document reference. The movie title will be the document ID.
      // This will create or overwrite a document with the movie title as its ID.
      const ratingDocRef = doc(db, 'users', userId, 'ratings', movieTitle);
      
      // Set the data for the document.
      await setDoc(ratingDocRef, { rating, watched }, { merge: true });

      console.log(`Rating for ${movieTitle} saved successfully for user ${userId}.`);
    } catch (error) {
      console.error("Error saving movie rating:", error);
      // Optionally, rethrow the error if you want the client to handle it
      throw new Error("Failed to save movie rating.");
    }
  }
);
