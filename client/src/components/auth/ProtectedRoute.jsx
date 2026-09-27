import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShimmerSkeleton } from "@/components/effects/ShimmerSkeleton";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <ShimmerSkeleton className="h-28 w-72" />
      </div>
    );
  return user ? (
    children
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
