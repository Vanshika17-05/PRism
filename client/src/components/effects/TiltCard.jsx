import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function TiltCard({ children, className = "", ...props }) {
  const reduce = useReducedMotion(); const rotateX = useSpring(useMotionValue(0), { stiffness: 250, damping: 24 }); const rotateY = useSpring(useMotionValue(0), { stiffness: 250, damping: 24 });
  function move(event) { if (reduce) return; const rect = event.currentTarget.getBoundingClientRect(); rotateY.set(((event.clientX - rect.left) / rect.width - .5) * 12); rotateX.set(-((event.clientY - rect.top) / rect.height - .5) * 12); }
  function reset() { rotateX.set(0); rotateY.set(0); }
  return <motion.div onMouseMove={move} onMouseLeave={reset} style={{ rotateX, rotateY, transformPerspective: 900 }} className={cn("clay-card", className)} {...props}>{children}</motion.div>;
}
