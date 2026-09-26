import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export function useReview(id) { return useQuery({ queryKey: ["review", id], queryFn: async () => (await api.get(`/api/reviews/${id}`)).data.review, enabled: Boolean(id) }); }
