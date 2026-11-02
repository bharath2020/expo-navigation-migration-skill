# Bottom Toolbar
A native bar of actions at the bottom of a screen, separate from the tab bar; an app needs this for screen-level actions that belong near the thumb, or when legacy code positions its own bottom bar.

## Status
| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Phone, inside a tab | verified, tab bar hidden | verified, floating toolbar | gap, tab bar covers it | verified, `HorizontalFloatingToolbar` |
| iPad, inside a tab | verified, tab bar on top | n/a | verified, `bottomBar` | n/a |
| Android tablet | n/a | not exercised, phone only | n/a | not exercised, phone only |
| Toggle from state | verified | verified | verified, iPad only | verified |
| Disable at list limits | not exercised | not exercised | not exercised | not exercised |
| Flexible spacers centre buttons | verified | partial, ignored without `width` | n/a, not used | n/a, not used |

Every `verified` cell ran on a simulator or emulator.

## React Navigation (Expo Router + react-native-screens)
### Shared
`Stack.Toolbar placement="bottom"` is a `UIToolbar` on iOS and a Material 3 floating toolbar (Compose) on Android. It works only inside a page component. Render it outside the scroll view. The `ready` gate and `icon` come from `useToolbarIcons` (see `navbar-buttons.md`).

From the prototype: `src/app/(tabs)/navbar/index.tsx`
```tsx
<>
  <ListScreen>
    // ...
  </ListScreen>
  {/* UIToolbar on iOS, a Material 3 floating toolbar on Android. Flexible spacers centre the
    buttons on iOS; Android ignores spacers without a width. Outside the ScrollView: Android
    pins the toolbar to the bottom of its parent, which inside the list was the content. */}
  {ready && bottomBar ? (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        icon={icon('add')}
        accessibilityLabel="Add a header button"
        disabled={!canAdd}
        onPress={() => navbarItems.add()}>
        Add
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Button
        icon={icon('remove')}
        accessibilityLabel="Remove the last header button"
        disabled={items.length === 0}
        onPress={() => navbarItems.removeLast()}>
        Remove
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
    </Stack.Toolbar>
  ) : null}
</>
```

### iOS
On iPhone the toolbar sits under the iOS 26+ floating tab bar, so the tab layout hides the tab bar while the toolbar shows. The flag lives in a store outside React, so both the screen and the tab layout read it. The iPad tab bar is at the top and stays.

From the prototype: `src/navigation/navbar-store.ts`
```ts
let bottomToolbar = false;
const toolbarListeners = new Set<() => void>();

function subscribeToolbar(listener: () => void) {
  toolbarListeners.add(listener);
  return () => toolbarListeners.delete(listener);
}
// ...
export function useBottomToolbar() {
  return useSyncExternalStore(subscribeToolbar, () => bottomToolbar);
}

export function setBottomToolbar(on: boolean) {
  bottomToolbar = on;
  toolbarListeners.forEach((listener) => listener());
}
```

From the prototype: `src/app/(tabs)/_layout.tsx`
```tsx
const bottomToolbar = useBottomToolbar();
// ...
<NativeTabs
  // ...
  hidden={Platform.OS === 'ios' && !Platform.isPad && bottomToolbar}>
```

### Android
Same code. Buttons draw icon-only and the tab bar stays visible below the floating toolbar.

## @expo/ui
### iOS (SwiftUI)
`ToolbarItem placement="bottomBar"`. It shows on iPad. On iPhone the tab bar covers it, and @expo/ui cannot hide the tab bar. Declared Remove then Add, so it reads Add, Remove.

From the prototype: `src/expo-ui/swift-ui/navbar-tab.tsx`
```tsx
{/* Gap: on iPhone the iOS 26+ floating tab bar draws over a `bottomBar` toolbar in a tab
    (Apple FB20447249). SwiftUI's fix is `.toolbarVisibility(.hidden, for: .tabBar)`,
    which @expo/ui does not expose, so the bar only shows where the tab bar is on top. */}
// ...
{/* Reversed for the same reason: Add then Remove. */}
{bottomBar ? (
  <ToolbarItem placement="bottomBar">
    <Button
      testID="expo-ui-toolbar-remove"
      label="Remove bar button"
      systemImage="minus"
      modifiers={[disabled(count === 0)]}
      onPress={remove}
    />
  </ToolbarItem>
) : null}
{bottomBar ? (
  <ToolbarItem placement="bottomBar">
    <Button
      testID="expo-ui-toolbar-add"
      label="Add bar button"
      systemImage="plus"
      modifiers={[disabled(count >= navbarButtons.length)]}
      onPress={add}
    />
  </ToolbarItem>
) : null}
```

### Android (Compose)
`HorizontalFloatingToolbar` passed to the screen, which floats it over the list in a `Box`.

From the prototype: `src/expo-ui/compose/screens.tsx`
```tsx
<Screen
  bottomBar={
    bottomBar ? (
      <HorizontalFloatingToolbar modifiers={[padding(0, 0, 0, 16)]}>
        <IconButton
          enabled={count < max}
          onClick={() => onCount(count + 1)}
          modifiers={[testTag('expo-ui-toolbar-add')]}>
          <ShellIcon name="add" label="Add bar button" />
        </IconButton>
        <IconButton
          enabled={count > 0}
          onClick={() => onCount(count - 1)}
          modifiers={[testTag('expo-ui-toolbar-remove')]}>
          <ShellIcon name="remove" label="Remove bar button" />
        </IconButton>
      </HorizontalFloatingToolbar>
    ) : null
  }>
```

From the prototype: `src/expo-ui/compose/rows.tsx`
```tsx
export function Screen({ children, bottomBar }: { children: ReactNode; bottomBar?: ReactNode }) {
  if (!bottomBar) {
    return <LazyColumn modifiers={[weight(1), fillMaxWidth()]}>{children}</LazyColumn>;
  }
  return (
    <Box modifiers={[weight(1), fillMaxWidth()]} contentAlignment="bottomCenter">
      <LazyColumn modifiers={[fillMaxSize()]}>{children}</LazyColumn>
      {bottomBar}
    </Box>
  );
}
```

## Gotchas
- iPhone, bottom toolbar is invisible inside a tab. The iOS 26+ floating tab bar covers it (Apple FB20447249, also in plain SwiftUI). React Navigation: set `NativeTabs hidden` while it shows. @expo/ui: no fix, because `.toolbarVisibility(.hidden, for: .tabBar)` is not exposed; use React Navigation for that screen.
- React Navigation Android, toolbar draws behind list rows. It was inside the `ScrollView`, and Android pins it to the bottom of its parent. Render it as a sibling of the scroll view.
- React Navigation Android, a flexible `Stack.Toolbar.Spacer` is ignored. Give a spacer a `width` when spacing matters on Android.
- React Navigation Android, labels do not show. Header and toolbar items are icon-only (see `navbar-buttons.md`).
- @expo/ui iOS, bottom items show in reverse order, as trailing items do (see `navbar-buttons.md`). Declare them last to first.

## Migration notes
- An absolutely positioned JS bar above the tab bar -> `Stack.Toolbar placement="bottom"` rendered in the page, outside the scroll view.
- `tabBarStyle: { display: 'none' }` or similar set while a bar shows -> `hidden` on `NativeTabs`, from a store both the screen and the tab layout read.
- Bottom bars in a tab that must show on iPhone -> keep the screen on React Navigation. @expo/ui shows them on iPad only.
- Bottom bars with text buttons -> add icons for Android.
