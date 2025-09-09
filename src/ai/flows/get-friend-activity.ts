
'use server';

/**
 * @fileOverview A Genkit flow to fetch the latest movie watching activity from a user's friends.
 *
 * This flow retrieves the friends of the specified user, gets their recent movie ratings,
 * filters out private entries, sorts them by date, and returns the top 10 most recent activities.
 *
 * @exports getFriendActivity - The main function to trigger the flow.
 * @exports GetFriendActivityOutput - The output type for the getFriendActivity function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getMovieDetails, type MovieDetailsOutput } from './get-movie-details';
import { GetFriendActivityOutputSchema, type GetFriendActivityOutput } from '@/ai/schemas/friend-activity-schemas';

export type { GetFriendActivityOutput };


/**
 * Main function to get friend activity.
 * This is a wrapper around the Genkit flow.
 * @param userId - The ID of the user to fetch friend activity for.
 * @returns A promise that resolves to the friend activity output.
 */
export async function getFriendActivity(
  userId: string
): Promise<GetFriendActivityOutput> {
  return getFriendActivityFlow(userId);
}

// Define the Genkit flow
const getFriendActivityFlow = ai.defineFlow(
  {
    name: 'getFriendActivityFlow',
    inputSchema: z.string(), // User ID
    outputSchema: GetFriendActivityOutputSchema,
  },
  async (userId) => {
    // 1. Get the user's friends
    const friendsRef = collection(db, 'users', userId, 'friends');
    const friendsSnapshot = await getDocs(friendsRef);
    const friends = friendsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (friends.length === 0) {
      return { activity: [] };
    }

    // 2. Fetch recent ratings for all friends
    let allRatings: {
      friend: { id: string; displayName: string };
      movieId: string;
      watchedAt: Timestamp;
    }[] = [];

    for (const friend of friends) {
      const ratingsRef = collection(db, 'users', friend.id, 'ratings');
      const q = query(
        ratingsRef,
        where('watched', '==', true),
        where('isPrivate', '==', false),
        orderBy('updatedAt', 'desc'),
        limit(10) // Get the last 10 activities per friend to keep it manageable
      );
      const ratingsSnapshot = await getDocs(q);

      ratingsSnapshot.forEach((doc) => {
        const data = doc.data();
        allRatings.push({
          friend: { id: friend.id, displayName: friend.displayName },
          movieId: doc.id,
          watchedAt: data.updatedAt,
        });
      });
    }

    // 3. Sort all activities by date and take the latest 10
    allRatings.sort((a, b) => b.watchedAt.toMillis() - a.watchedAt.toMillis());
    const latestRatings = allRatings.slice(0, 10);

    // 4. Fetch movie details for the latest 10
    const activityWithMovieDetails = await Promise.all(
      latestRatings.map(async (rating) => {
        const movieDetails = await getMovieDetails({
          id: parseInt(rating.movieId, 10),
        });
        return {
          friend: rating.friend,
          movie: movieDetails,
          watchedAt: rating.watchedAt,
        };
      })
    );
    
    // Filter out any movies that couldn't be found
    const finalActivity = activityWithMovieDetails.filter(item => item.movie && item.movie.title !== 'Unknown Movie');

    return { activity: finalActivity };
  }
);
