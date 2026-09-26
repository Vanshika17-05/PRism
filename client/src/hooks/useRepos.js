import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export function useRepos() { return useQuery({ queryKey: ["repos"], queryFn: async () => (await api.get("/api/repos")).data.repositories, staleTime: 30_000 }); }
