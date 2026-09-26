import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
export function useStats(repositories = []) { return useQueries({ queries: repositories.map((repo) => ({ queryKey: ["stats", repo._id], queryFn: async () => (await api.get(`/api/repos/${repo._id}/stats`)).data, staleTime: 30_000 })) }); }
