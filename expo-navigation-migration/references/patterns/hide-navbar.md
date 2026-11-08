# Hide Navbar
Hiding and showing the real native top navigation bar from a button and from scrolling (down hides it, up or back to the top shows it), through one hook in both shells; an app needs this for reading screens, long lists and immersive content that want the bar out of the way.

## Status
| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Hide and show from a button | verified, `headerShown` | partial: verified, needs local module, `AppBarLayout.setExpanded` | partial: verified, needs local module, `navigationBarHidden` | verified, `AnimatedVisibility` |
| Scroll down hides, scroll up or top shows | verified, `ScrollView` `onScroll` | partial: verified, needs local module, `ScrollView` `onScroll` | partial: verified, needs local module, `useScrollGeometryChange` | partial: verified, needs local module, `nestedScrollOffset` |
| Content moves with the bar, no jump or gap | verified | partial: verified, needs local module, 56 dp | partial: verified, needs local module, after the UIKit-driven fix | verified, 64 dp |
| Back while the bar is hidden | verified, edge swipe | verified, back gesture and key | partial, swipe-back re-checked on iPhone only | verified, `BackHandler` |
| Leave the screen and come back with the bar shown | not exercised | verified | not exercised | verified |
| iPad, top tab bar and sidebar | partial, top tabs cover the first rows | n/a | partial, top tabs cover the first rows | n/a |

Every `verified` and `partial: verified` cell ran on a simulator or emulator. Only React Navigation on iOS needs no native code; the other three use a local module and a development build.

## Unified API
One platform-neutral hook owns whether the bar is hidden and turns real scroll offsets into hide and show. There are no timers and no header drawn in JavaScript. Each shell applies `hidden` to its own native bar and feeds `reportScroll` from its own scroll events.

From the prototype: `src/navigation/navigation-bar-visibility.ts`
```ts
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
// ...
export function useNavigationBarVisibility({
  hideOnScroll: initialHideOnScroll = true,
  scrollDistance = 24,
}: NavigationBarVisibilityOptions = {}): NavigationBarVisibility {
```

| Member | Meaning |
| --- | --- |
| `hidden`, `setHidden`, `toggle` | Whether the bar is hidden |
| `hideOnScroll`, `setHideOnScroll` | Scroll hiding on or off. Turning it off shows the bar |
| `reportScroll(offset, maxOffset?)` | Feeds a raw content offset |
| Options `hideOnScroll`, `scrollDistance` | Start with scroll hiding on (default `true`); travel before the bar changes (default 24 pt or dp) |

The rule is a pure function, `trackScroll`, exported for table tests. It hides after `scrollDistance` of downward travel once the offset is past `scrollDistance`, shows after the same travel upward or on reaching the top, and resets travel when the direction changes, so jitter never toggles the bar.

From the prototype: `src/navigation/navigation-bar-visibility.ts`
```ts
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
```

| Shell and platform | Wrapper | Hides the bar with | Scroll events from |
| --- | --- | --- | --- |
| React Navigation, iOS | `useStackNavigationBar()` | `headerShown` (react-native-screens) | `ScrollView` `onScroll` |
| React Navigation, Android | `useStackNavigationBar()` (`.android.ts`) | `AppBarLayout.setExpanded` (local module) | `ScrollView` `onScroll` |
| @expo/ui, iOS | the hook itself | `navigationBarHidden` modifier (local module) | `useScrollGeometryChange` |
| @expo/ui, Android | the hook, in `HideBarScreen` | `AnimatedVisibility` around the shell's `TopAppBar` | `nestedScrollOffset` modifier (local module) |

## React Navigation (Expo Router + react-native-screens)
### Shared
`useStackNavigationBar()` returns the hook's members plus `scrollProps` (`ref`, `onScroll`, `scrollEventThrottle: 16`) for the screen's `ScrollView`. The same screen file runs on iOS and Android; Metro picks `use-stack-navigation-bar.android.ts` on Android.

From the prototype: `src/app/(tabs)/navbar/hide-bar.tsx`
```tsx
const bar = useStackNavigationBar();
// ...
{/* A `Stack.Toolbar` forces `headerShown: true` over the screen's options, so the bar's
  items are only declared while the bar is shown. */}
{bar.hidden ? null : <ViewCodeToolbar id="hide-bar" />}
<ScrollView
  {...bar.scrollProps}
  testID="hide-bar-scroll"
  contentInsetAdjustmentBehavior="automatic"
  // ...
  <Pressable
    testID="hide-bar-toggle"
    accessibilityRole="button"
    onPress={bar.toggle}
    // ...
  <Switch
    testID="hide-bar-on-scroll"
    accessibilityLabel="Hide on scroll"
    value={bar.hideOnScroll}
    onValueChange={bar.setHideOnScroll}
  />
```

`ViewCodeToolbar` is the prototype's own `Stack.Toolbar`. The screen is a plain stack route.

From the prototype: `src/app/(tabs)/navbar/_layout.tsx`
```tsx
<Stack screenOptions={stackScreenOptions}>
  <Stack.Screen name="index" options={{ title: 'Navbar' }} />
  <Stack.Screen name="hide-bar" options={{ title: 'Hide bar' }} />
</Stack>
```

### iOS
`hidden` becomes the screen's `headerShown`, so react-native-screens slides the real `UINavigationBar` with `setNavigationBarHidden(_:animated: true)`. No native code.

From the prototype: `src/navigation/use-stack-navigation-bar.ts`
```ts
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
```

- **Layout.** The header is translucent and the list runs under it. Mid-list the rows stay put and the bar slides off them. At the top UIKit keeps the list pinned, so the rows slide with the bar in the same animation. The bar only hides once the rows have scrolled past the top, so no gap opens.
- **Scroll offset.** The hook gets the raw `contentOffset.y`, which UIKit leaves alone when the bar changes the automatic inset.
- **Back.** react-native-screens is already the delegate of the swipe-back recognizers, so the edge swipe works while the bar is hidden, and the previous screen shows its bar.
- **Large title.** On iPhone the screen inherits the stack's large title. Scrolling down collapses it and then hides the bar. Scrolling up brings the bar back with the inline title.

### Android
react-native-screens lays each stack screen out in a `CoordinatorLayout`: the header `Toolbar` in a Material `AppBarLayout`, and the screen below it with `AppBarLayout.ScrollingViewBehavior`. `headerShown: false` removes the toolbar and lays the screen out again in one frame, so the content jumps. React Navigation has no option that collapses the bar, so the Android wrapper calls `templates/modules/app-bar-visibility/`.

From the prototype: `src/navigation/use-stack-navigation-bar.android.ts`
```ts
useEffect(() => {
  const tag = findNodeHandle(ref.current);
  if (tag != null) void setStackAppBarHidden(tag, hidden);
}, [hidden]);
```

`setStackAppBarHidden(viewTag, hidden)` walks up from the `ScrollView` to its `AppBarLayout`, gives the toolbar collapse flags and collapses the bar.

From the prototype: `modules/app-bar-visibility/android/src/main/java/expo/modules/appbarvisibility/StackAppBar.kt`
```kotlin
if (hidden) {
  makeCollapsible(toolbar)
  appBar.setExpanded(false, animated)
} else {
  appBar.setExpanded(true, animated)
}
```

- **Layout.** `makeCollapsible` sets `SCROLL | EXIT_UNTIL_COLLAPSED`. Material animates the bar's offset and `ScrollingViewBehavior` moves the screen with it. Once the bar is fully expanded again the flags go back to none: a scrollable bar makes the screen taller by the bar's height, which would push the bottom of the content off screen while the bar shows.
- **Status bar.** Edge to edge, react-native-screens puts the status-bar inset in the toolbar's top padding. While collapsing, the toolbar's minimum height is set to that padding, so the bar stops at the status bar. A scrim drawn from the toolbar's own background covers the rest, as `AppBarLayout.statusBarForeground` does.
- **Taps and TalkBack.** Fully collapsed, the toolbar is made `INVISIBLE`. It keeps its size, so the layout does not change, but its title and back button take no taps and leave the accessibility tree.
- **Scroll offset.** Moving the screen does not change `contentOffset`, so the bar's own motion never reads as a scroll.

## @expo/ui
### iOS (SwiftUI)
@expo/ui 58 has no toolbar visibility modifier. `templates/modules/swiftui-navigation-bar/` registers `navigationBarHidden` with @expo/ui's `ViewModifierRegistry`. The screen uses the hook directly; @expo/ui's own `useScrollGeometryChange` (SwiftUI `onScrollGeometryChange`) supplies the offsets.

From the prototype: `src/expo-ui/swift-ui/hide-bar.tsx`
```tsx
const bar = useNavigationBarVisibility();
// The raw `contentOffset.y`, as in the React Navigation shell: mid-list it does not move when the
// bar changes the List's top inset, so the bar's own change never reads as a scroll.
const scroll = useScrollGeometryChange((geometry) =>
  bar.reportScroll(geometry.contentOffsetY, geometry.contentHeight - geometry.containerHeight),
);
// ...
<Toolbar modifiers={[navigationTitle('Hide bar'), navigationBarHidden(bar.hidden)]}>
  <List modifiers={scroll ? [scroll] : []}>
```

From the prototype: `src/expo-ui/swift-ui/navbar-tab.tsx`
```tsx
<NavigationDestination value="hide-bar">
  <HideBar />
</NavigationDestination>
```

The modifier adds a zero-size child view controller, which gives it the stack's own `UINavigationController`. It drives that controller the way UIKit apps and react-native-screens do, and lays the screen out inside the same animation.

From the prototype: `modules/swiftui-navigation-bar/ios/SwiftUINavigationBarModule.swift`
```swift
UIView.animate(withDuration: UINavigationController.hideShowBarDuration) {
  navigationController.setNavigationBarHidden(hidden, animated: false)
  navigationController.view.layoutIfNeeded()
}
```

- **Swipe-back.** UIKit's own delegate for the swipe-back recognizers refuses every touch while the bar is hidden: the edge swipe (`interactivePopGestureRecognizer`) and, from iOS 26, the full-width content swipe (`interactiveContentPopGestureRecognizer`). While the bar is hidden, the module becomes their delegate and applies react-native-screens' rules: begin when there is a screen to go back to and no transition is running; the edge swipe wins over the list's scroll; the content swipe yields to a scroll view that scrolls sideways. UIKit's delegate is put back when the bar shows or the screen goes away.
- **The bar belongs to the whole stack.** In `viewWillDisappear` the module shows the bar again, so the previous screen keeps its bar during an interactive pop. If the swipe is cancelled, `viewWillAppear` hides it again.

### Android (Compose)
The shell draws one `TopAppBar` for every screen. The Hide bar screen owns the hook and hands `hidden` to the shell through `onBarHidden`; when it leaves it hands back `false`, so each visit starts with the bar shown.

From the prototype: `src/expo-ui/compose/screens.tsx`
```tsx
const bar = useNavigationBarVisibility();
useEffect(() => onBarHidden(bar.hidden), [onBarHidden, bar.hidden]);
useEffect(() => () => onBarHidden(false), [onBarHidden]);
// ...
<Screen scrollModifiers={[nestedScrollOffset(bar.reportScroll)]}>
```

From the prototype: `src/expo-ui/shell.android.tsx`
```tsx
// Only the Hide bar screen hides the bar; every other screen, including the one back from it,
// shows it from its first frame.
const barHidden = onHideBar && hideBar;
// ...
<Column
  modifiers={[fillMaxSize(), background(colors.surface), padding(0, insets.top, 0, 0)]}>
  <AnimatedVisibility
    visible={!barHidden}
    enterTransition={EnterTransition.expandVertically()}
    exitTransition={ExitTransition.shrinkVertically()}>
    <TopAppBar windowInsets={{ start: insets.left, end: insets.right }}>
```

- **Layout.** The list below grows and shrinks with the bar frame by frame. The status-bar inset is padding outside the animated bar, so content never slides under the status bar.
- **Scroll events.** @expo/ui 58 registers `LazyColumn` without view events, so it has no scroll events, and a modifier event from the list itself never reaches JavaScript ("Cannot get callbacks for LazyColumnView"). `templates/modules/app-bar-visibility/` also registers `nestedScrollOffset` with @expo/ui's Compose `ModifierRegistry`. `Screen` puts it on a `Box` around the `LazyColumn`, where nested scrolling reaches it. It is a `Modifier.nestedScroll`, the hook Material 3's `TopAppBarScrollBehavior` uses: it consumes nothing and adds up the scroll the list consumed, for drags and flings alike. Pulling down with nothing left to scroll resets it to 0, which also corrects the sum when the list grows as the bar hides.
- **Back.** The back gesture and the back key go through the shell's `BackHandler` and pop the screen while the bar, and its back arrow, is hidden.

From the prototype: `src/expo-ui/compose/rows.tsx`
```tsx
return (
  <Box
    modifiers={[weight(1), fillMaxWidth(), ...scrollModifiers]}
    contentAlignment="bottomCenter">
    <LazyColumn modifiers={[fillMaxSize()]}>{children}</LazyColumn>
    {bottomBar}
  </Box>
);
```

## Known limits
- No shell makes the bar follow the finger. The hook toggles the whole bar once the travel threshold is crossed, and the bar animates in or out. For Compose the source records this as a gap: @expo/ui's `TopAppBar` takes no `scrollBehavior`, so Material 3's `enterAlwaysScrollBehavior` is not available. A finger-tracking bar was not built for the other shells.
- iPad, both shells: the top tab bar is not part of the navigation bar, so it stays when the bar hides and floats over the first rows.
- Android has no large title, so there is nothing to collapse before the bar hides.
- React Navigation Android, hiding the bar from a scroll within about the bar's height of the end of the list was not exercised. The collapse scroll flags make the screen taller by the bar's range, so the `ScrollView` may clamp its offset and the bar could come straight back. Check it in the app.

## Verification
iOS ran on iPhone 17 Pro and iPad Pro 13-inch (M5) simulators on the iOS 27.0 runtime, with the iPad in both the top tab bar and the sidebar. Maestro drove the tap, the scroll in both directions, back at the top and swipe-back while hidden, with recordings. Android ran on a Pixel emulator (API 35) in both shells. Screenshots were taken but are not published with this skill.

| Check | Where | Result |
| --- | --- | --- |
| Tap hides and shows the bar | iPhone, iPad, Android, both shells | verified |
| Scroll down hides, scroll up and back to top shows | iPhone, iPad, Android, both shells | verified. The React Navigation Android scroll-up state was not captured as a still |
| Content moves with the bar, no gap | Android React Navigation | verified: content moves 147 px (56 dp) with the bar |
| Content moves with the bar, no gap | Android Compose | verified: content moves 168 px (64 dp) |
| Mid-list hide and show does not jump the list | Android, both shells | verified: Row 5 goes 1278 to 1131 and back to 1278 px (React Navigation), 1452 to 1284 and back to 1452 px (Compose) |
| SwiftUI list moves inside the bar's animation | iPhone, frame-by-frame analysis of a recording | verified after the fix: about seven frames (0.2 s). Before it, `toolbarVisibility` jumped the `List` 54 pt in one frame on hide and on show |
| Swipe-back while hidden, including a cancelled swipe | iPhone, SwiftUI, after the swipe-back fix | verified. Not re-checked on iPad |
| Back gesture and back key while hidden | Android, both shells | verified, and the previous screen shows its bar |
| Last row clear of the tab bar while hidden | Android React Navigation | verified |
| Leave and re-enter shows the bar | Android, both shells | verified. In React Navigation, a `Stack.Toolbar` button still works after a hide and show |
| Hidden toolbar leaves the accessibility tree | Android React Navigation | verified. TalkBack itself was not run |

The @expo/ui stills in the prototype predate the swipe-back fix, and the iPad ones also predate the UIKit-driven modifier; the bar and rows look the same in a still frame either way.

To verify in an app: hide and show from the button at the top and mid-list and compare a row's position before and after (it should move by the bar's height at the top and not at all mid-list on iOS); scroll down past 24 pt and back up; scroll to the bottom and let it bounce (the bar must not reappear); go back by swipe or back key while hidden and check the previous screen's bar.

Not exercised: iPhone Duo folded or open; iPhone landscape; leaving the tab and coming back while hidden with the current SwiftUI module (React Navigation not checked either); SwiftUI swipe-back on iPad after the fix; rotating while hidden, Dynamic Type, VoiceOver and the keyboard; a Hide bar screen inside a modal or sheet stack; a screen with `headerLargeTitleEnabled: false` on iPhone; Android landscape, tablet, foldable, Surface Duo and dark mode; TalkBack.

## Templates
| Files | Use |
| --- | --- |
| `templates/src/navigation/navigation-bar-visibility.ts` | The hook and `trackScroll`. No dependencies beyond React |
| `templates/src/navigation/use-stack-navigation-bar.ts`, `use-stack-navigation-bar.android.ts` | React Navigation wrappers. The Android file imports `../../modules/app-bar-visibility`, so keep `modules/` at the app root |
| `templates/modules/swiftui-navigation-bar/` | `navigationBarHidden` for @expo/ui SwiftUI (Swift). Needs a development build |
| `templates/modules/app-bar-visibility/` | `setStackAppBarHidden` for the React Navigation Android header and `nestedScrollOffset` for Compose (Kotlin). Needs a development build. `build.gradle` reads `@expo/ui`'s version from `../../../node_modules/@expo/ui/package.json`, and pins `androidx.compose.ui:ui-android` 1.12.1 and Material 1.13.0 |
| `templates/src/examples/hide-bar/hide-bar-screen.tsx` | React Navigation screen: button, switch and a `ScrollView` of rows. The prototype's list `Row` and `Section` components and its `Stack.Toolbar` are replaced by plain views; it imports `usePalette` from `@/theme` (`templates/src/theme.ts`) |
| `templates/src/examples/hide-bar/swift-ui-hide-bar.tsx` | SwiftUI screen for a `NavigationDestination`. The prototype's "drawn by" row and toolbar item are dropped |
| `templates/src/examples/hide-bar/compose-hide-bar.tsx` | Compose screen plus a minimal shell: one `TopAppBar` in `AnimatedVisibility` above the screen. `Screen`, `Row` and `Header` are inlined from the prototype's `rows.tsx`. The prototype shell's route stack, tabs, actions and `BackHandler` are left out |

Imports use the `@/` alias for `src/`, as the pane templates do, and relative paths to `modules/`, as the prototype does. Copy `modules/` to the app root so they resolve.

## Gotchas
- React Navigation, the bar will not hide. A `Stack.Toolbar` forces `headerShown: true` over the screen's options. Render header items only while the bar shows: `{bar.hidden ? null : <Stack.Toolbar>...}`.
- React Navigation Android, the content jumps. `headerShown: false` lays the screen out again in one frame. Collapse the `AppBarLayout` with `setExpanded` through the local module, and reset the scroll flags once it is expanded.
- React Navigation Android, content under the status bar or a tappable invisible bar. Edge to edge, stop the collapse at the status-bar inset with the toolbar's minimum height, cover the rest with a scrim, and make the collapsed toolbar invisible.
- SwiftUI, the `List` jumps by the bar's height. `toolbarVisibility(.hidden, for: .navigationBar)` applies the new safe area outside the bar's animation; `withAnimation` and `.animation(_:value:)` do not change that. Drive the `UINavigationController` inside a UIKit animation instead.
- SwiftUI, no swipe-back while hidden. UIKit refuses swipe-back while the bar is hidden. Take over the recognizers' delegate only while hidden and give it back afterwards.
- Every shell, the bar comes straight back after hiding. Feed the raw content offset. If it changes when the bar moves (for example adding the adjusted inset on iOS), every hide reads as a scroll up by the bar's height.
- Every shell, a gap opens at the top. Hide only after the content has scrolled past the top, as `trackScroll` does with `offset > distance`.
- @expo/ui Compose, no scroll events. A modifier event on `LazyColumn` never reaches JavaScript. Put the `nestedScroll` modifier on a parent `Box`.
- @expo/ui, the next screen has no bar. The bar belongs to the whole stack (SwiftUI) or the shell (Compose). Show it again when the screen leaves.

## Migration notes
- `navigation.setOptions({ headerShown })` toggled from state -> `useStackNavigationBar()` on iOS, where it is the same mechanism; on Android it relayouts in one frame, so use the wrapper's `setExpanded` path.
- Hide-on-scroll built from an `Animated` header translated by scroll position -> the native bar plus `useNavigationBarVisibility`, with `scrollProps` on the `ScrollView`. Keep the content `contentInsetAdjustmentBehavior="automatic"` on iOS.
- Screens that set `headerShown: false` and draw their own header to be able to hide it -> keep the native header and hide it through the hook.
- Header items that must disappear with the bar -> render the `Stack.Toolbar` conditionally on `bar.hidden`.
