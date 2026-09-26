import { motion, useScroll } from "framer-motion";
export function ScrollProgressBar() { const { scrollYProgress } = useScroll(); return <motion.div className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-accent" style={{ scaleX: scrollYProgress }} />; }
