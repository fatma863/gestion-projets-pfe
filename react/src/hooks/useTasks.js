import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── List tasks for a project ─────────────────────────
export function useTasks(projectId, options = {}) {
  return useQuery({
    queryKey: ['tasks', String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/tasks?all=1`).then((r) => r.data.tasks ?? r.data.data ?? r.data),
    enabled: !!projectId,
    ...options,
  });
}

// ─── Single task detail ───────────────────────────────
export function useTask(taskId, options = {}) {
  return useQuery({
    queryKey: ['task', String(taskId)],
    queryFn: () =>
      api.get(`/tasks/${taskId}`).then((r) => r.data.task ?? r.data.data ?? r.data),
    enabled: !!taskId,
    ...options,
  });
}

// ─── Create task ──────────────────────────────────────
export function useCreateTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', String(projectId)] });
    },
  });
}

// ─── Update task ──────────────────────────────────────
export function useUpdateTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }) => api.put(`/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', String(projectId)] });
    },
  });
}

// ─── Delete task ──────────────────────────────────────
export function useDeleteTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', String(projectId)] });
    },
  });
}

// ─── Move task (Kanban) ───────────────────────────────
export function useMoveTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, statusId, order }) =>
      api.patch(`/tasks/${taskId}/move`, { status_id: statusId, kanban_order: order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', String(projectId)] });
    },
  });
}
