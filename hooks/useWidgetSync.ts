import * as React from 'react';
import { saveWidgetData, saveWidgetDataForGroup, saveGroupsList } from '@/widgets/updateWidget';
import { buildWidgetPayload } from '@/widgets/buildPayload';
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
}
