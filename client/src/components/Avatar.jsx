import { useState } from "react";
import { initials } from "../utils/format";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-2xl",
  xl: "h-28 w-28 text-3xl",
};

// Profile photo, or initials written in blue ink when there isn't one (or it fails to load)
const Avatar = ({ name, src, size = "sm", className = "" }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = src && failedSrc !== src;
  const base = `${SIZES[size]} shrink-0 rounded-full ring-1 ring-paper-border ${className}`;
  return showImage ? (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={`${base} bg-paper-muted object-cover`}
    />
  ) : (
    <div
      className={`${base} flex items-center justify-center bg-ink-100 font-serif font-semibold text-ink`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
};

export default Avatar;
