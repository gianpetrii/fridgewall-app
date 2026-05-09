import { create } from 'zustand';
import {
  createPost,
  deletePost,
  subscribeToGroupPosts,
  uploadPostPhoto,
  addReaction,
  getPostReactions,
} from '@/lib/posts';
import type { Post, Reaction, ReactionType } from '@/types';
import type { Unsubscribe } from 'firebase/firestore';

interface PostsStore {
  posts: Post[];
  reactions: Record<string, Reaction[]>;
  isUploading: boolean;
  uploadProgress: number;
  isLoading: boolean;
  subscribeToGroup: (groupId: string) => Unsubscribe;
  uploadAndPost: (
    groupId: string,
    userId: string,
    userName: string | undefined,
    localUri: string,
    caption?: string,
  ) => Promise<void>;
  removePost: (groupId: string, postId: string, photoUrl: string) => Promise<void>;
  react: (groupId: string, postId: string, userId: string, userName: string | undefined, type: ReactionType) => Promise<void>;
  loadReactions: (groupId: string, postId: string) => Promise<void>;
}

export const usePostsStore = create<PostsStore>((set, get) => ({
  posts: [],
  reactions: {},
  isUploading: false,
  uploadProgress: 0,
  isLoading: false,

  subscribeToGroup: (groupId) => {
    set({ isLoading: true, posts: [] });
    const unsub = subscribeToGroupPosts(groupId, (posts) => {
      set({ posts, isLoading: false });
    });
    return unsub;
  },

  uploadAndPost: async (groupId, userId, userName, localUri, caption) => {
    set({ isUploading: true, uploadProgress: 0 });
    try {
      const photoUrl = await uploadPostPhoto(groupId, userId, localUri, (pct) =>
        set({ uploadProgress: pct }),
      );
      await createPost(groupId, userId, userName, photoUrl, caption);
    } finally {
      set({ isUploading: false, uploadProgress: 0 });
    }
  },

  removePost: async (groupId, postId, photoUrl) => {
    await deletePost(groupId, postId, photoUrl);
    set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) }));
  },

  react: async (groupId, postId, userId, userName, type) => {
    await addReaction(groupId, postId, userId, userName, type);
    await get().loadReactions(groupId, postId);
  },

  loadReactions: async (groupId, postId) => {
    const reactions = await getPostReactions(groupId, postId);
    set((state) => ({ reactions: { ...state.reactions, [postId]: reactions } }));
  },
}));
