
export const RATING_SCALE = [
  {
    value: 1,
    emoji: '🤮',
    label: 'Terrible',
    description: 'Waste of time.',
  },
  {
    value: 2,
    emoji: '😒',
    label: 'Meh',
    description: 'Not great, wouldn’t recommend.',
  },
  {
    value: 3,
    emoji: '🙂',
    label: 'Okay',
    description: 'Watchable, but nothing special.',
  },
  {
    value: 4,
    emoji: '👍',
    label: 'Good',
    description: 'Solid movie, enjoyable.',
  },
  {
    value: 5,
    emoji: '🤩',
    label: 'Loved it',
    description: 'Amazing, highly recommend.',
  },
];

export function getRatingInfo(ratingValue: number | undefined) {
  if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
    return null;
  }
  return RATING_SCALE.find(r => r.value === ratingValue) || null;
}
