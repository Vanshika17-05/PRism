import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ExternalLink, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MagneticButton } from "@/components/effects/MagneticButton";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameError =
    displayName.length > 50
      ? "Display name must be 50 characters or fewer."
      : "";
  const changed =
    displayName !== (user?.displayName || "") || Boolean(file) || removePhoto;
  const shownAvatar =
    preview ||
    (removePhoto ? user?.githubAvatarUrl : user?.avatarUrl) ||
    user?.githubAvatarUrl ||
    `https://github.com/${user?.username}.png`;

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!allowedTypes.has(selected.type)) {
      toast.error("Choose a JPG, PNG, or WebP image");
      event.target.value = "";
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be 2 MB or smaller");
      event.target.value = "";
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setRemovePhoto(false);
  }

  async function save() {
    if (!changed || nameError) return;
    setSaving(true);
    try {
      let avatarUrl;
      if (file) {
        const form = new FormData();
        form.append("avatar", file);
        avatarUrl = (await api.post("/api/users/me/avatar", form)).data
          .avatarUrl;
      } else if (removePhoto) avatarUrl = "";
      const { data } = await api.patch("/api/users/me", {
        displayName,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });
      updateUser(data.user);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
        queryClient.invalidateQueries({ queryKey: ["organization"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-log"] }),
      ]);
      setFile(null);
      setPreview("");
      setRemovePhoto(false);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm font-bold text-accent-dark">PROFILE SETTINGS</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Your profile</h1>
      <p className="mt-2 text-sm text-muted">
        Choose how your identity appears across PRism.
      </p>
      <section className="clay-card mt-8 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-start">
          <div className="text-center">
            <button
              type="button"
              className="group relative block rounded-full"
              onClick={() => inputRef.current?.click()}
              aria-label="Choose profile photo"
            >
              <span className="clay-control block rounded-full p-2">
                <img
                  className="size-32 rounded-full object-cover"
                  src={shownAvatar}
                  alt="Profile preview"
                />
              </span>
              <span className="absolute inset-2 grid rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="m-auto text-white" size={24} />
              </span>
            </button>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseFile}
            />
            <button
              type="button"
              className="mt-3 text-xs font-bold text-accent-dark underline-offset-4 hover:underline"
              onClick={() => {
                if (preview) URL.revokeObjectURL(preview);
                setFile(null);
                setPreview("");
                setRemovePhoto(true);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove photo, use GitHub avatar
            </button>
            <p className="mt-2 text-[11px] text-muted">
              JPG, PNG or WebP · max 2 MB
            </p>
          </div>
          <div className="w-full flex-1 space-y-6">
            <label className="block">
              <span className="text-sm font-bold">Display name</span>
              <input
                className={`clay-input mt-2 w-full ${nameError ? "border-high" : ""}`}
                maxLength={51}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={user?.name || user?.username}
              />
              {nameError && (
                <span className="mt-2 block text-xs font-semibold text-high">
                  {nameError}
                </span>
              )}
              <span className="mt-2 block text-right text-xs text-muted">
                {displayName.length}/50
              </span>
            </label>
            <div className="clay-control flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <UserRound className="text-accent" size={19} />
                <div>
                  <p className="text-xs text-muted">Connected as</p>
                  <p className="font-bold">@{user?.username || "github"}</p>
                </div>
              </div>
              <a
                className="flex items-center gap-1 text-sm font-bold text-accent-dark"
                href={user?.githubUrl || `https://github.com/${user?.username}`}
                target="_blank"
                rel="noreferrer"
              >
                GitHub <ExternalLink size={14} />
              </a>
            </div>
            <MagneticButton
              disabled={!changed || Boolean(nameError) || saving}
              onClick={save}
            >
              {saving ? "Saving…" : "Save changes"}
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  );
}
