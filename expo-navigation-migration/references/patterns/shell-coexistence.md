# Shell coexistence: two navigation shells in one app

The @expo/ui shell runs as one root-stack route presented over the React Navigation shell, and leaving it dismisses that route.

## Status

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Switch into the other shell | verified: `router.push('/expo-ui')` | verified: `router.push('/expo-ui')` | n/a | n/a |
| Return | n/a | n/a | verified: toolbar button | verified: overflow menu, system back |
| Shell's own tabs | n/a | n/a | verified: `TabView` | verified: `NavigationBar` |
| Shell's own stack | n/a | n/a | verified: `NavigationStack` | partial: React state, no transition |
| Deep links into shell screens | n/a | n/a | gap: state only | gap: state only |
| Flag-driven switch of one route | not exercised | not exercised | not exercised | not exercised |
| Hosting beside a legacy navigator | not exercised | not exercised | not exercised | not exercised |

## Structure

```text
Expo Router root Stack
├── (tabs)     React Navigation shell (NativeTabs, a Stack per tab)
├── modal, sheet, view-code
└── expo-ui    fullScreenModal, headerShown false, gestureEnabled false
               └── ExpoUiShell
                   ├── iOS      one Host > TabView > NavigationStack per tab
                   └── Android  one Host > Column > TopAppBar, screen, NavigationBar
                                route stack in React state, back via BackHandler
```

## Register the shell as one root-stack route

From the prototype: `src/app/_layout.tsx`

```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  // ...
  <Stack.Screen
    name="expo-ui"
    options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
  />
  // ...
</Stack>
```

The route file only renders the shell.

From the prototype: `src/app/expo-ui.tsx`

```tsx
export default function ExpoUiScreen() {
  return <ExpoUiShell />;
}
```

`@/expo-ui/shell` resolves to `shell.ios.tsx`, `shell.android.tsx`, or a `shell.tsx` fallback that shows a message on web.

## Switch in

From the prototype: `src/app/(tabs)/more/index.tsx`

```tsx
<Row
  testID="switch-expo-ui"
  title="Switch to @expo/ui"
  subtitle="SwiftUI on iOS · Jetpack Compose on Android"
  onPress={() => router.push('/expo-ui')}
/>
```

## Return

Every exit calls `router.back()`. On iOS each tab root has a leading toolbar button.

From the prototype: `src/expo-ui/swift-ui/exit-item.tsx`

```tsx
export function ExitToReactNavigation() {
  return (
    <ToolbarItem placement="topBarLeading">
      <Button
        testID="expo-ui-exit"
        label="React Navigation"
        systemImage="arrow.uturn.backward"
        modifiers={[labelStyle('titleOnly')]}
        onPress={() => router.back()}
      />
    </ToolbarItem>
  );
}
```

A pushed iOS screen (`src/expo-ui/swift-ui/item-detail.tsx`) also offers the exit in its menu, behind `confirmDiscard`.

Android exits through the overflow menu, or through system back from the first tab's root. Both appear in the Android section below.

## iOS shell: one Host, TabView, NavigationStack per tab

`SectionedTabView` is the prototype's local module (`modules/tab-sections`). It adds sidebar sections to @expo/ui's `TabView`, and it needs a development build. `defaultTabBarPlacement` is also a local module (`modules/tab-bar-placement`).

From the prototype: `src/expo-ui/shell.ios.tsx`

```tsx
export function ExpoUiShell() {
  const [tab, setTab] = useState<ShellTab>('stack');
  // ...
  const favoritesBadge = favorites.length ? String(favorites.length) : undefined;

  // ... `content` maps each tab to StackTab, PresentTab or NavbarTab

  return (
    <Host style={{ flex: 1 }}>
      <SectionedTabView
        // Workaround: the TabView reads each tab's `badge` in its own body but only observes its
        // own props, so a badge change alone is not drawn until the next tab switch. Carrying the
        // badge in a TabView prop redraws the tab bar / sidebar when it changes.
        testID={`expo-ui-tabs-badge-${favoritesBadge ?? 0}`}
        selection={tab}
        onSelectionChange={(value) => setTab(value as ShellTab)}
        modifiers={[tabViewStyle({ type: 'sidebarAdaptable' }), defaultTabBarPlacement('sidebar')]}>
        {shellSections.map((section) => (
          <SectionedTabView.Section key={section.title} title={section.title}>
            {shellTabs
              .filter(({ value }) => section.tabs.includes(value))
              .map(({ value, title, icon }) => (
                <SectionedTabView.Tab
                  key={value}
                  testID={`expo-ui-tab-${value}`}
                  value={value}
                  label={title}
                  systemImage={sfSymbol(icon, tab === value)}
                  image={value === coloredShellTab ? coloredIcon?.uri : undefined}
                  imageScale={coloredIcon?.scale}
                  badge={value === 'stack' ? favoritesBadge : undefined}>
                  {content[value]}
                </SectionedTabView.Tab>
              ))}
          </SectionedTabView.Section>
        ))}
      </SectionedTabView>
    </Host>
  );
// ...
}
```

Each tab owns a `NavigationStack`. The Stack tab keeps its path in React state. The Present and Navbar tabs push nothing and pass no `path`.

From the prototype: `src/expo-ui/swift-ui/stack-tab.tsx`

```tsx
export function StackTab({ favorites, onToggleFavorite }: Props) {
  const [path, setPath] = useState<string[]>([]);

  // ...
  return (
    <NavigationStack path={path} onPathChange={setPath}>
      <Toolbar modifiers={[navigationTitle('Stack')]}>
        <List>
          // ...
              <NavigationLink
                // ...
                value={`item-${item.id}`}>
          // ...
        </List>
        // ... Toolbar.Content holds ExitToReactNavigation
      </Toolbar>
      {items.map((item) => (
        <NavigationDestination key={item.id} value={`item-${item.id}`}>
          <ItemDetail
            // ...
            onPop={() => setPath((current) => current.slice(0, -1))}
            onPopToRoot={() => setPath([])}
          />
        </NavigationDestination>
      ))}
    </NavigationStack>
  );
// ...
}
```

## Android shell: Compose Column, React-state stack, BackHandler

From the prototype: `src/expo-ui/shell.android.tsx`

```tsx
export function ExpoUiShell() {
  // ...
  const [tab, setTab] = useState<ShellTab>('stack');
  // Only the Stack tab pushes, but each tab keeps its own stack like a real tab container.
  const [stacks, setStacks] = useState<Record<ShellTab, readonly StackEntry[]>>({
    stack: [],
    present: [],
    navbar: [],
  });
  // ...
  const stack = stacks[tab];
  const top = stack.at(-1);
  // ...
  const setStack = (update: (current: readonly StackEntry[]) => readonly StackEntry[]) =>
    setStacks((all) => ({ ...all, [tab]: update(all[tab]) }));

  const push = (id: string) =>
    setStack((current) => [...current, { id, renames: 0, dirty: false }]);
  const pop = () =>
    confirmDiscard(top?.dirty ?? false, () => setStack((current) => current.slice(0, -1)));
  // ...
  const exit = () => confirmDiscard(top?.dirty ?? false, () => router.back());
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

  // ...
  const exitEntry: MenuEntry = { label: 'React Navigation', onClick: exit, dividerBefore: !!top };
  // ...
  return (
      // ...
      <Host style={{ flex: 1 }}>
        <Column modifiers={[fillMaxSize(), background(colors.surface)]}>
          <TopAppBar>
            // ...
                <IconButton onClick={pop} modifiers={[testTag('expo-ui-back')]}>
            // ...
            <TopAppBar.Actions>
              // ...
              <OverflowMenu entries={menu} />
            </TopAppBar.Actions>
          </TopAppBar>

          // ... current screen: ItemScreen, StackRoot, PresentRoot or NavbarRoot
          <NavigationBar>
            // ...
          </NavigationBar>
          // ...
        </Column>
      </Host>
      // ...
  );
// ...
}
```

## Shared between the shells

`shellTabs` in `src/expo-ui/model.ts` reuses titles and icons from the React Navigation config. Pops and closes either shell controls can use one confirm helper.

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

## What this proves and what it does not

Proven on simulators and emulators: an @expo/ui shell runs inside an Expo Router app as one `fullScreenModal` route, a user can enter it and return on iOS and Android, and each platform's shell can run its own tabs and stack underneath that route.

Not proven:

- **A runtime switch of a route.** The prototype never chooses between two implementations of one route. `/expo-ui` is a separate route that a user opens with a tap. Its code has no feature flag.
- **Coexistence with a legacy navigator.** Expo Router is the root in every run. The source uses no React Navigation navigator outside Expo Router, and no other navigator was hosted beside the shells.
- **Shared navigation state.** The shells share config and helpers only. Screen state, stacks and tab selection are separate.
- **URLs into the @expo/ui shell.** Its screens are state only, so they have no URL, deep link or typed route.
- **Physical hardware.** See [verification.md](verification.md).

A feature-flag plan built on this model extends it. Run the plan's own spike for those points before relying on them.

## Gotchas

- The route sets `gestureEnabled: false`, so the exit controls are the way out.
- The shell's `useState` lives in `ExpoUiShell`, so a shell's stacks and tab belong to that presentation. Return-and-reenter behaviour has no recorded result.
- Android `fullScreenModal` and `modal` look the same: both are full screen.
- `BackHandler` is registered for the shell's whole mount and always returns `true`. Sheets are separate windows, so see "Modal-sheet back" in [gaps-and-bugs.md](gaps-and-bugs.md).
- All @expo/ui limits are in [gaps-and-bugs.md](gaps-and-bugs.md).

## Migration notes

- Look for the app's root navigator and ask whether one root-stack route can host the new shell. This pattern assumes Expo Router already owns the root.
- List every deep link and URL in the flow to move. The @expo/ui shell has no URLs.
- The comparison's recommendation is Expo Router for app navigation and @expo/ui for leaf content. It accepts an @expo/ui SwiftUI `NavigationStack` for a self-contained iOS-only flow with no deep links, no back interception and no Android counterpart, presented as one route.
- That recommendation says not to build Android navigation from Compose pieces. The Android shell here shows the cost: a hand-written stack, back handling and submenus, with no transitions.
- Budget a spike for the flag switch and for any legacy navigator. This prototype has neither.
