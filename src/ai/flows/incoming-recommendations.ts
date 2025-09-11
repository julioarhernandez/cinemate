
'use server';

/**
 * @fileOverview This file defines a function for fetching a user's incoming movie recommendations from friends.
 *
 * @exports getIncomingRecommendations - Fetches recommendations and their associated movie details.
 * @exports IncomingRecommendation - The type definition for a processed incoming recommendation.
 */

import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getMovieDetails, type MovieDetailsOutput } from './get-movie-details';

export interface IncomingRecommendation {
    id: string;
    movie: MovieDetailsOutput;
    from: {
        id: string;
        name: string;
        photoURL?: string;
    };
    createdAt: Timestamp;
}

export async function getIncomingRecommendations(userId: string): Promise<IncomingRecommendation[]> {
    if (!userId) {
        console.log("No user ID provided.");
        return [];
    }

    try {
        const recsRef = collection(db, 'users', userId, 'incomingRecommendations');
        const q = query(recsRef, orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return [];
        }

        const recommendationsPromises = snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const movieDetails = await getMovieDetails({
                id: data.movieId,
                mediaType: data.mediaType || 'movie',
            });
            
            if (!movieDetails || movieDetails.title === 'Unknown Media') {
                return null;
            }

            return {
                id: doc.id,
                movie: movieDetails,
                from: {
                    id: data.fromId,
                    name: data.fromName,
                    photoURL: data.fromPhotoURL,
                },
                createdAt: data.createdAt,
            };
        });

        const recommendations = await Promise.all(recommendationsPromises);
        
        // Filter out any null results (e.g., movie not found)
        return recommendations.filter((rec): rec is IncomingRecommendation => rec !== null);

    } catch (error) {
        console.error("Error fetching incoming recommendations:", error);
        // In case of an error, return an empty array to prevent crashing the UI.
        return [];
    }
}
