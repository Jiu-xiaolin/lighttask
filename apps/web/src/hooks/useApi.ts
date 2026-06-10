import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// ---- Dashboard ----
export function useDashboardFull() {
  return useQuery({ queryKey: ["dashboard-full"], queryFn: () => api("/dashboard-full"), staleTime: 30_000 });
}
export function useGanttV2() {
  return useQuery({ queryKey: ["gantt-v2"], queryFn: () => api("/dashboard/gantt-v2"), staleTime: 60_000 });
}

// ---- Projects ----
export function useProjects(filter?: string, group?: string) {
  const params = [filter && `filter=${filter}`, group && `group=${encodeURIComponent(group)}`].filter(Boolean).join("&");
  return useQuery({ queryKey: ["projects", filter, group], queryFn: () => api(`/projects${params ? `?${params}` : ""}`), staleTime: 30_000 });
}
export function useProjectGroups() {
  return useQuery({ queryKey: ["project-groups"], queryFn: () => api("/project-groups"), staleTime: 120_000 });
}

// ---- Tasks ----
export function useTasks(projectId: string) {
  return useQuery({ queryKey: ["tasks", projectId], queryFn: () => api(`/projects/${projectId}/tasks`), enabled: !!projectId, staleTime: 15_000 });
}

// ---- Files ----
export function useFiles(projectId: string) {
  return useQuery({ queryKey: ["files", projectId], queryFn: () => api(`/projects/${projectId}/files`), enabled: !!projectId, staleTime: 30_000 });
}

// ---- Admin ----
export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: () => api("/admin/health"), staleTime: 30_000, refetchInterval: 30_000 });
}
export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => api("/admin/notifications"), staleTime: 60_000 });
}

// ---- Mutations ----
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: any) => api("/projects", { method: "POST", body: JSON.stringify(body) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); qc.invalidateQueries({ queryKey: ["project-groups"] }); } });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: any) => api(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", projectId] }); qc.invalidateQueries({ queryKey: ["dashboard-full"] }); } });
}
