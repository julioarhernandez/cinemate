
export interface MediaItem {
  id: number;
  title: string;
  year: string;
  genre?: string;
  rating: number;
  imageUrl: string;
  imageHint: string;
  synopsis?: string; // Optional synopsis for movie details
  mediaType: 'movie' | 'tv';
}

export const movies: MediaItem[] = [
    {
      id: 1,
      title: 'Cosmic Echo',
      year: '2024',
      genre: 'Sci-Fi',
      rating: 8.4,
      imageUrl: 'https://picsum.photos/400/600?random=1',
      imageHint: 'sci-fi movie poster',
      mediaType: 'movie',
    },
    {
      id: 2,
      title: 'Midnight Whispers',
      year: '2023',
      genre: 'Thriller',
      rating: 9.1,
      imageUrl: 'https://picsum.photos/400/600?random=2',
      imageHint: 'thriller movie poster',
      mediaType: 'movie',
    },
    {
      id: 3,
      title: 'The Last Stand',
      year: '2024',
      genre: 'Action',
      rating: 7.2,
      imageUrl: 'https://picsum.photos/400/600?random=3',
      imageHint: 'action movie poster',
      mediaType: 'movie',
    },
    {
      id: 4,
      title: 'A Love for Stars',
      year: '2022',
      genre: 'Romance',
      rating: 8.8,
      imageUrl: 'https://picsum.photos/400/600?random=4',
      imageHint: 'romance movie poster',
      mediaType: 'movie',
    },
    {
      id: 5,
      title: 'Chronicles of Nowhere',
      year: '2023',
      genre: 'Fantasy',
      rating: 8.1,
      imageUrl: 'https://picsum.photos/400/600?random=5',
      imageHint: 'fantasy movie poster',
      mediaType: 'movie',
    },
    {
      id: 6,
      title: 'The Glimmering',
      year: '2024',
      genre: 'Horror',
      rating: 5.5,
      imageUrl: 'https://picsum.photos/400/600?random=6',
      imageHint: 'horror movie poster',
      mediaType: 'movie',
    },
     {
      id: 7,
      title: 'Detective Miles',
      year: '2021',
      genre: 'Crime',
      rating: 8.0,
      imageUrl: 'https://picsum.photos/400/600?random=7',
      imageHint: 'crime movie poster',
      mediaType: 'movie',
    },
     {
      id: 8,
      title: 'Journey to the Sun',
      year: '2022',
      genre: 'Adventure',
      rating: 8.9,
      imageUrl: 'https://picsum.photos/400/600?random=8',
      imageHint: 'adventure movie poster',
      mediaType: 'movie',
    },
    {
      id: 9,
      title: 'Memento',
      year: '2000',
      genre: 'Thriller',
      rating: 8.5,
      imageUrl: 'https://picsum.photos/400/600?random=9',
      imageHint: 'thriller movie poster dark',
      mediaType: 'movie',
    }
  ];

  export const genres: { id: number; name: string }[] = [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Sci-Fi' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
    // TV genres (some overlap)
    { id: 10759, name: 'Action & Adventure' },
    { id: 10762, name: 'Kids' },
    { id: 10763, name: 'News' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 10767, name: 'Talk' },
    { id: 10768, name: 'War & Politics' },
  ];
