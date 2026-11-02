# Dual screen and foldables
Adapt one screen to a spanned Surface Duo, an iPhone Duo in every pose and symmetric foldables, driven by the window size rather than the device model.

## Status
"verified" means exercised on a simulator or emulator; no physical hardware was used.

Test setups:
- Surface Duo: Microsoft's [Surface Duo emulator](https://www.microsoft.com/en-us/download/details.aspx?id=100847), Android 12L (API 32) arm64 image 2022.815.115, run on the SDK's emulator. Surface Duo 2 was not exercised; its row in `dualScreenDevices` is from published geometry.
- iPhone Duo: iOS 27.1 simulator, Xcode 27.1 Device Hub, Release build.
- Symmetric foldable: Pixel 9 Pro Fold AVD (API 35).

The prototype's two-pane screen and `useHinge` live in the React Navigation shell only, so the @expo/ui Android shell was not run spanned or on a foldable.

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Surface Duo: spanned, one pane per screen | n/a | verified: split at hinge | n/a | not exercised: no pane screen |
| Surface Duo: hinge bounds via `useHinge` | n/a | verified: spanned, rotated, single | n/a | not exercised |
| Surface Duo: rotated, hinge across window | n/a | partial: rows pass under hinge | n/a | not exercised |
| Surface Duo: push, modal, sheets, More, spanned | n/a | verified: content on first screen; sheet dragged 30% to full | n/a | not exercised |
| Surface Duo: tab bar under hinge | n/a | gap: middle item hidden | n/a | not exercised |
| Surface Duo: chrome across both screens | n/a | partial: chrome spans, content kept | n/a | not exercised |
| Pixel Fold: split at the fold when unfolded | n/a | verified: `gap` is 0 | n/a | not exercised: no pane screen |
| Pixel Fold: fold, push, unfold again | n/a | verified: one pane, then two | n/a | not exercised |
| Android: hinge bounds or posture at runtime | n/a | gap: needs native module | n/a | gap: needs native module |
| iPhone Duo folded: rail, 84 pt right inset | verified: rows clear rail | n/a | verified: rows clear rail | n/a |
| iPhone Duo open, landscape: sidebar and rail | verified: left 280, right 84 | n/a | verified | n/a |
| iPhone Duo open, portrait | verified: sidebar over content | n/a | verified: tabs flat | n/a |
| iPhone Duo open: two panes with `ArrangementView` | verified: iOS 27.1 | n/a | not exercised: no pane screen | n/a |
| iPhone Duo partially open | partial: full-width lists cross fold | n/a | not exercised | n/a |
| iPhone Duo: fold with a screen open | partial: detail not pushed folded | n/a | not exercised | n/a |
| iPhone Duo: Split View | not exercised: no scripted setup | n/a | not exercised | n/a |
| `expo-hinge` angle and status | verified: all three states | not exercised | not exercised: not used | not exercised: not used |
| Standard iPhone: unchanged | verified: bottom tab bar | n/a | verified: tab bar | n/a |
| iPad: two panes beside the sidebar | verified: flex split | n/a | not exercised: no pane screen | n/a |

## Options
Ask which of these devices the app ships on, then add only that row's parts. `usePaneLayout` plus `PaneSplit` is the base for every row with two panes.

| Device | Use | What you get | Cost |
| --- | --- | --- | --- |
| Surface Duo, Surface Duo 2 | `usePaneLayout` + `PaneSplit` (flex on Android) + `useHinge` in lists and sheets | One pane per screen, content off the hinge, one pane when rotated | TypeScript only. A new device needs a row in `dualScreenDevices` |
| Pixel Fold and other symmetric foldables | `usePaneLayout` + `PaneSplit` | Two panes split at the window centre, which is the fold. One pane folded | TypeScript only |
| iPhone Duo | `usePaneLayout` + `PaneSplit` (`ArrangementView` on iOS 27.1+), native bars, side `SafeAreaView` | Split along the fold, clear of the sidebar and rail. Stacked either side of the fold when partially open | @expo/ui and a development build; Xcode 27.1 and iOS 27.1 for `ArrangementView` |
| iPhone Duo, open display | `preferredPlacement` or `defaultTabBarPlacement`; see `references/patterns/sidebar.md` | Sidebar instead of the rail | One prop, or a local module with @expo/ui |
| iPhone Duo, Android 11+ foldables | `expo-hinge` | Hinge angle and status for interactions and effects, not layout | One dependency and a development build. Android path not exercised |
| iPad | `usePaneLayout` + `PaneSplit` | Two panes beside the sidebar | @expo/ui on iOS 27.1+; flex below that |

Considered and not adopted:

| Option | Why not |
| --- | --- |
| Expo Router `<SplitView>` | Experimental in SDK 58. `ArrangementView` covers the two-pane screen |
| `useVerticalBarEdgeIOS`, reserved regions | Not needed: native bars and `ArrangementView` handle them. Expo's guide covers them for custom UI |
| Jetpack WindowManager native module, `expo-foldables` | Needed only for runtime hinge bounds or tabletop posture. The npm wrappers were weeks old with a single maintainer when evaluated |
| `SurfaceDuoBottomNavigationView` | Keeps the bar on one screen but needs native code |

Expo's guide, [Supporting iPhone Duo](https://expo.dev/blog/supporting-iphone-duo), is the checklist this pattern was tested against.

## React Navigation (Expo Router + react-native-screens)
Whole files ship in `templates/src/navigation/use-hinge.ts`, `templates/src/navigation/use-pane-layout.ts`, `templates/src/components/pane-split.tsx`, `pane-split.ios.tsx` and `flex-pane-split.tsx`. The last two import `usePalette` from `@/theme`, which `templates/src/theme.ts` supplies; replace it with your app's palette hook.

### One pane or two
`usePaneLayout` decides from the window width and takes the gap from the hinge. Folding, unfolding and spanning change the window size, `useWindowDimensions` re-renders, and the layout switches with no extra code.

From the prototype: `src/navigation/use-pane-layout.ts`
```ts
const DUAL_PANE_MIN_WIDTH = 600;
// ...
export function usePaneLayout(): PaneLayout {
  const { width, height } = useWindowDimensions();
  const hinge = useHinge();
  if (width < DUAL_PANE_MIN_WIDTH || hinge?.orientation === 'horizontal') {
    return { mode: 'single', width, height, hinge };
  }
  return { mode: 'dual', width, height, gap: hinge?.width ?? 0, hinge };
}
```

A screen switches layout on it. In single-pane mode a row pushes the detail; in dual-pane mode a row selects, and the detail fills the second pane. Selection state survives the switch because the screen stays mounted.

From the prototype: `src/app/(tabs)/panes/index.tsx`
```tsx
const layout = usePaneLayout();
const [selectedId, setSelectedId] = useState(items[0].id);
// ...
if (layout.mode === 'single') {
  return (
    <ListScreen>
      // ...
      <Row
        key={item.id}
        testID={`pane-row-${item.id}`}
        title={item.title}
        onPress={() => router.push({ pathname: '/panes/[id]', params: { id: item.id } })}
      />
      // ...
    </ListScreen>
  );
}
// ...
const list = (
  <ListScreen sideInsets={false}>
    // ...
        onPress={() => setSelectedId(item.id)}
    // ...
  </ListScreen>
);
// ...
<PaneSplit primary={list} secondary={detail} gap={layout.gap} />
```

`pane-split.tsx` (Android) re-exports the flex split. `pane-split.ios.tsx` uses `ArrangementView` on iOS 27.1+ and the flex split below that.

From the prototype: `src/components/flex-pane-split.tsx`
```tsx
<SafeAreaView
  edges={{ left: true, right: true }}
  style={[styles.row, { backgroundColor: palette.background }]}>
  <View style={styles.pane}>{primary}</View>
  <View style={{ width: gap }} />
  <View style={[styles.pane, styles.secondary, { borderLeftColor: palette.separator }]}>
    {secondary}
  </View>
</SafeAreaView>
```

The two panes have equal flex around `gap`, so the split lands on the window centre. That is the fold on a symmetric foldable and the hinge on a spanned Surface Duo, where each pane fills exactly one screen.

### Surface Duo
Two 1350 × 1800 px screens with an 84 px hinge that has no pixels and takes no touches. Android reports an app spanned across both as one 2784 px window. React Native has no hinge API, so `useHinge` derives the hinge from the published geometry: the window is spanned when it is exactly two screens plus the hinge wide (or tall, rotated).

From the prototype: `src/navigation/use-hinge.ts`
```ts
const dualScreenDevices = [
  { name: 'Surface Duo', screen: { width: 1350, height: 1800 }, hingeWidth: 84 },
  { name: 'Surface Duo 2', screen: { width: 1344, height: 1892 }, hingeWidth: 66 },
] as const;
// ...
if (Platform.OS !== 'android' || Platform.constants.Manufacturer !== 'Microsoft') {
  return null;
}
```

Emulator results:

| Posture | `useHinge()` | Panes |
| --- | --- | --- |
| Spanned | `vertical`, 34 × 720 dp at (540, 0) | Two, split at the hinge |
| Spanned and rotated | `horizontal`, 720 × 34 dp at (0, 540) | One, rather than two each cut by the hinge |
| One screen | `null` | One |

Lists stay on the first screen, so no row or footer runs under the hinge. Push, the modal and More all render through `ListScreen`.

From the prototype: `src/components/list.tsx`
```tsx
<ScrollView
  contentInsetAdjustmentBehavior="automatic"
  style={{ backgroundColor: palette.background }}
  contentContainerStyle={[
    styles.content,
    hinge?.orientation === 'vertical' && { width: hinge.x },
  ]}>
  <SafeAreaView edges={{ left: sideInsets, right: sideInsets }} style={styles.sections}>
    {children}
  </SafeAreaView>
</ScrollView>
```

The native bottom sheet spans the window, so its content pads off the second screen. Padding rather than a width keeps the sheet's background across both screens.

From the prototype: `src/app/sheet.tsx`
```tsx
// Padding rather than a width keeps the sheet's background across both screens.
hinge?.orientation === 'vertical' && { paddingRight: hinge.width + hinge.x },
```

Exercised spanned: push to depth 2, the modal with a push inside, both sheets including a drag from the 30% detent to full height, runtime navbar items, every tab and More. Unspanning and rotating were also exercised. That drag is the only recorded drag between detents for the React Navigation sheet on Android. The Pixel 8 run did not drive one, so `references/patterns/bottom-sheet.md` keeps detents partial.

### Symmetric foldables (Pixel Fold)
No hinge code. `useHinge` returns `null`, `gap` is 0, and the split at the window centre is the fold. Exercised on the Pixel 9 Pro Fold AVD: unfolded dual panes, folded single pane with a pushed detail, unfolded again, then sheet, modal, navbar and More while unfolded. A regression check after the hinge changes confirmed dual panes still split at the fold with `Hinge: none`. The tab bar stays a bottom bar at this width; see `references/patterns/sidebar.md`.

### iPhone Duo
| Pose | What the prototype showed |
| --- | --- |
| Folded | Window 466 × 678 pt. Status bar, navbar items and tab bar form a rail along the trailing edge, reported as an 84 pt right inset. Rows clear it. Both shells |
| Open, landscape | Sidebar plus content; Panes in two panes beside the sidebar and rail (safe area left 280, right 84). Both shells |
| Open, portrait | Window 669 × 951 pt. The sidebar collapses into a navbar button and opens over the content, as on an iPad in portrait. Both shells |
| Partially open | Panes stacks list and detail on either side of the fold, and a bottom sheet opens below it. Full-width lists (Stack, Present) still scroll across the fold |
| Folding with a screen open | The tab, the screen and the selected item survive fold and unfold. Folded, Panes shows the list without the selected detail pushed |
| Split View | Not tested: no scripted way to put a second app beside this one in the simulator |
| Standard iPhone | Bottom tab bar in portrait and landscape, unchanged. An iPhone 17 Pro simulator |

**Native bars.** `Stack` and `NativeTabs`; iOS moves bars and header items into the rail.

**Safe areas.** Wrap the content, not the `ScrollView`, in `SafeAreaView` with left and right edges (the `ListScreen` block above), keep `contentInsetAdjustmentBehavior="automatic"`, and add no fixed tab bar heights. The prototype imports `SafeAreaView` from `react-native-screens/experimental` rather than react-native-safe-area-context, because the sidebar is in the screen's insets.

**Two panes.** `ArrangementView` splits along the fold on the open display and keeps both panes inside the safe area, clear of the sidebar and rail.

From the prototype: `src/components/pane-split.ios.tsx`
```tsx
/** `ArrangementView` needs iOS 27.1; below it the children render without a container. */
const supportsArrangementView = Number.parseFloat(String(Platform.Version)) >= 27.1;

const fill = frame({ maxWidth: Infinity, maxHeight: Infinity });
// ...
if (!supportsArrangementView) {
  return <FlexPaneSplit {...props} />;
}
// ...
return (
  <Host style={[styles.fill, { backgroundColor: palette.background }]}>
    <ArrangementView modifiers={[arrangementViewStyle('split'), fill]}>
      <ArrangementView.Primary>
        <RNHostView>
          <View style={styles.fill}>{props.primary}</View>
        </RNHostView>
      </ArrangementView.Primary>
      <ArrangementView.Secondary>
        <RNHostView>
          <View style={styles.fill}>{props.secondary}</View>
        </RNHostView>
      </ArrangementView.Secondary>
    </ArrangementView>
  </Host>
);
```

**Hinge state.** The simulator read `closed · 0°` folded, `fullyOpen · 180°` open and `partiallyOpen · 128°` in one partially open pose. `expo-hinge` (`~58.0.2`) reports on iOS 27.1+ in builds made with Xcode 27.1+, and on Android 11+ foldables. `hinge` is `{ angle, status }` with `status` one of `closed`, `partiallyOpen`, `fullyOpen` or `unknown`. `null` means the device has no hinge or the OS cannot report it. Apple says to use it for interactions and effects, not layout; layout still follows the window through `usePaneLayout`. Rename the import, because `useHinge` in `use-hinge.ts` is the Surface Duo hinge bounds, which `expo-hinge` does not report.

From the prototype: `src/app/(tabs)/more/[section].tsx`
```tsx
import { useHinge as useDeviceHinge } from 'expo-hinge';
// ...
const deviceHinge = useDeviceHinge();
// ...
<Row
  title="Device hinge"
  subtitle={
    deviceHinge ? `${deviceHinge.status} · ${Math.round(deviceHinge.angle)}°` : 'none'
  }
/>
```

## @expo/ui
The prototype's @expo/ui shell has no two-pane screen and does not use either hinge hook. `ArrangementView` itself is an @expo/ui SwiftUI view, hosted from the React Navigation shell above.

### iOS (SwiftUI)
On iPhone Duo, SwiftUI `NavigationStack` and `TabView` move into the rail the same way as the native stack, and SwiftUI applies the safe area. Sidebar placement and sections are in `references/patterns/sidebar.md`. Two panes in this shell and partially open were not exercised.

### Android (Compose)
Not run on a Surface Duo or foldable. The Compose shell has no hinge handling.

## Gotchas
- **List pane draws no rows beside an expanded sidebar.** Cause: `SafeAreaView` from react-native-screens reads the screen's insets whatever its own position. The flex split applies them to the row, and a nested `ListScreen` applied them again, so the sidebar's 280 pt counted twice. Fix: the list pane passes `sideInsets={false}` to `ListScreen`. It also affects an iPad before iOS 27.1 with the sidebar expanded.
- **Back and sidebar buttons dead on an open, upright Duo in the @expo/ui shell.** See `references/patterns/sidebar.md`.
- **Surface Duo tab bar item under the hinge.** The Material bottom bar centres its items as a group, so with 5 items the middle one sits under the hinge when spanned. Its icon and most of its label are hidden; it stays selectable from its visible edges. `react-native-screens` exposes no item gravity or insets, and hiding a trigger remounts the navigator and resets its state. Accepted in the prototype. An even number of bar items would put the hinge between two items.
- **Surface Duo chrome spans both screens.** The top app bar, full-screen modal and bottom sheet have no hinge awareness. The title stays on the left screen and the trailing header buttons on the right. Keep content on the first screen with `ListScreen` and the `sheet.tsx` padding.
- **Surface Duo rotated.** With the hinge across the window, scrolling content passes under it, so a row or label can sit behind the hinge until scrolled. Accepted for scrolling lists; panes fall back to one.
- **`useHinge` returns `null` on an unknown dual-screen device.** It matches exact pixel sizes on Android with manufacturer Microsoft. Add a row to `dualScreenDevices` for a new device.
- **No hinge geometry on Android.** React Native and Expo SDK 58 expose no hinge or fold geometry there. Bounds or posture at runtime need Jetpack WindowManager in a native module.
- **Surface Duo emulator.** Microsoft no longer updates it; the newest image is Android 12L (API 32) from 2022, so `minSdkVersion` must allow API 32. Spanning is a drag from the left screen's gesture bar onto the hinge, not an adb command. Drag back to unspan.
- **Full-width lists cross the fold when partially open.** Only the panes screen avoids the fold.
- **Folded Duo drops the selection from view.** Panes shows the list without pushing the selected detail. The selection survives and returns on unfold.
- **Folding the iPhone Duo simulator is manual.** Use Device Hub's window (Xcode > Open Developer Tool > Device Hub) to fold, open and set the hinge angle; `simctl` and AXe expose no fold control. An earlier run found no fold control and verified only `closed`; later runs folded and opened the simulator through Device Hub.
- **Xcode 27 tooling.** Xcode 27 removed the standalone Simulator app and moved `SimulatorKit.framework`, which breaks simulator automation built for Xcode 26. AXe 1.8.0 is the first release that supports Xcode 27. The iOS 27.1 runtime supports only iPhone Duo.

## Migration notes
- Device-model checks or `isTablet` flags for two-pane layouts: replace with `usePaneLayout`, which reads only the window.
- Fixed tab bar heights and top-and-bottom-only safe areas: remove the heights and add left and right edges on the content, since the rail is a side inset.
- Custom JS headers or tab bars: move to `Stack` and `NativeTabs` so iOS can place them in the rail.
- An existing WindowManager or hinge native module: keep it only for runtime bounds or posture. For Surface Duo geometry and fold-centred splits, `useHinge` and `usePaneLayout` need no native code.
- Master-detail screens with separate routes: keep the push route for single-pane mode and hold selection in the screen's state for dual-pane mode.
