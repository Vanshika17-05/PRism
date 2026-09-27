import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
/** @typedef {import("@prism/shared-types").PaginatedResponse<import("@prism/shared-types").Review>} ReviewsResponse */
export function useReviews(filters = {}) {
  return useQuery({
    queryKey: ["reviews", filters],
    queryFn: async () =>
      (await api.get("/api/reviews", { params: filters })).data,
    staleTime: 20_000,
  });
}
