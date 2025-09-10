
'use server';

/**
 * @fileOverview A Genkit flow for retrieving a feed of movie-watching activities from a user's friends.
 *
 * This file defines the logic to fetch recent movie ratings from a user's friends,
 * providing a social feed of what friends have been watching. It can fetch activity
 * for all friends or a specific friend, and allows for filtering by rating and time.
 *
 * @exports {getFriendActivity} - The main function to fetch the friend activity feed.
 * @exports {FriendActivityInput} - The Zod schema for the input of the getFriendActivity function.
 * @exports {FriendActivityOutput} - The Zod schema for the output of the getFriendActivity function.
 * @exports {FriendActivityItem} - The TypeScript type for a single item in the activity feed.
 */

import { z } from 'zod';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { getFriends } from '@/ai/flows/get-friends';
import { UserSchema, type User } from '@/ai/schemas/user-schemas';


// Define the schema for a single activity item
const FriendActivityItemSchema = z.object({
  friend: UserSchema,
  movie: z.custom<MovieDetailsOutput>(),
  rating: z.number(),
  watchedAt: z.custom<Timestamp>(),
  notes: z.string().optional(),
});
export type FriendActivityItem = z.infer<typeof FriendActivityItemSchema>;

// Define the input schema for the flow
export const FriendActivityInputSchema = z.object({
  userId: z.string().describe("The ID of the user whose friend activity is being requested."),
  friendId: z.string().optional().describe("Optional. The ID of a specific friend to fetch activity for."),
  ratingRange: z.tuple([z.number(), z.number()]).optional().describe("Optional. A tuple representing the min and max rating to filter by."),
  timeRange: z.enum(['all', 'week', 'month', 'year']).optional().describe("Optional. The time range to filter activity by."),
});
export type FriendActivityInput = z.infer<typeof FriendActivityInputSchema>;


// Define the output schema for the flow
export const FriendActivityOutputSchema = z.object({
  activity: z.array(FriendActivityItemSchema),
});
export type FriendActivityOutput = z.infer<typeof FriendActivityOutputSchema>;


/**
 * Fetches and processes friend activity data.
 * @param input - The input parameters for fetching friend activity.
 * @returns A promise that resolves to the friend activity output.
 */
export async function getFriendActivity(input: FriendActivityInput): Promise<FriendActivityOutput> {
  const { userId, friendId, ratingRange, timeRange } = input;
  let friendsToQuery: User[] = [];

  // 1. Determine which friends to query for
  if (friendId) {
    // If a specific friendId is provided, fetch only that friend's data.
    const friendDocRef = doc(db, 'users', userId, 'friends', friendId);
    const friendDoc = await getDoc(friendDocRef);
    if (friendDoc.exists()) {
      friendsToQuery.push({ id: friendDoc.id, ...friendDoc.data() } as User);
    }
  } else {
    // Otherwise, fetch all of the user's friends.
    const friendsResult = await getFriends({ userId });
    friendsToQuery = friendsResult.friends;
  }

  // If there are no friends to query, return an empty activity list.
  if (friendsToQuery.length === 0) {
    return { activity: [] };
  }

  // 2. Fetch recent ratings for all friends in parallel
  let allRatings: {
    friend: User;
    movieId: string;
    mediaType: 'movie' | 'tv';
    rating: number;
    watchedAt: Timestamp;
    notes?: string;
  }[] = [];

  const ratingQueries = friendsToQuery.map(async (friend) => {
    const ratingsRef = collection(db, 'users', friend.id, 'ratings');
    let q = query(
      ratingsRef,
      where('watched', '==', true),
      where('isPrivate', '!=', true), // Exclude private ratings
      orderBy('updatedAt', 'desc'),
      limit(20)
    );
    
    return getDocs(q);
  });
  
  const querySnapshots = await Promise.all(ratingQueries);

  querySnapshots.forEach((snapshot, index) => {
    const friend = friendsToQuery[index];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allRatings.push({
        friend: friend,
        movieId: doc.id,
        mediaType: data.mediaType || 'movie',
        rating: data.rating || 0,
        watchedAt: data.updatedAt,
        notes: data.notes || '',
      });
    });
  });


  // 3. Sort all activities by date and take the most recent ones.
  allRatings.sort((a, b) => b.watchedAt.toMillis() - a.watchedAt.toMillis());
  const latestRatings = allRatings.slice(0, 20);

  // 4. Fetch movie details for the latest ratings.
  const activityWithMovieDetails = await Promise.all(
    latestRatings.map(async (rating) => {
      const movieDetails = await getMovieDetails({
        id: parseInt(rating.movieId, 10),
        mediaType: rating.mediaType,
      });
      if (movieDetails && movieDetails.title !== 'Unknown Media') {
        return {
          friend: rating.friend,
          movie: movieDetails,
          rating: rating.rating,
          watchedAt: rating.watchedAt,
          notes: rating.notes,
        };
      }
      return null;
    })
  );
  
  // 5. Filter out any null results and return the final list.
  const finalActivity = activityWithMovieDetails.filter((item): item is FriendActivityItem => item !== null);
  
  return { activity: finalActivity };
}
