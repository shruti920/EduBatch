import { useState } from "react";
import { initials } from "../utils/format";

const SIZES = { sm: "h-9 w-9 text-sm", md: "h-12 w-12 text-base", lg: "h-20 w-20 text-2xl" };

// Shows the profile image, falling back to initials if there is none or it fails to load
const Avatar = ({ name, src, size = "sm" }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = src && failedSrc !== src;
  return showImage ? (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={`${SIZES[size]} shrink-0 rounded-full border border-white/20 bg-paper-muted object-cover`}
    />
  ) : (
    <div
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-marigold font-semibold text-ink`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
};

export default Avatar;
