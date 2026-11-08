import { createModifierWithEventListener } from '@expo/ui/jetpack-compose/modifiers';
import { requireOptionalNativeModule } from 'expo';

type AppBarVisibilityModule = {
  setStackAppBarHidden(viewTag: number, hidden: boolean, animated: boolean): Promise<boolean>;
};

// Android only. Loading it also runs its `OnCreate`, which registers `nestedScrollOffset` with
// @expo/ui's modifier registry before a Compose view uses it.
const native = requireOptionalNativeModule<AppBarVisibilityModule>('AppBarVisibility');

/**
 * Collapses (`hidden`) or expands the Material app bar of the react-native-screens native stack
 * screen that contains the view with `viewTag`, with `AppBarLayout.setExpanded`. The screen's
 * content moves up and down with the bar. Resolves to false when there is no such bar.
 */
export function setStackAppBarHidden(viewTag: number, hidden: boolean, animated = true) {
  return native?.setStackAppBarHidden(viewTag, hidden, animated) ?? Promise.resolve(false);
}

/**
 * A Compose modifier for a parent of a scroll container (a `Box` around a `LazyColumn`):
 * `Modifier.nestedScroll` that reports the container's scroll offset in dp (0 = top) on every
 * scroll, drags and flings alike. @expo/ui's `LazyColumn` has no scroll events of its own.
 */
export const nestedScrollOffset = (onScroll: (offset: number) => void) =>
  createModifierWithEventListener('nestedScrollOffset', (event: { offset: number }) =>
    onScroll(event.offset),
  );
