import { ArrowLeft, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GradientMeshBackground } from "@/components/effects/GradientMeshBackground";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { useAuth } from "@/context/AuthContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const destination = user ? "/dashboard/overview" : "/";
  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-bg p-5 text-primary">
      <GradientMeshBackground />
      <section className="clay-card relative z-10 w-full max-w-xl p-8 text-center sm:p-12">
        <span className="clay-icon mx-auto text-accent">
          <Compass size={21} />
        </span>
        <p className="mt-6 text-sm font-black tracking-[.2em] text-accent-dark">
          404
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          This page doesn&apos;t exist
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">
          The link may be outdated, or the page may have moved somewhere else.
        </p>
        <MagneticButton
          className="mx-auto mt-7"
          onClick={() => navigate(destination)}
        >
          <ArrowLeft size={16} /> {user ? "Back to overview" : "Back home"}
        </MagneticButton>
      </section>
    </main>
  );
}
