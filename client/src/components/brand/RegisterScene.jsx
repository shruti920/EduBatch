import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/**
 * The login page's brand panel: a page from a coaching institute's register,
 * a fee receipt and a pinned notice, built from the same visual language as
 * the app. One orchestrated sequence on load: ticks are written in, a late
 * mark is highlighted, the receipt is stamped, the notice is pinned.
 */

const ROLL = [
  { name: "Aarav Sharma", mark: "P" },
  { name: "Diya Patel", mark: "P" },
  { name: "Kabir Singh", mark: "L" },
  { name: "Meera Iyer", mark: "P" },
  { name: "Rohan Das", mark: "A" },
];

const EASE = [0.65, 0, 0.35, 1];

const Tick = ({ delay, animate }) => (
  <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
    <motion.path
      d="M2.5 10.5l5.2 5L19.5 2.5"
      stroke="var(--color-ink)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={animate ? { pathLength: 0 } : false}
      animate={{ pathLength: 1 }}
      transition={{ delay, duration: 0.32, ease: EASE }}
    />
  </svg>
);

const Mark = ({ mark, delay, animate }) => {
  if (mark === "P") return <Tick delay={delay} animate={animate} />;
  if (mark === "L") {
    return (
      <span className="relative inline-flex h-[18px] items-center px-1 text-sm font-semibold text-marigold-dark">
        <motion.span
          className="absolute inset-0 -skew-x-6 rounded-[3px] bg-marigold/70"
          style={{ originX: 0 }}
          initial={animate ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{ delay, duration: 0.3, ease: EASE }}
          aria-hidden="true"
        />
        <span className="relative">Late</span>
      </span>
    );
  }
  return (
    <motion.span
      className="inline-flex h-[18px] items-center text-sm font-semibold text-attention"
      initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.2 }}
    >
      Absent
    </motion.span>
  );
};

const RegisterScene = () => {
  const reduce = useReducedMotion();
  const animate = !reduce;

  // Gentle tilt towards the pointer (a few degrees; off for reduced motion)
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-4, 4]), { stiffness: 120, damping: 18 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [3, -3]), { stiffness: 120, damping: 18 });

  const onPointerMove = (e) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  const tickStart = 0.55;

  return (
    <div
      className="relative h-[372px] w-[520px] origin-top-left scale-[0.86] [perspective:1000px] xl:scale-100"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-hidden="true"
    >
      <motion.div className="absolute inset-0" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        {/* Register page */}
        <motion.div
          className="absolute top-0 left-0 w-[290px] rounded-[var(--radius-card)] border border-paper-border bg-white shadow-[var(--shadow-lift)]"
          style={{ rotate: -1.5 }}
          initial={animate ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
        >
          <div className="flex items-baseline justify-between border-b border-margin/60 px-4 pt-3 pb-2">
            <p className="font-serif text-[15px] font-semibold text-ink">JEE Advanced, Morning A</p>
            <p className="text-xs text-ink-muted">Tue 29 Sep</p>
          </div>
          <ul>
            {ROLL.map((row, i) => (
              <li
                key={row.name}
                className="flex h-9 items-center justify-between border-b border-rule/70 px-4 text-sm last:border-0"
              >
                <span className="text-ink-text">{row.name}</span>
                <Mark mark={row.mark} delay={tickStart + i * 0.17} animate={animate} />
              </li>
            ))}
          </ul>
          <p className="border-t border-paper-border px-4 py-2 text-xs text-ink-muted">3 present, 1 late, 1 absent</p>
        </motion.div>

        {/* Fee receipt, stamped */}
        <motion.div
          className="absolute top-[64px] left-[306px] w-[206px] rounded-[var(--radius-card)] border border-paper-border bg-white px-4 py-3 shadow-[var(--shadow-lift)]"
          style={{ rotate: 3.5, translateZ: 30 }}
          initial={animate ? { opacity: 0, y: 18 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.3 }}
        >
          <p className="text-xs text-ink-muted">Receipt EB-2041</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">₹18,000</p>
          <p className="text-xs text-ink-muted">Diya Patel</p>
          <p className="text-xs text-ink-muted">September instalment</p>
          <motion.span
            className="stamp absolute top-3 right-3 text-sm text-forest"
            initial={animate ? { opacity: 0, scale: 1.8 } : false}
            animate={{ opacity: 0.85, scale: 1 }}
            transition={{ delay: tickStart + ROLL.length * 0.17 + 0.25, type: "spring", stiffness: 520, damping: 22 }}
          >
            PAID
          </motion.span>
        </motion.div>

        {/* Pinned notice */}
        <motion.div
          className="absolute top-[248px] left-[268px] w-[228px] rounded-[4px] border border-marigold-border bg-marigold-bg px-4 pt-4 pb-3 shadow-[var(--shadow-sheet)]"
          style={{ rotate: -2.5, translateZ: 50 }}
          initial={animate ? { opacity: 0, y: -24 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, type: "spring", stiffness: 260, damping: 20 }}
        >
          <span className="absolute -top-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-margin shadow-[0_2px_0_rgb(0_0_0/0.15)]" />
          <p className="text-sm font-medium text-ink-text">Physics test moved to Saturday, 9:00 am.</p>
          <p className="mt-1 text-xs text-ink-muted">Posted to JEE Advanced, Morning A</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RegisterScene;
