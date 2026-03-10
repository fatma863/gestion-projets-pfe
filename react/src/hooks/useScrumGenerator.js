import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── AI Scrum Generator ─────────────────────────────────
export function useGenerateScrum(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/scrum/generate`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog-items', String(projectId)] });
      qc.invalidateQueries({ queryKey: ['sprints', String(projectId)] });
      qc.invalidateQueries({ queryKey: ['backlog', String(projectId)] });
    },
  });
}

// ─── Backlog Items (Epics + Stories) ────────────────────
export function useBacklogItems(projectId, options = {}) {
  return useQuery({
    queryKey: ['backlog-items', String(projectId)],
    queryFn: () => api.get(`/projects/${projectId}/backlog-items`).then((r) => r.data.backlog_items ?? r.data),
    enabled: !!projectId,
    ...options,
  });
}

export function useUpdateBacklogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) => api.put(`/backlog-items/${itemId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog-items'] });
    },
  });
}

export function useDeleteBacklogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => api.delete(`/backlog-items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog-items'] });
    },
  });
}

// ─── Sprint Analytics ───────────────────────────────────
export function useSprintAnalytics(sprintId, options = {}) {
  return useQuery({
    queryKey: ['sprint-analytics', String(sprintId)],
    queryFn: () => api.get(`/sprints/${sprintId}/analytics`).then((r) => r.data),
    enabled: !!sprintId,
    ...options,
  });
}

export function useSprintSuggestions(sprintId, options = {}) {
  return useQuery({
    queryKey: ['sprint-suggestions', String(sprintId)],
    queryFn: () => api.get(`/sprints/${sprintId}/ai-suggestions`).then((r) => r.data.suggestions ?? r.data),
    enabled: !!sprintId,
    ...options,
  });
}
