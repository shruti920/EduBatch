import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LogoMark } from "./Logo";

const SEEN_KEY = "eb_intro_seen";
const MIN_INTRO_MS = 1500; // long enough for the mark to finish writing itself
const SLOW_MS = 4500; // after this, explain the free-tier cold start

const introAlreadySeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Opening screen, once per browser session. The E writes itself, the name is
 * revealed behind the margin line, and the page lifts away.
 *
 * It stays up while `busy` is true (the session-restore request), so the Render
 * free-tier cold start is covered by the brand instead of a blank page.
 */
const Preloader = ({ busy }) => {
  const reduce = useReducedMotion();
  const [showIntro] = useState(() => !introAlreadySeen());
  const [minElapsed, setMinElapsed] = useState(!showIntro);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!showIntro) return undefined;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode */
    }
    const done = setTimeout(() => setMinElapsed(true), reduce ? 300 : MIN_INTRO_MS);
    return () => clearTimeout(done);
  }, [showIntro, reduce]);

  useEffect(() => {
    if (!busy) return undefined;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [busy]);

  // Returning visitors in the same session get no intro; the route guard's
  // quiet loader covers the (fast) session check instead
  const visible = showIntro ? busy || !minElapsed : false;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          className="paper-ruled fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } }}
          role="status"
          aria-live="polite"
        >
          {/* Notebook margin */}
          <div className="absolute inset-y-0 left-10 w-1 border-x border-margin/70 sm:left-24" aria-hidden="true" />

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 text-ink">
              <LogoMark size={76} draw />
              <div className="relative overflow-hidden">
                <motion.span
                  className="block font-serif text-5xl font-semibold tracking-tight sm:text-6xl"
                  initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
                  animate={{ clipPath: "inset(0 0% 0 0)" }}
                  transition={{ delay: 0.75, duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                >
                  EduBatch
                </motion.span>
                {/* The margin line sweeps across as it reveals the name */}
                {!reduce && (
                  <motion.span
                    className="absolute inset-y-1 w-[3px] bg-margin"
                    initial={{ left: 0, opacity: 0 }}
                    animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                    transition={{ delay: 0.75, duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
            <p className="mt-6 h-5 text-sm text-ink-muted">
              {slow ? "Waking the server. The first visit after a quiet spell can take up to a minute." : ""}
              <span className="sr-only">Loading EduBatch</span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
