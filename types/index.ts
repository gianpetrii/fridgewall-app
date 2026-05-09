// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  pushToken?: string;
}

export interface Session {
  uid: string;
  email: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
}

// ─── FridgeWall ───────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  members: string[];
  coverUrl?: string;
  createdAt: number;
}

export interface Post {
  id: string;
  groupId: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  photoUrl: string;
  caption?: string;
  createdAt: number;
}

export type ReactionType = 'heart' | 'laugh' | 'wow' | 'sad' | 'photo_reply';

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  userName?: string;
  type: ReactionType;
  photoUrl?: string;
  createdAt: number;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export type ColorScheme = 'light' | 'dark' | 'system';

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordForm {
  email: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
}
