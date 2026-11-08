import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Unified, platform-neutral state for hiding the top navigation bar (iOS UINavigationBar / SwiftUI
 * navigation bar, Android top app bar). It owns *whether* the bar is hidden; each shell applies that
 * to the real native bar through its own supported mechanism:
 *
 * - React Navigation: `useStackNavigationBar()` (stack header, `use-stack-navigation-bar.*`).
 * - @expo/ui SwiftUI: the `navigationBarHidden` modifier + `onScrollGeometryChange` scroll events.
 * - @expo/ui Compose: the shared TopAppBar's visibility + nested-scroll events.
 *
 * Scroll hiding is driven only by real scroll offsets fed to `reportScroll`; there are no timers.
 */
export type NavigationBarVisibility = {
  /** Whether the navigation bar is currently hidden. */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  toggle: () => void;
  /** Whether scrolling down hides the bar and scrolling up brings it back. */
  hideOnScroll: boolean;
  setHideOnScroll: (enabled: boolean) => void;
  /**
   * Feed every scroll event's vertical content offset (0 = top). Pass `maxOffset` (content height
   * minus viewport height) when known so the bottom rubber-band bounce is not read as scrolling up.
   */
  reportScroll: (offset: number, maxOffset?: number) => void;
};

export type NavigationBarVisibilityOptions = {
  /** Start with scroll hiding on. Defaults to true. */
  hideOnScroll?: boolean;
  /** Distance (points / dp) the user must scroll in one direction before the bar changes. */
  scrollDistance?: number;
};

export type ScrollTracker = { lastOffset: number; travel: number };

export const initialScrollTracker: ScrollTracker = { lastOffset: 0, travel: 0 };

/**
 * Pure scroll-direction rule shared by every shell: hide after scrolling down `distance`, show after
 * scrolling up `distance`, and always show when scrolling back to the top. Travel resets whenever the
 * direction changes, so small jitters never toggle the bar.
 */
export function trackScroll(
  tracker: ScrollTracker,
  rawOffset: number,
  hidden: boolean,
  distance: number,
  maxOffset?: number,
): { tracker: ScrollTracker; hidden: boolean } {
  const offset = maxOffset === undefined ? rawOffset : Math.min(rawOffset, Math.max(maxOffset, 0));
  const delta = offset - tracker.lastOffset;
  if (delta === 0) return { tracker, hidden };

  if (offset <= 0 && delta < 0) {
    return { tracker: { lastOffset: offset, travel: 0 }, hidden: false };
  }

  const sameDirection = Math.sign(delta) === Math.sign(tracker.travel);
  const travel = sameDirection ? tracker.travel + delta : delta;
  let nextHidden = hidden;
  if (travel >= distance && offset > distance) nextHidden = true;
  else if (travel <= -distance) nextHidden = false;

  return {
    tracker: { lastOffset: offset, travel: nextHidden === hidden ? travel : 0 },
    hidden: nextHidden,
  };
}

/** The platform-neutral controller. Shell hooks wrap this and apply `hidden` to the native bar. */
export function useNavigationBarVisibility({
  hideOnScroll: initialHideOnScroll = true,
  scrollDistance = 24,
}: NavigationBarVisibilityOptions = {}): NavigationBarVisibility {
  const [hidden, setHiddenState] = useState(false);
  const [hideOnScroll, setHideOnScrollState] = useState(initialHideOnScroll);
  const tracker = useRef(initialScrollTracker);
  const hiddenRef = useRef(false);
  const hideOnScrollRef = useRef(initialHideOnScroll);

  const setHidden = useCallback((next: boolean) => {
    hiddenRef.current = next;
    tracker.current = { ...tracker.current, travel: 0 };
    setHiddenState(next);
  }, []);

  const toggle = useCallback(() => setHidden(!hiddenRef.current), [setHidden]);

  const setHideOnScroll = useCallback(
    (enabled: boolean) => {
      hideOnScrollRef.current = enabled;
      setHideOnScrollState(enabled);
      if (!enabled) setHidden(false);
    },
    [setHidden],
  );

  const reportScroll = useCallback(
    (offset: number, maxOffset?: number) => {
      if (!hideOnScrollRef.current) {
        tracker.current = { lastOffset: offset, travel: 0 };
        return;
      }
      const next = trackScroll(
        tracker.current,
        offset,
        hiddenRef.current,
        scrollDistance,
        maxOffset,
      );
      tracker.current = next.tracker;
      if (next.hidden !== hiddenRef.current) {
        hiddenRef.current = next.hidden;
        setHiddenState(next.hidden);
      }
    },
    [scrollDistance],
  );

  return useMemo(
    () => ({ hidden, setHidden, toggle, hideOnScroll, setHideOnScroll, reportScroll }),
    [hidden, setHidden, toggle, hideOnScroll, setHideOnScroll, reportScroll],
  );
}
