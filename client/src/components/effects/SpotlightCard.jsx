import { useRef } from "react";
import { cn } from "@/lib/utils";
export function SpotlightCard({ children, className = "", ...props }) { const ref = useRef(null); function move(event) { const rect = ref.current.getBoundingClientRect(); ref.current.style.setProperty("--spot-x", `${event.clientX - rect.left}px`); ref.current.style.setProperty("--spot-y", `${event.clientY - rect.top}px`); } return <section ref={ref} onMouseMove={move} className={cn("spotlight-card glass-card", className)} {...props}>{children}</section>; }
