import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { MagneticButton } from "@/components/effects/MagneticButton";
export default function AcceptInvite() {
  const { token } = useParams(); const navigate = useNavigate();
  const accept = useMutation({ mutationFn: () => api.post(`/api/invites/${token}/accept`), onSuccess: () => navigate("/dashboard/overview") });
  return <main className="grid min-h-screen place-items-center bg-bg p-5"><section className="clay-card max-w-md p-8 text-center"><h1 className="text-2xl font-black">Join PRism workspace</h1><p className="mt-3 text-sm text-muted">Accept this invitation using your signed-in GitHub account.</p><MagneticButton className="mt-6" disabled={accept.isPending} onClick={() => accept.mutate()}>Accept invitation</MagneticButton>{accept.isError && <p className="mt-3 text-sm text-high">{accept.error.message}</p>}</section></main>;
}
