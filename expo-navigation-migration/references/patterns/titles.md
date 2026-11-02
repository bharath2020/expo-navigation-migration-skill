# Titles
Navigation bar titles that change while the screen shows and iOS large titles that collapse on scroll; an app needs this when a title reflects data or state, or when top-level screens use large titles.

## Status
| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Live title from state | verified, `Stack.Title` | verified, `Stack.Title` | verified, `navigationTitle` | verified, `TopAppBar.Title` |
| Title from `options` state | verified, button count | verified, button count | n/a, no options API | n/a, no options API |
| `setOptions({ title })` | not exercised | not exercised | n/a, no options API | n/a, no options API |
| Subtitle | gap, no API | gap, no API | gap, no API | gap, no API |
| Large title shown | verified | gap, option ignored | verified | gap, small bar only |
| Large title off per screen | verified | gap, option ignored | verified, `inline` | gap, small bar only |
| Toggle large title at runtime | verified | gap, option ignored | verified, see Gotchas | gap, small bar only |
| Collapse on scroll | verified | gap, option ignored | verified | gap, small bar only |

Every `verified` cell ran on a simulator or emulator.

## React Navigation (Expo Router + react-native-screens)
### Shared
Render `<Stack.Title>` from state. The last one rendered wins, so renaming is a state change.

From the prototype: `src/app/(tabs)/(stack)/item/[id].tsx`
```tsx
const baseTitle = item?.title ?? 'Item';
const titles = [baseTitle, `${baseTitle} (draft)`, 'Quarterly notes', 'Meeting recap'];
const title = titles[renames % titles.length];
const rename = () => setRenames(renames + 1);
// ...
{/* Stack.Title rather than options.title: it is derived from state on every render like the
    toolbar below, and the last one rendered wins, so renaming is just a state change. */}
<Stack.Title>{title}</Stack.Title>
```

`<Stack.Screen options={{ title }} />` from state also works. `useNavigation().setOptions({ title })` is documented in the prototype's API notes as working, but no screen uses it for a title.

From the prototype: `src/app/(tabs)/navbar/index.tsx`
```tsx
<Stack.Screen
  options={{ title: `Navbar · ${items.length}`, headerLargeTitleEnabled: largeTitle }}
/>
```

### iOS
`headerLargeTitleEnabled` turns on the large title that collapses into the navbar on scroll. Set it on the stack, turn it off per screen, and toggle it by setting the option from state.

From the prototype: `src/navigation/stack-options.ts`
```ts
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
};
```

From the prototype: `src/app/(tabs)/(stack)/_layout.tsx`
```tsx
<Stack.Screen name="item/[id]" options={{ headerLargeTitleEnabled: false }} />
```

From the prototype: `src/app/(tabs)/navbar/index.tsx`
```tsx
const [largeTitle, setLargeTitle] = useState(true);
// ...
{/* Options rather than `Stack.Title large`: that prop writes the deprecated
  `headerLargeTitle`, which loses to `headerLargeTitleEnabled` from the stack's screenOptions. */}
<Stack.Screen
  options={{ title: `Navbar · ${items.length}`, headerLargeTitleEnabled: largeTitle }}
/>
// ...
<Stack.Toolbar.MenuAction
  hidden={Platform.OS !== 'ios'}
  isOn={largeTitle}
  onPress={() => setLargeTitle(!largeTitle)}>
  Large title
</Stack.Toolbar.MenuAction>
```

### Android
No large title. The option is ignored and only the Material 3 small top app bar is drawn. Live titles use the shared code.

## @expo/ui
### iOS (SwiftUI)
The `navigationTitle` modifier takes the current string. `navigationBarTitleDisplayMode` takes `'large'` or `'inline'`.

From the prototype: `src/expo-ui/swift-ui/item-detail.tsx`
```tsx
<Toolbar
  modifiers={[
    navigationTitle(titleFor(item, renames)),
    navigationBarTitleDisplayMode('inline'),
  ]}>
```

From the prototype: `src/expo-ui/swift-ui/navbar-tab.tsx`
```tsx
<Toolbar
  modifiers={[
    navigationTitle(`Navbar · ${count} button${count === 1 ? '' : 's'}`),
    navigationBarTitleDisplayMode(large ? 'large' : 'inline'),
  ]}>
```

`titleFor` is the prototype's own helper, shared with the Compose shell.

From the prototype: `src/expo-ui/model.ts`
```ts
export function titleFor(item: Item, renames: number) {
  const variants = [item.title, `${item.title} (renamed)`, `Renamed ${item.title}`];
  return variants[renames % variants.length];
}
```

### Android (Compose)
`TopAppBar.Title` renders the title worked out for the top stack entry.

From the prototype: `src/expo-ui/shell.android.tsx`
```tsx
const title =
  item && top
    ? titleFor(item, top.renames)
    : tab === 'navbar'
      ? `Navbar · ${buttonCount} button${buttonCount === 1 ? '' : 's'}`
      : (shellTabs.find((candidate) => candidate.value === tab)?.title ?? '');
// ...
<TopAppBar.Title>
  {/* @expo/ui's Text does not pick up the app bar's one-line title style, so set it here. */}
  <Text style={{ typography: 'titleLarge' }} maxLines={1} overflow="ellipsis">
    {title}
  </Text>
</TopAppBar.Title>
```

No large title: `TopAppBar` is the Material 3 small app bar only, with no medium, large or collapsing variant. The prototype shows the gap as a row.

From the prototype: `src/expo-ui/compose/screens.tsx`
```tsx
{/* Gap: @expo/ui's TopAppBar is the Material 3 small app bar only, no medium/large/collapsing. */}
<Row
  title="Large title"
  supporting="Gap: @expo/ui only has the small TopAppBar, no medium or large app bar."
/>
```

## Gotchas
- iOS, inline title disappears. iOS hides it when the navbar is crowded with buttons, in both React Navigation and @expo/ui. The prototype has no fix.
- React Navigation, `<Stack.Title large>` loses to `headerLargeTitleEnabled` from the stack's `screenOptions`. The prop writes the deprecated `headerLargeTitle`. Set `headerLargeTitleEnabled` through options.
- React Navigation Android, `headerLargeTitleEnabled` does nothing. `setLargeTitle` is a no-op in react-native-screens on Android. Hide any large-title control on Android, as the `hidden` action above does.
- @expo/ui iOS, turning large back on leaves the title collapsed until the user pulls down. Reported as normal UIKit behaviour. No fix applied.
- @expo/ui Android, title text ignores the app bar's one-line style. Set `typography`, `maxLines` and `overflow` on `Text`.

## Migration notes
- `navigation.setOptions({ title })` in an effect -> `<Stack.Title>{title}</Stack.Title>` rendered from state.
- `headerLargeTitle: true` -> `headerLargeTitleEnabled: true`, in shared `screenOptions`, off per screen in the layout.
- `headerTitle` used for a two-line title with a subtitle -> no subtitle API here. Put the second line in screen content.
- Android collapsing or large top app bars -> no equivalent in either stack. Use the small bar and put any large heading in content.
