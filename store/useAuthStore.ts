import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useGroupsStore } from '@/store/useGroupsStore';
import { usePostsStore } from '@/store/usePostsStore';
import type { AuthState, User, Session } from '@/types';

const GOOGLE_SIGNIN_ENABLED = false;

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();

          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name: userData?.name ?? firebaseUser.displayName ?? undefined,
            avatarUrl: userData?.avatarUrl ?? firebaseUser.photoURL ?? undefined,
            pushToken: userData?.pushToken,
          };

          const session: Session = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
          };

          set({ user, session, isInitialized: true });
        } else {
          set({ user: null, session: null, isInitialized: true });
        }
        resolve();
      });

      return unsubscribe;
    });
  },

  signInWithGoogle: async () => {
    if (!GOOGLE_SIGNIN_ENABLED) {
      throw new Error('Inicio de sesión con Google no está disponible por ahora.');
    }
    set({ isLoading: true });
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No se pudo obtener el token de Google');
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const { user: firebaseUser } = await signInWithCredential(auth, googleCredential);
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          name: firebaseUser.displayName ?? 'Usuario',
          email: firebaseUser.email,
          avatarUrl: firebaseUser.photoURL ?? null,
          pushToken: null,
          createdAt: serverTimestamp(),
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(firebaseUser, { displayName: name });
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name,
        email,
        avatarUrl: null,
        pushToken: null,
        createdAt: serverTimestamp(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      useGroupsStore.getState().reset();
      usePostsStore.getState().reset();
      await signOut(auth);
      set({ user: null, session: null });
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true });
    try {
      await sendPasswordResetEmail(auth, email);
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));
