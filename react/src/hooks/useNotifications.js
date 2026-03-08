import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useNotifications(options = {}) {
  const { perPage = 50, unreadOnly = false, queryOptions = {} } = options;
  return useQuery({
    queryKey: ['notifications', { perPage, unreadOnly }],
    queryFn: () =>
      api
        .get('/notifications', { params: { per_page: perPage, unread_only: unreadOnly ? 1 : 0 } })
        .then((r) => r.data),
    ...queryOptions,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      api.get('/notifications?per_page=1').then((r) => r.data.unread_count ?? 0),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_data, id) => {
      // Update cached data in-place so notifications don't disappear
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old) => {
        if (!old) return old;
        // Handle the unread-count query (raw number)
        if (typeof old === 'number') return Math.max(0, old - 1);
        // Handle notification list queries
        if (old.notifications) {
          return {
            ...old,
            unread_count: Math.max(0, (old.unread_count ?? 0) - 1),
            notifications: old.notifications.map((n) =>
              n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            ),
          };
        }
        return old;
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      const now = new Date().toISOString();
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old) => {
        if (!old) return old;
        if (typeof old === 'number') return 0;
        if (old.notifications) {
          return {
            ...old,
            unread_count: 0,
            notifications: old.notifications.map((n) =>
              n.read_at ? n : { ...n, read_at: now }
            ),
          };
        }
        return old;
      });
    },
  });
}
