import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useOrganization } from "@/context/OrganizationContext";
import { MagneticButton } from "@/components/effects/MagneticButton";

export default function TeamSettings() {
  const { current, role } = useOrganization();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const team = useQuery({
    queryKey: ["organization", current?._id],
    enabled: !!current,
    queryFn: async () =>
      (await api.get(`/api/organizations/${current._id}`)).data,
  });
  const invite = useMutation({
    mutationFn: () =>
      api.post(`/api/organizations/${current._id}/invite`, {
        email,
        role: inviteRole,
      }),
    onSuccess: ({ data }) => {
      toast.success("Invite created; link logged by server");
      navigator.clipboard?.writeText(data.inviteLink);
      setEmail("");
      queryClient.invalidateQueries({
        queryKey: ["organization", current._id],
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["organization", current?._id] });
  const changeRole = useMutation({
    mutationFn: ({ userId, nextRole }) =>
      api.patch(`/api/organizations/${current._id}/members/${userId}`, {
        role: nextRole,
      }),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (userId) =>
      api.delete(`/api/organizations/${current._id}/members/${userId}`),
    onSuccess: () => {
      toast.success("Member removed");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const canInvite = role === "owner" || role === "admin";
  return (
    <div>
      <p className="text-sm font-bold text-accent-dark">TEAM SETTINGS</p>
      <h1 className="mt-1 text-3xl font-black">{current?.name}</h1>
      {canInvite && (
        <section className="clay-card mt-7 p-6">
          <h2 className="text-lg font-black">Invite teammate</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              className="clay-input flex-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
            <select
              className="clay-input w-32"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <MagneticButton
              disabled={!email || invite.isPending}
              onClick={() => invite.mutate()}
            >
              Send invite
            </MagneticButton>
          </div>
        </section>
      )}
      {!canInvite && (
        <p
          className="clay-control mt-7 p-4 text-sm text-muted"
          title="Admin or owner role required"
        >
          Your member role is read-only. Ask an admin to manage teammates.
        </p>
      )}
      <section className="clay-card mt-6 p-6">
        <h2 className="text-lg font-black">Members</h2>
        <div className="mt-4 divide-y divide-border">
          {team.data?.organization.members.map((member) => {
            const user = member.userId?.username ? member.userId : member.user;
            const userId = String(member.userId?._id || member.userId);
            return (
              <div
                className="flex items-center justify-between gap-3 py-4"
                key={userId}
              >
                <div className="flex items-center gap-3">
                  <img
                    className="size-9 rounded-full object-cover"
                    src={
                      user?.avatarUrl ||
                      user?.githubAvatarUrl ||
                      `https://github.com/${user?.username}.png`
                    }
                    alt=""
                  />
                  <div>
                    <p className="font-bold">
                      {user?.displayName || user?.name || user?.username}
                    </p>
                    <p className="text-xs text-muted">{user?.email}</p>
                  </div>
                </div>
                {role === "owner" && member.role !== "owner" ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="clay-input w-28 text-xs"
                      value={member.role}
                      onChange={(event) =>
                        changeRole.mutate({
                          userId,
                          nextRole: event.target.value,
                        })
                      }
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      className="text-xs font-bold text-high"
                      onClick={() => remove.mutate(userId)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="clay-badge capitalize">{member.role}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {!!team.data?.invites.length && (
        <section className="clay-card mt-6 p-6">
          <h2 className="text-lg font-black">Pending invites</h2>
          {team.data.invites.map((item) => (
            <div
              className="mt-3 flex justify-between text-sm"
              key={item._id || item.email}
            >
              <span>{item.email}</span>
              <span className="capitalize text-muted">{item.role}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
