"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-zinc-100 hover:text-[var(--foreground)] dark:hover:bg-zinc-800"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <SunIcon className="h-5  w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  const cx = 12;
  const cy = 12;
  const coreR = 4;
  const rayLength = 6;
  const rayWidth = 1.5;
  const rays = 8;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="yellow"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden
    >
      {/* Rays: short lines from core outward */}
      {Array.from({ length: rays }, (_, i) => {
        const a = (i / rays) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + coreR * Math.cos(a);
        const y1 = cy + coreR * Math.sin(a);
        const x2 = cx + (coreR + rayLength) * Math.cos(a);
        const y2 = cy + (coreR + rayLength) * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <circle cx={cx} cy={cy} r={coreR} fill="currentColor" stroke="none" />
    </svg>
  );
}
	

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      />
    </svg>
  );
}
