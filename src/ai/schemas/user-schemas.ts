
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().describe("The unique ID of the user."),
  displayName: z.string().optional().describe("The user's display name."),
  email: z.string().email().optional().describe("The user's email address."),
  photoURL: z.string().url().optional().describe("The URL of the user's profile picture."),
});

export type User = z.infer<typeof UserSchema>;
