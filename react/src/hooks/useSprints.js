import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Sprints ────────────────────────────────────────────
export function useSprints(projectId, options = {}) {
  return useQuery({
    queryKey: ['sprints', String(projectId)],
    queryFn: () => api.get(`/projects/${projectId}/sprints`).then((r) => r.data.sprints ?? r.data),
    enabled: !!projectId,
    ...options,
  });
}

export function useSprint(sprintId, options = {}) {
  return useQuery({
    queryKey: ['sprint', String(sprintId)],
    queryFn: () => api.get(`/sprints/${sprintId}`).then((r) => r.data.sprint ?? r.data),
    enabled: !!sprintId,
    ...options,
  });
}

export function useCreateSprint(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/sprints`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints', String(projectId)] }),
  });
}

export function useUpdateSprint(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, data }) => api.put(`/sprints/${sprintId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints', String(projectId)] }),
  });
}

export function useDeleteSprint(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sprintId) => api.delete(`/sprints/${sprintId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints', String(projectId)] }),
  });
}

// ─── Backlog ────────────────────────────────────────────
export function useBacklog(projectId, options = {}) {
  return useQuery({
    queryKey: ['backlog', String(projectId)],
    queryFn: () => api.get(`/projects/${projectId}/backlog`).then((r) => r.data.tasks ?? r.data),
    enabled: !!projectId,
    ...options,
  });
}

// ─── Sprint task management ─────────────────────────────
export function useAddTasksToSprint(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, taskIds }) => api.post(`/sprints/${sprintId}/tasks`, { task_ids: taskIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints', String(projectId)] });
      qc.invalidateQueries({ queryKey: ['backlog', String(projectId)] });
      qc.invalidateQueries({ queryKey: ['sprint'] });
    },
  });
}

export function useRemoveTaskFromSprint(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, taskId }) => api.delete(`/sprints/${sprintId}/tasks/${taskId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints', String(projectId)] });
      qc.invalidateQueries({ queryKey: ['backlog', String(projectId)] });
      qc.invalidateQueries({ queryKey: ['sprint'] });
    },
  });
}

// ─── Burndown ───────────────────────────────────────────
export function useBurndown(sprintId, options = {}) {
  return useQuery({
    queryKey: ['burndown', String(sprintId)],
    queryFn: () => api.get(`/sprints/${sprintId}/burndown`).then((r) => r.data),
    enabled: !!sprintId,
    ...options,
  });
}
