export type User = {
  id: string;
  email: string;
  nickname: string;
  profileImage?: string;
  height?: number; // cm
  weight?: number; // kg
  age?: number;
  gender?: 'male' | 'female' | 'other';
  totalDistance: number;
  totalRuns: number;
  level: number;
};

export type Run = {
  id: string;
  userId: string;
  courseId?: string;
  date: Date;
  duration: number; // in seconds
  distance: number; // in km
  calories: number;
  pace: number; // min per km
  route?: [number, number][]; // GPS coordinates
};

export type Course = {
  id: string;
  name: string;
  description: string;
  distance: number;
  distanceString?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  difficultyString?: string;
  estimatedTime: number;
  location: string;
  startPoint: [number, number];
  route: [number, number][];
  rating?: number;
  reviews?: number;
  isFavorite?: boolean;
  avgPace?: number;
  expectedCalories?: number;
};

export type Post = {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  image?: string;
  distance?: number;
  duration?: number;
  likes: number;
  comments: number;
  createdAt: Date;
  isLiked?: boolean;
};

export type Comment = {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  createdAt: Date;
};

export type WeeklyGoal = {
  targetDistance: number;
  targetRuns: number;
  currentDistance: number;
  currentRuns: number;
};

export type Weather = {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  humidity: number;
  windSpeed: number;
};