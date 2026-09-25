import { useEffect, useState } from "react";


export const useDocumentTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} · EduBatch` : "EduBatch";
  }, [title]);
};

// true once `active` has been true for `delay` ms — used for "this is taking a while" hints
export const useSlowFlag = (active, delay = 4000) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => setSlow(true), delay);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [active, delay]);
  return active && slow;
};
