
import { z } from 'zod';
import { UserSchema } from '@/ai/schemas/user-schemas';

// Define the input schema for the flow
export const GetFriendsInputSchema = z.object({
  userId: z.string().describe("The ID of the user whose friends are being requested."),
});
export type GetFriendsInput = z.infer<typeof GetFriendsInputSchema>;


// Define the output schema for the flow
export const GetFriendsOutputSchema = z.object({
  friends: z.array(UserSchema),
});
export type GetFriendsOutput = z.infer<typeof GetFriendsOutputSchema>;
