import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function useGithubAppInstall() {
  const config = useQuery({
    queryKey: ["auth-config"],
    queryFn: async () => (await api.get("/api/auth/config")).data,
    staleTime: Infinity,
  });
  const connectRepository = useCallback(() => {
    if (config.data?.githubAppInstallUrl)
      window.location.assign(config.data.githubAppInstallUrl);
    else toast.error("GITHUB_APP_SLUG is not configured on the server");
  }, [config.data?.githubAppInstallUrl]);

  return {
    connectRepository,
    installUrl: config.data?.githubAppInstallUrl,
    isLoading: config.isLoading,
    error: config.error,
    refetch: config.refetch,
  };
}
