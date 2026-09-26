import type { CSSProperties } from "react";

/** The claudescape mark, a doorway inside a doorway, in a 32×32 box. Shared with the canvas share-image renderer. */
export const LOGO = {
  outerDoor: "M5 29V15a11 11 0 0 1 22 0v14",
  innerDoor: "M11 29v-9a5 5 0 0 1 10 0v9Z",
  stroke: 3,
};

export default function Logo({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden>
      <path d={LOGO.outerDoor} fill="none" stroke="currentColor" strokeWidth={LOGO.stroke} strokeLinecap="round" />
      <path d={LOGO.innerDoor} fill="currentColor" />
    </svg>
  );
}
