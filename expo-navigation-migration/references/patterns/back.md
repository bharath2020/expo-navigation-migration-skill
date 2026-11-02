# Back: going back, Android back, intercepting back

Back returns to the previous screen by button, swipe or system key; an app needs interception when leaving would lose unsaved changes.

## Status

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Header back button | verified: no code | verified: no code | verified: system button | partial: own back arrow |
| iOS swipe back | verified: no code | n/a | verified: system gesture | n/a |
| Android system back | n/a | verified: pops automatically | n/a | partial: hand-written `BackHandler` |
| System back at a tab root | n/a | verified: exits the app | n/a | verified: first tab, then leaves shell |
| System back closes menus, sheets, modals | n/a | verified | n/a | partial: sheet dismisses whole |
| Intercept back button, swipe, system back | verified: `usePreventRemove` | verified: `usePreventRemove` | gap: always pops | partial: confirm in `BackHandler` |
| Screen's own pop buttons ask first | not exercised | not exercised | partial: own buttons only | partial: `confirmDiscard` by hand |
| Delete leaves without the prompt | not exercised: `disablePrevention` | not exercised: `disablePrevention` | n/a: Delete asks first | n/a: Delete asks first |
| Back title and long-press menu | verified: menu off while dirty | not exercised | gap: no custom back | n/a: own back arrow |
| Sheet Close asks while dirty | not exercised | not exercised | verified: `confirmDiscard` | verified: `confirmDiscard` |
| Sheet dismissal blocked while dirty | not exercised | not exercised | partial: swipe block unconfirmed | partial: back, scrim, swipe unconfirmed |
| System back inside a sheet's stack | not exercised | not exercised | not exercised | gap: dismisses whole sheet |
| Predictive back | n/a | not exercised: disabled | n/a | not exercised: disabled |

Every `verified` cell ran on a simulator or emulator.

## React Navigation (Expo Router + react-native-screens)

### Shared

The back button, the iOS swipe and Android system back all pop with no code. `usePreventRemove` blocks every one of them while its first argument is true. `repeat()` finishes the pop. The returned function turns prevention off for a pop the screen starts itself, such as Delete.

From the prototype: `src/app/(tabs)/(stack)/item/[id].tsx`

```tsx
const disablePrevention = usePreventRemove(dirty, ({ repeat }) => {
  Alert.alert('Discard changes?', 'This item has unsaved changes.', [
    { text: 'Keep editing', style: 'cancel' },
    {
      text: 'Discard',
      style: 'destructive',
      onPress: () => {
        setDirty(false);
        repeat();
      },
    },
  ]);
});

const confirmDelete = () =>
  Alert.alert(`Delete "${title}"?`, undefined, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        // Deleting discards the edits too, so it leaves without the unsaved-changes prompt.
        setDirty(false);
        disablePrevention();
        router.back();
      },
    },
  ]);
```

### iOS

Two header options set the back button's title and long-press menu.

From the prototype: `src/app/(tabs)/(stack)/item/[id].tsx`

```tsx
<Stack.Screen
  options={{
    headerBackTitle: level === 1 ? 'All items' : 'Previous',
    // Long-press back lists every screen below; only worth it once the stack is deep. It would
    // skip `usePreventRemove` (React Navigation logs an error), so it is off while dirty.
    headerBackButtonMenuEnabled: level > 1 && !dirty,
  }}
/>
```

### Android

System back pops automatically, and `usePreventRemove` intercepts it. System back also closes menus, sheets and modals, and from a root tab it exits the app. Predictive back is off in config.

From the prototype: `app.json`

```json
"android": {
  // ...
  "predictiveBackGestureEnabled": false,
  // ...
},
```

## @expo/ui

### iOS (SwiftUI)

SwiftUI's back button and swipe always pop. Only pops the screen starts itself can ask first.

From the prototype: `src/expo-ui/swift-ui/item-detail.tsx`

```tsx
// Gap: @expo/ui has no navigationBarBackButtonHidden / custom back button, so the system back
// button and the swipe-back gesture always pop, even with unsaved changes. Only the pops this
// screen triggers itself (Pop, Pop to root, Delete) can ask first.
const pop = () => confirmDiscard(dirty, onPop);
const popToRoot = () => confirmDiscard(dirty, onPopToRoot);
```

Both @expo/ui shells share one confirm helper.

From the prototype: `src/expo-ui/model.ts`

```ts
export function confirmDiscard(dirty: boolean, action: () => void) {
  if (!dirty) {
    action();
    return;
  }
  Alert.alert('Discard unsaved changes?', 'This screen has unsaved changes.', [
    { text: 'Keep editing', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: action },
  ]);
}
```

A sheet can block its own dismissal. With unsaved changes, `interactiveDismissDisabled` turns off swipe-down, and Close asks first.

From the prototype: `src/expo-ui/swift-ui/present-tab.tsx`

```tsx
<NavigationStack
  path={path}
  onPathChange={setPath}
  modifiers={[presentationSizing(sizing), interactiveDismissDisabled(dirty)]}>
  // ...
  <ToolbarItem placement="topBarTrailing">
    <Button
      testID="expo-ui-modal-close"
      label="Close"
      onPress={() => confirmDiscard(dirty, onClose)}
    />
  </ToolbarItem>
```

### Android (Compose)

@expo/ui has no Compose BackHandler, so the shell registers React Native's `BackHandler`. Back pops the tab's stack (asking first when dirty), then returns to the first tab, then leaves the shell. The confirm happens inside `pop`.

From the prototype: `src/expo-ui/shell.android.tsx`

```tsx
const pop = () =>
  confirmDiscard(top?.dirty ?? false, () => setStack((current) => current.slice(0, -1)));
// ...
// Hardware back: pop the tab's stack, else go back to the first tab, else leave the shell.
const onBack = useEffectEvent(() => {
  if (top) pop();
  else if (tab !== 'stack') setTab('stack');
  else router.back();
});
useEffect(() => {
  const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
    onBack();
    return true;
  });
  return () => subscription.remove();
}, []);
```

A `ModalBottomSheet` is its own window, so system back dismisses the whole sheet. With unsaved changes the sheet turns off back, scrim taps and swipes, and Close asks first.

From the prototype: `src/expo-ui/compose/sheets.tsx`

```tsx
const close = () =>
  confirmDiscard(dirty, async () => {
    await ref.current?.hide();
    onClose();
  });

// ...
<ModalBottomSheet
  ref={ref}
  onDismissRequest={onClose}
  skipPartiallyExpanded
  showDragHandle={false}
  sheetGesturesEnabled={!dirty}
  properties={{ shouldDismissOnBackPress: !dirty, shouldDismissOnClickOutside: !dirty }}>
```

## Gotchas

- SwiftUI's back button and swipe pop despite unsaved changes. Cause: @expo/ui exposes no `navigationBarBackButtonHidden` or custom back button. Workaround: use the React Navigation stack for any screen that must intercept back; otherwise confirm only the screen's own pops.
- React Navigation logs an error when the iOS long-press back menu is on with `usePreventRemove` dirty at depth 2 or more. Cause: picking from that menu skips `usePreventRemove`. Fix: set `headerBackButtonMenuEnabled` to false while dirty.
- System back in a Compose `ModalBottomSheet` dismisses the sheet instead of popping the step pushed inside it. Cause: the sheet is its own window. Workaround: pop with the arrow in the sheet's app bar, and turn off dismissal while dirty through `properties` and `sheetGesturesEnabled`.
- The `BackHandler` callback returns `true`, so the shell consumes every press. It must call `router.back()` itself to leave.
- Predictive back and `usePreventRemove` were not tested together. Keep `predictiveBackGestureEnabled` false until the app tests it.

## Migration notes

- `navigation.addListener('beforeRemove', ...)` with `e.preventDefault()` and `navigation.dispatch(e.data.action)` -> `usePreventRemove(dirty, ({ repeat }) => ...)`.
- `BackHandler` listeners that pop a stack -> delete them under Expo Router, since system back pops automatically. Keep them only for a state-driven Compose stack.
- `gestureEnabled: false` or a hidden back button used to guard unsaved changes -> `usePreventRemove`.
- `headerBackTitle` carries over unchanged. Add `headerBackButtonMenuEnabled: !dirty` wherever a screen uses `usePreventRemove`.
- A SwiftUI screen that needs a guarded back has no @expo/ui mapping. Keep it on the Expo Router `Stack`, with SwiftUI content inside the screen if needed.
