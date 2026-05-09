import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const firebaseErrorMessages: Record<string, string> = {
  'auth/invalid-credential': 'Email o contraseña incorrectos. Si no tenés cuenta todavía, registrate.',
  'auth/user-not-found': 'No existe una cuenta con ese email. ¿Querés registrarte?',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El email ingresado no es válido.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.',
  'auth/network-request-failed': 'Sin conexión a internet. Revisá tu red.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/requires-recent-login': 'Por seguridad, volvé a iniciar sesión para continuar.',
  'auth/popup-closed-by-user': 'Cerraste la ventana antes de completar el inicio de sesión.',
};

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code ?? '';
    return firebaseErrorMessages[code] ?? error.message;
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}
