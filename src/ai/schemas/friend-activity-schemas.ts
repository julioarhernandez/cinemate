
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import type { MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { UserSchema } from '@/ai/schemas/user-schemas';


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
