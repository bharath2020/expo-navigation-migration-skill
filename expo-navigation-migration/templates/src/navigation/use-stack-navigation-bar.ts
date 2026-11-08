import { useNavigation } from 'expo-router';
import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';

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
 * The React Navigation shell's navigation bar visibility (iOS). `hidden` becomes the screen's
 * `headerShown` option, so react-native-screens slides the real `UINavigationBar` away with
 * `setNavigationBarHidden(_:animated: true)` and brings it back the same way. The header is
 * translucent and the scroll view runs under it: scrolled down, the rows stay where they are and the
 * bar slides off them; at the top, UIKit keeps the list pinned to the top, so the rows slide up and
 * down with the bar in the same animation.
 *
 * Offsets are the raw `contentOffset.y` plus the explicit `contentInset.top` (zero here). UIKit
 * leaves `contentOffset` alone when the bar changes the automatic (adjusted) inset mid-list, so the
 * bar's own change never reads as a scroll; adding the adjusted inset would turn every hide into a
 * scroll up by the bar's height and show the bar again. At the top the offset is minus the bar's
 * height, which the shared rule treats as the top, and the bar only hides once the rows have
 * scrolled past the top edge, so hiding it never leaves a gap.
 */
export function useStackNavigationBar(
  options?: NavigationBarVisibilityOptions,
): StackNavigationBar {
  const bar = useNavigationBarVisibility(options);
  const navigation = useNavigation();
  const ref = useRef<ScrollViewInstance>(null);
  const { hidden, reportScroll } = bar;

  useEffect(() => {
    navigation.setOptions({ headerShown: !hidden });
  }, [navigation, hidden]);

  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentInset, contentSize, layoutMeasurement } = nativeEvent;
      // The automatic bottom inset (tab bar, home indicator) is not in the event, so this stops a
      // little short of the true end. That only ignores the last stretch and the bottom bounce.
      const maxOffset =
        contentSize.height - layoutMeasurement.height + contentInset.top + contentInset.bottom;
      reportScroll(contentOffset.y + contentInset.top, maxOffset);
    },
    [reportScroll],
  );

  return useMemo(
    () => ({ ...bar, scrollProps: { ref, onScroll, scrollEventThrottle: 16 } }),
    [bar, onScroll],
  );
}
