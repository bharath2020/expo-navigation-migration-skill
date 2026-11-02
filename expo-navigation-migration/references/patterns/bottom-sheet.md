# Bottom sheet with detents

A bottom sheet is a native surface that rises from the screen's bottom edge and stops at set heights, for secondary content or actions that keep the screen behind in view.

## Status

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Detents and dragging | verified: 30/60/100% | partial: 30% to full on Surface Duo emulator; Pixel 8 drag not driven | verified: `medium` / `large` | partial: half and expanded only |
| Sized to content | verified: API doc pass | verified: API doc pass | n/a: not built | n/a: not built |
| Close from inside | verified: Close row | verified: system back | verified: Close button | verified: dismissed |
| iPad regular width | verified: centred card, no detents | n/a | verified: opens, drag unrecorded | n/a |
| Interaction behind the sheet | not exercised: configured only | not exercised: configured only | not exercised: configured only | n/a: no option used |
| Modal over the sheet | not exercised | not exercised | n/a: not built | n/a: not built |

Every `verified` cell ran on a simulator or emulator. "API doc pass" means the screenshots and follow-up notes behind `NAVIGATION_API.md`: iPhone 17 Pro, iPhone Duo and the Surface Duo emulator on the Xcode 27.1 build, plus a Pixel 8 capture from the first delivery. The feature-by-shell matrix in [verification.md](verification.md) has no row for it.

## React Navigation (Expo Router + react-native-screens)

### Shared

A root-stack route presented as `formSheet`, with detents in its options. Callers pick detents or content sizing with a route param.

From the prototype: `src/navigation/presentation.ts`

```ts
export type SheetDetents = 'detents' | 'fit';
// ...
export type SheetParams = { detents?: SheetDetents };
// ...
export function sheetOptions(params: object | undefined): NativeStackNavigationOptions {
  const { detents = 'detents' } = (params ?? {}) as SheetParams;
  return {
    presentation: 'formSheet',
    headerShown: false,
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    sheetAllowedDetents: detents === 'fit' ? 'fitToContents' : [0.3, 0.6, 1],
    sheetInitialDetentIndex: 0,
    sheetLargestUndimmedDetentIndex: detents === 'fit' ? 'none' : 0,
  };
}
```

From the prototype: `src/app/_layout.tsx`

```tsx
<Stack.Screen name="sheet" options={({ route }) => sheetOptions(route.params)} />
```

From the prototype: `src/app/(tabs)/present/index.tsx`

```tsx
onPress={() => router.push('/sheet')}
// ...
onPress={() => router.push({ pathname: '/sheet', params: { detents: 'fit' } })}
```

The content is an ordinary screen with no navbar, so its title and actions live in the content. It fills the sheet when using detents and sizes to its content when `fit`. It closes with `router.back()`.

From the prototype: `src/app/sheet.tsx`

```tsx
const { detents = 'detents' } = useLocalSearchParams<SheetParams>();
// ...
<View
  style={[
    styles.container,
    detents !== 'fit' && styles.fill,
    // Padding rather than a width keeps the sheet's background across both screens.
    hinge?.orientation === 'vertical' && { paddingRight: hinge.width + hinge.x },
    { backgroundColor: palette.background },
  ]}>
  <Text style={[styles.title, { color: palette.text }]}>Bottom sheet</Text>
  // ...
  <Section>
    <Row
      testID="sheet-open-modal"
      title="Present modal from the sheet"
      onPress={() => router.push('/modal')}
    />
    // ...
    <Row testID="sheet-close" title="Close" onPress={() => router.back()} />
  </Section>
</View>
```

### iOS

`UISheetPresentationController` detents on iPhone. On iPad in regular width, iPadOS shows a form sheet as a centred card and does not apply detents.

### Android

Material `BottomSheetBehavior` with the same fractional detents. No grabber is drawn, and the sheet is dragged by its body. System back closes it.

Two emulator runs give the status. On the Pixel 8 AVD the sheet opened at 30% and closed with back, and no drag was driven. On the Surface Duo emulator (Android 12L, API 32), spanned, it was dragged from the 30% detent to full height. Neither run records the 60% stop.

## @expo/ui

### iOS (SwiftUI)

`BottomSheet` with a `Group` child carrying the presentation modifiers. SwiftUI detents here are `medium` and `large`.

From the prototype: `src/expo-ui/swift-ui/present-tab.tsx`

```tsx
const [sheet, setSheet] = useState(false);
// ...
<BottomSheet
  isPresented={sheet}
  onIsPresentedChange={setSheet}
  anchor={
    <Button
      testID="expo-ui-open-sheet"
      label="Open bottom sheet"
      onPress={() => setSheet(true)}
    />
  }>
  <Group
    modifiers={[
      presentationDetents(['medium', 'large']),
      presentationDragIndicator('visible'),
      presentationBackgroundInteraction({ type: 'enabledUpThrough', detent: 'medium' }),
    ]}>
    <List>
      // ...
      <Button
        testID="expo-ui-close-sheet"
        label="Close bottom sheet"
        onPress={() => setSheet(false)}
      />
    </List>
  </Group>
</BottomSheet>
```

### Android (Compose)

Material `ModalBottomSheet`, mounted while open. It has two stops: partially expanded and expanded. The half, full, back to half, dismissed sequence was exercised. The status is partial because those are the only stops.

From the prototype: `src/expo-ui/compose/sheets.tsx`

```tsx
export function BottomSheetDemo({ onClose }: { onClose: () => void }) {
  const ref = useRef<ModalBottomSheetRef>(null);
  // ...
  const hide = async () => {
    await ref.current?.hide();
    onClose();
  };
  // ...
  return (
    <ModalBottomSheet ref={ref} onDismissRequest={onClose} showDragHandle>
      {/* Full-height content: Material only stops half way (the medium detent) when the content
          is taller than half the screen; shorter content opens fully expanded. */}
      <Column modifiers={[fillMaxWidth(), fillMaxHeight(), padding(0, 0, 0, 24)]}>
        // ...
        <Button onClick={hide} modifiers={[padding(16, 8, 16, 0), testTag('expo-ui-close-sheet')]}>
          <Text>Close bottom sheet</Text>
        </Button>
      </Column>
      // ...
    </ModalBottomSheet>
  );
// ...
}
```

From the prototype: `src/expo-ui/shell.android.tsx`

```tsx
{sheet === 'bottom' ? <BottomSheetDemo onClose={() => setSheet(undefined)} /> : null}
```

## Gotchas

- Compose: a sheet opens fully expanded instead of half way. Cause: Material stops half way only when content is taller than half the screen. Fix: give the content `fillMaxHeight()`.
- iPad, React Navigation: detents have no effect. Cause: iPadOS shows a form sheet as a centred card in regular width. Fix: design the content to work as a card, with detents applying on iPhone and Android.
- React Navigation Android: one drag between detents is recorded, from 30% to full height on the spanned Surface Duo emulator. `adb` did not drive a drag on the Pixel 8, and a first-delivery Pixel 8 screenshot named as dragged has no record of how it was driven. Check phone drags and the 60% stop by hand after migrating.
- React Navigation Android: no grabber appears despite `sheetGrabberVisible: true`. Accepted: the sheet is dragged by its body.
- React Navigation: a `formSheet` has no navbar, because `headerShown` is false and an Android `formSheet` cannot host a header. Put title and actions in the content.
- iOS: a sheet sometimes does not open when tapped right after another sheet closes. Cause unknown and no fix recorded. The scripted flows wait for the close animation to end first.
- Spanned dual-screen window: the native sheet spans both screens. Fix: pad the content off the second screen, as `sheet.tsx` does with the prototype's `useHinge` hook.

## Migration notes

- Look for a JavaScript bottom-sheet library, `snapPoints`, or `Modal` with slide-up animation. On React Navigation, map to a `formSheet` route with `sheetAllowedDetents` fractions.
- Map percentage snap points directly to fractions on React Navigation. On @expo/ui, map them to the nearest `medium` or `large` on iOS and to half or expanded on Android.
- A sheet opened from a local `useState` flag becomes a pushed route on React Navigation, and stays local state on @expo/ui.
- Look for a pass-through backdrop at low snap points. It maps to `sheetLargestUndimmedDetentIndex` or `presentationBackgroundInteraction`, neither of which was exercised, so verify it after migrating.
- Content-sized sheets map to `sheetAllowedDetents: 'fitToContents'` on React Navigation. The prototype has no @expo/ui equivalent.
