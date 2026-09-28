import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const OrganizationContext = createContext(null);
export function OrganizationProvider({ children }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["organizations"],
    enabled: !!user,
    queryFn: async () =>
      (await api.get("/api/organizations")).data.organizations,
  });
  const saved = localStorage.getItem("prism_organization_id");
  const current =
    query.data?.find((org) => org._id === saved) || query.data?.[0] || null;
  const membership =
    current?.members?.find(
      (member) =>
        String(member.userId?._id || member.userId) === String(user?._id),
    ) || current?.members?.[0];
  useEffect(() => {
    if (current?._id) {
      localStorage.setItem("prism_organization_id", current._id);
      api.defaults.headers.common["X-Organization-Id"] = current._id;
    }
  }, [current?._id]);
  const value = useMemo(
    () => ({
      organizations: query.data || [],
      current,
      role: membership?.role || "member",
      loading: query.isLoading,
      error: query.error,
      retry: query.refetch,
      switchOrganization(id) {
        localStorage.setItem("prism_organization_id", id);
        api.defaults.headers.common["X-Organization-Id"] = id;
        queryClient.invalidateQueries();
      },
    }),
    [
      current,
      membership?.role,
      query.data,
      query.error,
      query.isLoading,
      query.refetch,
      queryClient,
    ],
  );
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
export const useOrganization = () => useContext(OrganizationContext);
