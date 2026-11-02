import { useWindowDimensions } from 'react-native';

import { type Hinge, useHinge } from './use-hinge';

/** Material's "medium" window width class starts at 600dp; below it one pane fits. */
const DUAL_PANE_MIN_WIDTH = 600;

export type PaneLayout =
  | { mode: 'single'; width: number; height: number; hinge: Hinge | null }
  | {
      mode: 'dual';
      width: number;
      height: number;
      /** Gap to keep clear between the two panes: the hinge's width, or 0 on a fold. */
      gap: number;
      hinge: Hinge | null;
    };

/**
 * Decides between one pane and two from the window size alone, so it is pure TypeScript.
 *
 * A dual-screen device spanned across both screens, an unfolded foldable, a landscape tablet and
 * an iPad all report a wide window. Callers lay the two panes out with equal flex around `gap`,
 * which puts the split at the window's centre - where the fold or hinge is on symmetric devices.
 * On a spanned Surface Duo `gap` is the hinge's width, so each pane fills exactly one screen.
 * A rotated Duo has its hinge across the window, so it gets one pane rather than two cut in half.
 */
export function usePaneLayout(): PaneLayout {
  const { width, height } = useWindowDimensions();
  const hinge = useHinge();
  if (width < DUAL_PANE_MIN_WIDTH || hinge?.orientation === 'horizontal') {
    return { mode: 'single', width, height, hinge };
  }
  return { mode: 'dual', width, height, gap: hinge?.width ?? 0, hinge };
}
