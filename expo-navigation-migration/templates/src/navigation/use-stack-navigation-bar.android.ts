import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  findNodeHandle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { setStackAppBarHidden } from '../../modules/app-bar-visibility';
import {
  type NavigationBarVisibility,
  type NavigationBarVisibilityOptions,
  useNavigationBarVisibility,
} from '@/navigation/navigation-bar-visibility';

export type StackNavigationBar = NavigationBarVisibility & {
  /** Spread on the screen's `ScrollView`: its scroll events drive hide-on-scroll. */
  scrollProps: {
    ref: RefObject<ScrollViewInstance | null>;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
  };
};

/**
 * The React Navigation shell's navigation bar visibility (Android). The native stack header is a
 * Material `AppBarLayout` in the screen's `CoordinatorLayout`. `hidden` collapses it with
 * `AppBarLayout.setExpanded(false, animate)` (`modules/app-bar-visibility`): Material slides the
 * bar up and `ScrollingViewBehavior` moves the screen with it, so the content follows the bar
 * smoothly instead of jumping. `headerShown: false` would remove the toolbar and relayout the
 * screen in one frame.
 *
 * Moving the screen does not change the scroll view's `contentOffset`, so the bar's own motion
 * never reads as a scroll.
 */
export function useStackNavigationBar(
  options?: NavigationBarVisibilityOptions,
): StackNavigationBar {
  const bar = useNavigationBarVisibility(options);
  const ref = useRef<ScrollViewInstance>(null);
  const { hidden, reportScroll } = bar;

  useEffect(() => {
    const tag = findNodeHandle(ref.current);
    if (tag != null) void setStackAppBarHidden(tag, hidden);
  }, [hidden]);

  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      reportScroll(contentOffset.y, contentSize.height - layoutMeasurement.height);
    },
    [reportScroll],
  );

  return useMemo(
    () => ({ ...bar, scrollProps: { ref, onScroll, scrollEventThrottle: 16 } }),
    [bar, onScroll],
  );
}
