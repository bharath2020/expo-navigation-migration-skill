# Navbar Buttons
Buttons a screen contributes to the navigation bar on entry and changes from state (icon, badge, disabled, added, removed); an app needs this when bar actions depend on the screen or its data.

## Status
| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Buttons appear on push, leave on pop | verified | verified, icon-only | verified, `topBarTrailing` | verified, `TopAppBar.Actions` |
| Swap icon from state | verified, `star` / `star.fill` | verified, `star_shine` plus tint | verified, `star` / `star.fill` | verified, tinted star |
| Badge on a bar button | verified, `Stack.Toolbar.Badge` | verified, `Stack.Toolbar.Badge` | not exercised, no implementation | verified, `BadgedBox` |
| Disable a bar button | not exercised, menu action only | not exercised, menu action only | verified, `disabled(...)` | verified, `enabled` |
| Add and remove buttons | verified, store list | verified, store list | verified, list slice | verified, list slice |
| Tab badge follows button list | verified | verified | n/a, badge counts favorites | n/a, badge counts favorites |
| Text button | verified, Edit and Close | gap, text dropped | verified, `labelStyle('titleOnly')` | gap, icon-only |
| Leading-edge button | verified, `placement="left"` | verified, icon | verified, `topBarLeading` | not exercised, back arrow only |
| Button in one layout only | verified, iPhone Duo Panes | not exercised, see Gotchas | n/a, no two-pane screen | n/a, no two-pane screen |
| Static button declared in layout | verified, modal Close | verified, modal Close icon | n/a, no layout route | n/a, no layout route |

Every `verified` cell ran on a simulator or emulator.

Disabled menu actions are in `overflow-menu.md`. Disabled bottom bar buttons are in `bottom-toolbar.md`.

## React Navigation (Expo Router + react-native-screens)
### Shared
A pushed screen renders `Stack.Toolbar`. Its buttons arrive as the screen slides in and leave with it. Every prop follows state.

From the prototype: `src/app/(tabs)/(stack)/item/[id].tsx`
```tsx
const toolbarIcons = {
  favoriteOff: { sf: 'star', md: 'star' },
  favoriteOn: { sf: 'star.fill', md: 'star_shine' },
  rename: { sf: 'pencil', md: 'edit' },
  menu: { sf: 'ellipsis.circle', md: 'more_vert' },
  // ...
} satisfies Record<string, PlatformIcon>;
// ...
const { icon, ready } = useToolbarIcons(toolbarIcons);
// ...
{ready ? (
  <Stack.Toolbar placement="right">
    // ...
    <Stack.Toolbar.Button
      icon={icon(favorite ? 'favoriteOn' : 'favoriteOff')}
      tintColor={Platform.OS === 'android' && favorite ? palette.accent : undefined}
      accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
      onPress={() => setFavorite(!favorite)}
    />
    <Stack.Toolbar.Button icon={icon('rename')} accessibilityLabel="Rename" onPress={rename}>
      <Stack.Toolbar.Label>Rename</Stack.Toolbar.Label>
      {renames > 0 ? <Stack.Toolbar.Badge>{String(renames)}</Stack.Toolbar.Badge> : null}
    </Stack.Toolbar.Button>
    // ...
  </Stack.Toolbar>
) : null}
```

Adding or removing a button is a state change. The native navbar updates in place.

From the prototype: `src/app/(tabs)/navbar/index.tsx`
```tsx
{items.map((item) => (
  <Stack.Toolbar.Button
    key={item.id}
    icon={icon(item.id)}
    accessibilityLabel={item.title}
    onPress={() => setLastPressed(item.title)}>
    {item.title}
  </Stack.Toolbar.Button>
))}
```

The list lives in an external store, so any code can change the navbar and the tab layout can read the same list for its badge.

From the prototype: `src/navigation/navbar-store.ts`
```ts
export function useNavbarItems() {
  return useSyncExternalStore(subscribe, () => state);
}
export const navbarItems = {
  /** Adds the given catalog button, or the next one not shown yet. */
  add(id?: string) {
    const next = navbarCatalog.find(
      (item) => !state.includes(item) && (id === undefined || item.id === id),
    );
    if (next) setState([...state, next]);
  },
  remove(id: string) {
    setState(state.filter((item) => item.id !== id));
  },
  removeLast() {
    setState(state.slice(0, -1));
  },
};
```

From the prototype: `src/app/(tabs)/_layout.tsx`
```tsx
const navbarItems = useNavbarItems();
// ...
const badges: Partial<Record<string, string>> = {
  navbar: navbarItems.length > 0 ? String(navbarItems.length) : undefined,
};
```

A button that exists in one layout only: render its toolbar in that branch.

From the prototype: `src/app/(tabs)/panes/index.tsx`
```tsx
{ready ? (
  <Stack.Toolbar placement="right">
    // ...
    <Stack.Toolbar.Button icon={icon('share')} accessibilityLabel="Share" onPress={() => {}}>
      Share
    </Stack.Toolbar.Button>
  </Stack.Toolbar>
) : null}
```

Static items can be declared in the layout, inside `<Stack.Screen>`.

From the prototype: `src/app/modal/_layout.tsx`
```tsx
<Stack.Screen name="index" options={{ title: 'Modal' }}>
  {ready ? (
    <Stack.Toolbar placement="left">
      // ...
    </Stack.Toolbar>
  ) : null}
</Stack.Screen>
```

### iOS
Header items take SF Symbol names and keep text labels. `variant` styles the button.

From the prototype: `src/app/(tabs)/navbar/index.tsx`
```tsx
<Stack.Toolbar placement="left">
  <Stack.Toolbar.Button
    icon={
      Platform.OS === 'android' ? icon(editing ? 'doneMode' : 'editMode') : undefined
    }
    accessibilityLabel={editing ? 'Done' : 'Edit'}
    variant={editing ? 'done' : 'plain'}
    onPress={() => setEditing(!editing)}>
    {editing ? 'Done' : 'Edit'}
  </Stack.Toolbar.Button>
</Stack.Toolbar>
```

### Android
Header items are Compose `IconButton`s in a Compose `Host` and take image sources only. `useToolbarIcons` renders Material Symbols to images and reports `ready`.

From the prototype: `src/navigation/use-toolbar-icons.ts`
```ts
export function useToolbarIcons(icons: Record<string, PlatformIcon>) {
  // ...
  const [android, setAndroid] = useState<Record<string, ImageSourcePropType>>({});
  // ...
  const source = await unstable_getMaterialSymbolSourceAsync(icon.md, 24, '#000000');
  // ...
  const icon = (id: string): ToolbarIcon | undefined => {
    if (Platform.OS === 'ios') {
      const platformIcon = icons[id];
      return platformIcon ? sfName(platformIcon) : undefined;
    }
    return android[id];
  };
  const ready =
    Platform.OS === 'ios' || Object.keys(icons).every((id) => android[id] !== undefined);
  return { icon, ready };
}
```

## @expo/ui
### iOS (SwiftUI)
`ToolbarItem`s in the pushed screen's `Toolbar.Content` belong to that screen. Icon and `disabled(...)` follow state. Declared order below shows as Favorite, Save.

From the prototype: `src/expo-ui/swift-ui/item-detail.tsx`
```tsx
<ToolbarItem placement="topBarTrailing">
  <Button
    testID={testID('save')}
    label="Save"
    systemImage="checkmark"
    modifiers={[disabled(!dirty)]}
    onPress={() => setDirty(false)}
  />
</ToolbarItem>
<ToolbarItem placement="topBarTrailing">
  <Button
    testID={testID('favorite')}
    label={isFavorite ? 'Unfavorite' : 'Favorite'}
    systemImage={isFavorite ? 'star.fill' : 'star'}
    onPress={onToggleFavorite}
  />
</ToolbarItem>
```

Rendering a slice of a list adds and removes items.

From the prototype: `src/expo-ui/swift-ui/navbar-tab.tsx`
```tsx
{navbarButtons
  .slice(0, count)
  .reverse()
  .map((button) => (
    <ToolbarItem key={button.id} placement="topBarTrailing">
      <Button
        testID={`expo-ui-navbar-${button.id}`}
        label={button.label}
        systemImage={sfSymbol(button.icon)}
        onPress={() => setTapped(button.label)}
      />
    </ToolbarItem>
  ))}
```

For a title-only leading button, put a `Button` with `modifiers={[labelStyle('titleOnly')]}` in `<ToolbarItem placement="topBarLeading">`, as `src/expo-ui/swift-ui/exit-item.tsx` does.

### Android (Compose)
One shell-level `TopAppBar` renders actions for the entry on top of a React-state stack. `ShellIcon` is a Compose `Icon` fed by `useToolbarIcons`.

From the prototype: `src/expo-ui/shell.android.tsx`
```tsx
<TopAppBar.Actions>
  // ...
  {item ? (
    <>
      <IconButton
        onClick={() => toggleFavorite(item.id)}
        modifiers={[testTag(`expo-ui-favorite-${item.id}`)]}>
        <ShellIcon
          name={isFavorite ? 'star' : 'starOff'}
          label={isFavorite ? 'Unfavorite' : 'Favorite'}
          tint={isFavorite ? '#F9A825' : undefined}
        />
      </IconButton>
      <IconButton
        onClick={() => changeTop({ renames: (top?.renames ?? 0) + 1 })}
        modifiers={[testTag(`expo-ui-rename-${item.id}`)]}>
        {top && top.renames > 0 ? (
          <BadgedBox>
            <BadgedBox.Badge>
              <Badge>
                <Text>{String(top.renames)}</Text>
              </Badge>
            </BadgedBox.Badge>
            <ShellIcon name="rename" label={`Rename, ${top.renames}`} />
          </BadgedBox>
        ) : (
          <ShellIcon name="rename" label="Rename" />
        )}
      </IconButton>
      <IconButton
        enabled={top?.dirty ?? false}
        onClick={() => changeTop({ dirty: false })}
        modifiers={[testTag(`expo-ui-save-${item.id}`)]}>
        <ShellIcon name="save" label="Save" />
      </IconButton>
    </>
  ) : null}
  // ...
  <OverflowMenu entries={menu} />
</TopAppBar.Actions>
```

The Navbar tab adds and removes actions the same way, with `navbarButtons.slice(0, buttonCount).map(...)` in this slot.

## Gotchas
- React Navigation Android, text-only button disappears. A button without an image source renders nothing. Pass the icon on Android only: `icon={Platform.OS === 'android' ? icon('close') : undefined}`.
- React Navigation Android, SF Symbol name renders nothing. Android takes `ImageSourcePropType` only. Use `useToolbarIcons`.
- React Navigation Android, a `Stack.Toolbar` that first mounts empty and later gets a single button does not show it (seen on the Panes screen). Render the whole toolbar behind `ready`. Adding and removing in a toolbar already showing items works.
- Android, "on" and "off" stars look the same. Material Symbols come from the unfilled font, where `star`, `star_border` and `star_outline` are one glyph. React Navigation uses `star_shine` plus a tint. Compose uses a tint.
- React Navigation, a button in a fragment or wrapper component does not appear. Toolbar children must be toolbar elements. `cond ? <Button /> : null` and `.map(...)` are read.
- React Navigation, UI tests cannot find a toolbar button. `Stack.Toolbar.Button` has no `testID`. Set `accessibilityLabel`: it is also the VoiceOver and TalkBack label.
- @expo/ui iOS, items sharing a placement show in reverse order. Each `ToolbarItem` is layered as its own `.toolbar`. Declare them last to first, or `.reverse()` a list.
- @expo/ui Android, a `TopAppBar` slot added after first render never shows. Keep the slot mounted and toggle its content.

## Migration notes
- `navigation.setOptions({ headerRight })` -> `Stack.Toolbar placement="right"` rendered in the screen. `headerLeft` -> `placement="left"`.
- Buttons in `screenOptions` or a layout `options` object -> `Stack.Toolbar` inside `<Stack.Screen>` when static, inside the page when they read screen state.
- Custom JS header buttons with vector-icon components -> a `{ sf, md }` icon map through `useToolbarIcons`, and a `ready` gate around the toolbar.
- Effects that add or remove header buttons -> a list in state or an external store, mapped to `Stack.Toolbar.Button`.
