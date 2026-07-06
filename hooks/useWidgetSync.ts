import * as React from 'react';
import { AppState } from 'react-native';
import type { Unsubscribe } from 'firebase/firestore';
import { saveGroupsList } from '@/widgets/updateWidget';
import { subscribeToGroupPosts, getGroupPosts } from '@/lib/posts';
import { syncGroupWidgetData } from '@/lib/widgetSyncService';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { registerBackgroundWidgetSync } from '@/tasks/backgroundWidgetSync';

/** Mantiene el widget sincronizado con Firestore (tiempo real + background). */
export function useWidgetSync() {
  const { user } = useAuthStore();
  const { groups, fetchGroups } = useGroupsStore();

  React.useEffect(() => {
    if (user) fetchGroups(user.id);
  }, [user, fetchGroups]);

  React.useEffect(() => {
    if (!user?.id) return;
    void registerBackgroundWidgetSync().catch(() => {});
  }, [user?.id]);

  React.useEffect(() => {
    if (groups.length === 0) return;
    saveGroupsList(groups.map((g) => ({ id: g.id, name: g.name })));
  }, [groups]);

  // Escucha en tiempo real TODOS los walls (no solo el activo).
  React.useEffect(() => {
    if (!user?.id || groups.length === 0) return;

    const debouncers = new Map<string, ReturnType<typeof setTimeout>>();
    const unsubs: Unsubscribe[] = [];

    for (const group of groups) {
      const unsub = subscribeToGroupPosts(group.id, (posts) => {
        const pending = debouncers.get(group.id);
        if (pending) clearTimeout(pending);

        debouncers.set(
          group.id,
          setTimeout(() => {
            void syncGroupWidgetData(group, posts);
          }, 500),
        );
      });
      unsubs.push(unsub);
    }

    return () => {
      for (const unsub of unsubs) unsub();
      for (const timer of debouncers.values()) clearTimeout(timer);
    };
  }, [user?.id, groups]);

  // Respaldo al abrir la app o volver a primer plano.
  React.useEffect(() => {
    if (!user?.id || groups.length === 0) return;

    let cancelled = false;
    const run = async () => {
      if (!user?.id) return;
      for (const group of groups) {
        try {
          const posts = await getGroupPosts(group.id);
          if (cancelled) return;
          await syncGroupWidgetData(group, posts);
        } catch {
          // seguir con el resto
        }
      }
    };

    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [user?.id, groups]);
}
