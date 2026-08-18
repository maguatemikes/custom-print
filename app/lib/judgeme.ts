/**
 * Judge.me review types — plain module (safe to import from client components).
 * The actual fetching (which uses the PRIVATE token) lives in judgeme.server.ts.
 */
export type JudgemeReview = {
  id: number;
  name: string;
  when: string; // relative, e.g. "2 months ago"
  score: number; // 1..5
  body: string;
  photos: string[]; // hosted picture URLs
};

export type JudgemeReviews = {
  overall: number; // average rating (1 dp)
  total: number;
  distribution: Array<{stars: number; count: number}>;
  reviews: JudgemeReview[];
};

export const EMPTY_REVIEWS: JudgemeReviews = {
  overall: 0,
  total: 0,
  distribution: [5, 4, 3, 2, 1].map((stars) => ({stars, count: 0})),
  reviews: [],
};
