import { motion, useReducedMotion } from "motion/react";

/**
 * The EduBatch mark: an E drawn in three pen strokes, whose middle arm finishes
 * as an attendance tick. Same geometry as /public/favicon.svg.
 */
const STROKES = [
  "M8.5 6.5v19", // spine
  "M8.5 6.5h13", // top arm
  "M8.5 25.5h13", // bottom arm
  "M8.5 16h5l2.8 3.2 9.2-9.7", // middle arm, finishing as a tick
];

export const LogoMark = ({ size = 32, className = "", draw = false, delay = 0, color = "currentColor" }) => {
  const reduce = useReducedMotion();
  const animate = draw && !reduce;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {STROKES.map((d, i) =>
        animate ? (
          <motion.path
            key={d}
            d={d}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { delay: delay + i * 0.16, duration: i === 3 ? 0.42 : 0.22, ease: [0.65, 0, 0.35, 1] },
              opacity: { delay: delay + i * 0.16, duration: 0.01 },
            }}
          />
        ) : (
          <path key={d} d={d} />
        )
      )}
    </svg>
  );
};

// Mark + name, used in the sidebar, mobile bar and auth pages
export const Logo = ({ size = 30, className = "", textClassName = "text-xl" }) => (
  <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
    <LogoMark size={size} />
    <span className={`font-serif font-semibold tracking-tight ${textClassName}`}>EduBatch</span>
  </span>
);

export default Logo;
