export interface Movie {
  title: string;
  year: string;
  genre: string;
  rating: number;
  imageUrl: string;
  imageHint: string;
}

export const movies: Movie[] = [
    {
      title: 'Cosmic Echo',
      year: '2024',
      genre: 'Sci-Fi',
      rating: 4,
      imageUrl: 'https://picsum.photos/400/600?random=1',
      imageHint: 'sci-fi movie poster',
    },
    {
      title: 'Midnight Whispers',
      year: '2023',
      genre: 'Thriller',
      rating: 5,
      imageUrl: 'https://picsum.photos/400/600?random=2',
      imageHint: 'thriller movie poster',
    },
    {
      title: 'The Last Stand',
      year: '2024',
      genre: 'Action',
      rating: 3,
      imageUrl: 'https://picsum.photos/400/600?random=3',
      imageHint: 'action movie poster',
    },
    {
      title: 'A Love for Stars',
      year: '2022',
      genre: 'Romance',
      rating: 5,
      imageUrl: 'https://picsum.photos/400/600?random=4',
      imageHint: 'romance movie poster',
    },
    {
      title: 'Chronicles of Nowhere',
      year: '2023',
      genre: 'Fantasy',
      rating: 4,
      imageUrl: 'https://picsum.photos/400/600?random=5',
      imageHint: 'fantasy movie poster',
    },
    {
      title: 'The Glimmering',
      year: '2024',
      genre: 'Horror',
      rating: 2,
      imageUrl: 'https://picsum.photos/400/600?random=6',
      imageHint: 'horror movie poster',
    },
     {
      title: 'Detective Miles',
      year: '2021',
      genre: 'Crime',
      rating: 4,
      imageUrl: 'https://picsum.photos/400/600?random=7',
      imageHint: 'crime movie poster',
    },
     {
      title: 'Journey to the Sun',
      year: '2022',
      genre: 'Adventure',
      rating: 5,
      imageUrl: 'https://picsum.photos/400/600?random=8',
      imageHint: 'adventure movie poster',
    },
    {
      title: 'Memento',
      year: '2000',
      genre: 'Thriller',
      rating: 5,
      imageUrl: 'https://picsum.photos/400/600?random=9',
      imageHint: 'thriller movie poster dark',
    }
  ];
  