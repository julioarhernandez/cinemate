
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { type MovieDetailsOutput } from '@/ai/flows/get-movie-details';

// Define the schema for a single activity item
const FriendActivityItemSchema = z.object({
  friend: z.object({
    id: z.string(),
    displayName: z.string(),
    photoURL: z.string().optional(),
  }),
  movie: z.custom<MovieDetailsOutput>(),
  watchedAt: z.custom<Timestamp>(),
});

// Define the output schema for the flow
export const GetFriendActivityOutputSchema = z.object({
  activity: z.array(FriendActivityItemSchema),
});
export type GetFriendActivityOutput = z.infer<
  typeof GetFriendActivityOutputSchema
>;
