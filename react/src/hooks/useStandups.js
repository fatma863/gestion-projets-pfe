import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useStandups(sprintId, date, options = {}) {
  return useQuery({
    queryKey: ['standups', String(sprintId), date || 'all'],
    queryFn: () => api.get(`/sprints/${sprintId}/standups`, { params: date ? { date } : {} }).then((r) => r.data.standups ?? r.data),
    enabled: !!sprintId,
    ...options,
  });
}

export function useSubmitStandup(sprintId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/sprints/${sprintId}/standups`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['standups', String(sprintId)] });
      qc.invalidateQueries({ queryKey: ['standup-status', String(sprintId)] });
    },
  });
}

export function useMyStandupStatus(sprintId, options = {}) {
  return useQuery({
    queryKey: ['standup-status', String(sprintId)],
    queryFn: () => api.get(`/sprints/${sprintId}/standups/my-status`).then((r) => r.data),
    enabled: !!sprintId,
    ...options,
  });
}
