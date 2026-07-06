import type { Router } from 'expo-router';

const MAX_DISMISS = 12;

/** Cierra modales apilados en el root stack. */
export function dismissAllModals(router: Router): void {
  let guard = 0;
  while (router.canDismiss?.() && guard < MAX_DISMISS) {
    router.dismiss();
    guard += 1;
  }
}

/** Cierra modales apilados y vuelve al tab Inicio sin dejar el stack corrupto. */
export function exitToAppHome(router: Router): void {
  dismissAllModals(router);
  router.replace('/(app)/');
}

/** Abre un modal del root stack con stack limpio (p. ej. flujo desde widget). */
export function openRootModal(router: Router, href: string): void {
  dismissAllModals(router);
  setTimeout(() => {
    router.push(href as Parameters<Router['push']>[0]);
  }, 100);
}
