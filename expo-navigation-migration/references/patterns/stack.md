# Stack: push, pop, pop to root

A stack moves forward through screens and back again; an app needs it for any list-to-detail or multi-step flow.

## Status

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Push | verified: `router.push` | verified: `router.push` | verified: `NavigationLink` value | partial: JS array stack |
| Pop one screen | verified: `router.back` | verified: `router.back` | verified: edit `path` | partial: JS array stack |
| Pop to root | verified: `router.dismissAll` | verified: `router.dismissAll` | verified: `setPath([])` | partial: JS array stack |
| Push transition | verified: native | verified: native, animated | verified: native | gap: no transition |
| Replace top screen | not exercised: `router.replace` written | not exercised: `router.replace` written | n/a: not implemented | n/a: not implemented |
| Typed routes, deep links | partial: one iPad deep-link open, `typedRoutes` compile checks | not exercised: `typedRoutes` on | gap: state only | gap: state only |

Every `verified` cell ran on a simulator or emulator.

## React Navigation (Expo Router + react-native-screens)

### Shared

Each tab folder's `_layout.tsx` is a native `Stack`. Shared options live in one file.

From the prototype: `src/app/(tabs)/(stack)/_layout.tsx`

```tsx
export default function StackTabLayout() {
  // ...
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Stack' }} />
      <Stack.Screen name="item/[id]" options={{ headerLargeTitleEnabled: false }} />
      // ...
    </Stack>
  );
// ...
}
```

From the prototype: `src/navigation/stack-options.ts`

```ts
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
};
```

A list row pushes a typed route.

From the prototype: `src/app/(tabs)/(stack)/index.tsx`

```tsx
{items.slice(0, 6).map((item) => (
  <Row
    key={item.id}
    testID={`push-${item.id}`}
    title={item.title}
    subtitle="Push detail"
    onPress={() =>
      router.push({ pathname: '/item/[id]', params: { id: item.id, depth: '1' } })
    }
  />
))}
```

A pushed screen reads its params, then pushes, replaces or pops.

From the prototype: `src/app/(tabs)/(stack)/item/[id].tsx`

```tsx
const { id, depth = '1' } = useLocalSearchParams<{ id: string; depth?: string }>();
// ...
<Section title={`Stack depth ${level}`}>
  <Row
    testID="push-next"
    title="Push next item"
    onPress={() =>
      router.push({
        pathname: '/item/[id]',
        params: { id: nextId, depth: String(level + 1) },
      })
    }
  />
  <Row
    testID="item-replace"
    title="Replace with next item"
    onPress={() =>
      router.replace({ pathname: '/item/[id]', params: { id: nextId, depth: String(level) } })
    }
  />
  <Row testID="item-pop" title="Pop" onPress={() => router.back()} />
  <Row testID="item-pop-to-top" title="Pop to top" onPress={() => router.dismissAll()} />
</Section>
```

With `typedRoutes` on, a wrong `pathname` or a missing param is a type error.

From the prototype: `app.json`

```json
"experiments": {
  "typedRoutes": true,
  // ...
}
```

### iOS

The `Stack` renders `UINavigationController`. No platform-specific code.

### Android

The `Stack` renders a Fragment stack with a Material top app bar. No platform-specific code.

## @expo/ui

### iOS (SwiftUI)

A `NavigationStack` whose `path` is React state. `NavigationLink` pushes a value, and the `NavigationDestination` with the same value renders the screen. JS pops by editing the path. The system back button and swipe report their pops through `onPathChange`.

From the prototype: `src/expo-ui/swift-ui/stack-tab.tsx`

```tsx
const [path, setPath] = useState<string[]>([]);

// ...
return (
  <NavigationStack path={path} onPathChange={setPath}>
    <Toolbar modifiers={[navigationTitle('Stack')]}>
      <List>
        // ...
        <Section title="Items">
          {items.map((item) => (
            <NavigationLink
              key={item.id}
              testID={`expo-ui-item-${item.id}`}
              value={`item-${item.id}`}>
              <Text>{favorites.includes(item.id) ? `${item.title} ★` : item.title}</Text>
            </NavigationLink>
          ))}
        </Section>
      </List>
      // ...
    </Toolbar>
    {items.map((item) => (
      <NavigationDestination key={item.id} value={`item-${item.id}`}>
        <ItemDetail
          item={item}
          depth={path.indexOf(`item-${item.id}`) + 1}
          // ...
          onPop={() => setPath((current) => current.slice(0, -1))}
          onPopToRoot={() => setPath([])}
        />
      </NavigationDestination>
    ))}
  </NavigationStack>
);
```

The pushed screen pushes further with another link and calls the pop props from its own buttons.

From the prototype: `src/expo-ui/swift-ui/item-detail.tsx`

```tsx
<Section title={`Stack depth ${depth}`}>
  {next ? (
    <NavigationLink testID={testID('push')} value={`item-${next.id}`}>
      <Text>{`Push ${next.title}`}</Text>
    </NavigationLink>
  ) : null}
  <Button testID={testID('pop')} label="Pop" onPress={pop} />
  <Button testID={testID('pop-to-root')} label="Pop to root" onPress={popToRoot} />
</Section>
```

### Android (Compose)

@expo/ui has no NavHost, so each tab's route stack is an array in React state. The shell renders the top entry, and the `TopAppBar` shows a back arrow while the stack is not empty.

From the prototype: `src/expo-ui/shell.android.tsx`

```tsx
const [stacks, setStacks] = useState<Record<ShellTab, readonly StackEntry[]>>({
  stack: [],
  present: [],
  navbar: [],
});
// ...
const stack = stacks[tab];
const top = stack.at(-1);
const item = top ? findItem(top.id) : undefined;
const setStack = (update: (current: readonly StackEntry[]) => readonly StackEntry[]) =>
  setStacks((all) => ({ ...all, [tab]: update(all[tab]) }));

const push = (id: string) =>
  setStack((current) => [...current, { id, renames: 0, dirty: false }]);
const pop = () =>
  confirmDiscard(top?.dirty ?? false, () => setStack((current) => current.slice(0, -1)));
const popToRoot = () => confirmDiscard(top?.dirty ?? false, () => setStack(() => []));
// ...
<TopAppBar.NavigationIcon>
  {top ? (
    <IconButton onClick={pop} modifiers={[testTag('expo-ui-back')]}>
      <ShellIcon name="back" label="Back" />
    </IconButton>
  ) : null}
</TopAppBar.NavigationIcon>
// ...
{item && top ? (
  <ItemScreen
    item={item}
    entry={top}
    depth={stack.length}
    onPush={push}
    onPop={pop}
    onPopToRoot={popToRoot}
    onChange={changeTop}
  />
) : tab === 'stack' ? (
  <StackRoot favorites={favorites} onPush={push} />
```

From the prototype: `src/expo-ui/compose/screens.tsx`

```tsx
<Header title={`Stack depth ${depth}`} />
{next ? (
  <Row testID={testID('push')} title={`Push ${next.title}`} onClick={() => onPush(next.id)} />
) : null}
<Row testID={testID('pop')} title="Pop" onClick={onPop} />
<Row testID={testID('pop-to-root')} title="Pop to root" onClick={onPopToRoot} />
```

## Gotchas

- Compose pushes swap content with no transition. Cause: @expo/ui has no Compose NavHost, back stack or push animation. Workaround: use the React Navigation stack when the app needs an animated push.
- A Compose back arrow never appears when its slot is added after first render. Cause: `TopAppBar` does not pick up later slots. Fix: keep `TopAppBar.NavigationIcon` mounted and toggle the button inside it.
- SwiftUI pops made by the system back button or swipe reach JS only through `onPathChange`. Fix: always pass `onPathChange` with `path`.
- A SwiftUI pushed screen needs its title as it slides in. Fix: keep every `NavigationDestination` mounted, as the snippet does.
- @expo/ui stacks have no URLs, so links cannot target a pushed screen. Workaround: keep app routing in Expo Router and use @expo/ui for controls inside screens.

## Migration notes

- `navigation.navigate('Item', { id })` and `navigation.push(...)` -> `router.push({ pathname: '/item/[id]', params: { id } })`.
- `navigation.goBack()` and `navigation.pop()` -> `router.back()`. `navigation.popToTop()` -> `router.dismissAll()`. `navigation.replace(...)` -> `router.replace(...)`, which the prototype did not exercise.
- `route.params` -> `useLocalSearchParams()`.
- `createNativeStackNavigator` and `<Stack.Navigator>` screen lists -> a folder with a `_layout.tsx` rendering `Stack`, plus one file per route.
- A stack kept in app state or a custom transition stack -> an Expo Router `Stack`. Move it to @expo/ui only with the gaps above accepted.
