import { useEffect } from 'react';

export type Theme = 'dark';

/**
 * The site is dark-only now — no OS-preference tracking, no manual toggle,
 * no stored override (`tr_sc_theme` is no longer read or written). Kept as
 * a hook returning `{ theme: 'dark' }` rather than deleted outright: several
 * components (SFCave, the Titration apparatus pieces) still destructure
 * `theme` off it to pick their dark-mode color branch, and always getting
 * 'dark' back is exactly the behavior wanted post-removal without having to
 * touch every one of those call sites.
 */
export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return { theme: 'dark' as const };
}
