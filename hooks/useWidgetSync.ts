import * as React from 'react';
import { AppState } from 'react-native';
import { saveWidgetData, saveWidgetDataForGroup, saveGroupsList } from '@/widgets/updateWidget';
import { buildWidgetPayload } from '@/widgets/buildPayload';
import { getGroupPosts } from '@/lib/posts';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { usePostsStore } from '@/store/usePostsStore';

/** Mantiene el widget actualizado sin mostrar el feed en la app. */
export function useWidgetSync() {
  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups } = useGroupsStore();
  const { posts, subscribeToGroup } = usePostsStore();

  React.useEffect(() => {
    if (user) fetchGroups(user.id);
  }, [user, fetchGroups]);

  // Sincroniza la lista de grupos disponibles para la configuración del widget
  React.useEffect(() => {
    if (groups.length === 0) return;
    saveGroupsList(groups.map((g) => ({ id: g.id, name: g.name })));
  }, [groups]);

  React.useEffect(() => {
    if (!user?.id || !activeGroupId) return;
    return subscribeToGroup(activeGroupId);
  }, [activeGroupId, user?.id, subscribeToGroup]);

  React.useEffect(() => {
    if (posts.length === 0 || !activeGroupId) return;
    const activeGroup = groups.find((g) => g.id === activeGroupId);
    if (!activeGroup) return;
    const payload = buildWidgetPayload(posts, activeGroup);
    // Debounce: si posts/groups cambian varias veces en ráfaga (múltiples
    // snapshots de Firestore), solo guardamos una vez al final.
    const timer = setTimeout(() => {
      saveWidgetData(payload);
      saveWidgetDataForGroup(activeGroupId, payload);
    }, 500);
    return () => clearTimeout(timer);
  }, [posts, activeGroupId, groups]);

  // Sincroniza TODOS los grupos del usuario (no solo el activo) reconstruyendo
  // cada widget desde los posts reales de Firestore. Así el widget refleja
  // borrados, vencimientos (>24h) y evita arrastrar fotos de otra wall.
  // Corre al montar y cada vez que la app vuelve a primer plano.
  React.useEffect(() => {
    if (!user?.id || groups.length === 0) return;

    let cancelled = false;
    const syncAllGroups = async () => {
      for (const group of groups) {
        try {
          const groupPosts = await getGroupPosts(group.id);
          if (cancelled) return;
          await saveWidgetDataForGroup(group.id, buildWidgetPayload(groupPosts, group));
        } catch {
          // grupo individual falla: seguimos con el resto
        }
      }
    };

    syncAllGroups();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncAllGroups();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [user?.id, groups]);
}
