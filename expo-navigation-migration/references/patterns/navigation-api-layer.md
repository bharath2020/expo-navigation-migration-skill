# Navigation API layer

A thin TypeScript layer sits between screens and the router, so tabs, presentation options, icons and shared chrome state each live in one file.

## Status

| Piece | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Config-driven tabs | verified | verified | verified: `shellTabs` reuses it | verified: `shellTabs` reuses it |
| Presentation helpers | verified | partial: page and form sheets fall back to `modal` | n/a | n/a |
| Shared stack options | verified | gap: large title option ignored | n/a | n/a |
| Toolbar icons hook | verified | verified | n/a: takes symbol names | verified: `useShellIcons` wraps it |
| Navbar store | verified | verified | n/a: React state | n/a: React state |
| Back guard | verified: `usePreventRemove` | verified: `usePreventRemove` | gap: own buttons only | partial: confirm in `BackHandler` |
| Unit tests for the helpers | not exercised: prototype has none | not exercised: prototype has none | n/a | n/a |
| Navigation facade | not exercised: prototype has none | not exercised: prototype has none | n/a | n/a |

Every `verified` cell ran on a simulator or emulator.

## Pieces

| Piece | File | Role |
| --- | --- | --- |
| Config-driven tabs | `src/navigation/config.ts` | Tabs and More sections as data, with an SF Symbol and a Material Symbol for each. The tab bar, iPad sidebar and More list are built from it. |
| Presentation helpers | `src/navigation/presentation.ts` | `modalOptions(style)` and `sheetOptions(params)`. Callers pick page, form, full-screen or detents through route params. Android fallbacks live in one place. |
| Shared stack options | `src/navigation/stack-options.ts` | `headerLargeTitleEnabled` and other per-stack defaults. |
| Toolbar icons hook | `src/navigation/use-toolbar-icons.ts` | Resolves `PlatformIcon` to SF Symbol names on iOS and image sources on Android, and returns `ready`. |
| Navbar store | `src/navigation/navbar-store.ts` | `useSyncExternalStore` state for chrome that more than one navigator reads: header items, tab badge, bottom toolbar and tab-bar hiding. |
| Back guard | `usePreventRemove` in `src/app/(tabs)/(stack)/item/[id].tsx` | One pattern for unsaved changes. The comparison recommends wrapping it with `headerBackButtonMenuEnabled: !dirty` in a shared hook for production. The prototype has no such hook. |

The first five files are copied verbatim into `templates/src/navigation/`. `config.ts` requires `assets/images/tab-colored.png`, which is not copied: supply an image or remove `coloredTabIcon`.

## Config-driven tabs

From the prototype: `src/navigation/config.ts`

```ts
export type PlatformIcon = {
  sf: SFSymbol | { default: SFSymbol; selected: SFSymbol };
  md: AndroidSymbol;
};

export type TabConfig = {
  /** The route name of the tab's folder under `src/app/(tabs)`. */
  name: '(stack)' | 'present' | 'navbar' | 'panes' | 'more';
  title: string;
  icon: PlatformIcon;
};
// ...
export const tabs: readonly TabConfig[] = [
  {
    name: '(stack)',
    title: 'Stack',
    icon: { sf: { default: 'square.stack', selected: 'square.stack.fill' }, md: 'layers' },
  },
  // ...
  {
    name: 'more',
    title: 'More',
    icon: {
      sf: { default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' },
      md: 'more_horiz',
    },
  },
];
```

From the prototype: `src/app/(tabs)/_layout.tsx`

```tsx
export default function TabsLayout() {
  const navbarItems = useNavbarItems();
  const bottomToolbar = useBottomToolbar();
  const badges: Partial<Record<string, string>> = {
    navbar: navbarItems.length > 0 ? String(navbarItems.length) : undefined,
  };

  return (
    <NativeTabs
      sidebarAdaptable
      preferredPlacement="sidebar"
      minimizeBehavior="onScrollDown"
      labelVisibilityMode="labeled"
      hidden={Platform.OS === 'ios' && !Platform.isPad && bottomToolbar}>
      {tabs.map((tab) => (
        <NativeTabs.Trigger
          key={tab.name}
          name={tab.name}
          unstable_nativeProps={tab.name === 'navbar' ? coloredAndroidIcon : undefined}>
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
          // ... coloured icon branch for the Navbar tab
            <NativeTabs.Trigger.Icon sf={tab.icon.sf} md={tab.icon.md} />
          // ...
          {badges[tab.name] ? (
            <NativeTabs.Trigger.Badge>{badges[tab.name]}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
```

To add a tab, add a folder under `src/app/(tabs)/` with a `_layout.tsx` (`Stack`) and an `index.tsx`, then add an entry to `tabs`. `name` must equal the folder name. Android holds at most 5 tabs, which is why More is explicit.

## Presentation helpers

From the prototype: `src/navigation/presentation.ts`

```ts
export function modalOptions(style: ModalStyle = 'modal'): NativeStackNavigationOptions {
  if (style === 'formSheet') {
    if (Platform.OS !== 'ios') return { presentation: 'modal', headerShown: false };
    return { presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [1] };
  }
  return { presentation: style, headerShown: false };
}
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

The root layout reads `?style=` from the URL, because the presentation must be right on first mount.

From the prototype: `src/app/_layout.tsx`

```tsx
// `?style=` belongs to the modal's first screen, so the `modal` route's own params never carry
// it. The URL does, and the presentation has to be right on the modal's first mount: an iPad
// form sheet first mounted as another style keeps page-sheet sizing.
const { style } = useGlobalSearchParams<ModalParams>();
return (
  // ...
  <Stack>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    // ...
    <Stack.Screen name="modal" options={modalOptions(style)} />
    // ...
    <Stack.Screen name="sheet" options={({ route }) => sheetOptions(route.params)} />
    // ...
  </Stack>
  // ...
);
```

## Shared stack options

From the prototype: `src/navigation/stack-options.ts`

```ts
/**
 * Shared options for every tab's native stack. iOS gets collapsing large titles. Android ignores
 * `headerLargeTitleEnabled`: this API only draws the Material 3 small top app bar, with no medium or
 * large app bar.
 */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
};
```

## Toolbar icons hook

From the prototype: `src/navigation/use-toolbar-icons.ts`

```ts
export function useToolbarIcons(icons: Record<string, PlatformIcon>) {
  const key = Object.entries(icons)
    .map(([id, icon]) => `${id}:${icon.md}`)
    .join(',');
  const [android, setAndroid] = useState<Record<string, ImageSourcePropType>>({});

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    Promise.all(
      Object.entries(icons).map(async ([id, icon]) => {
        const source = await unstable_getMaterialSymbolSourceAsync(icon.md, 24, '#000000');
        return [id, source] as const;
      }),
    ).then((entries) => {
      // ...
      setAndroid(resolved);
    });
    // ...
  }, [key]);

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

## Navbar store

Module state outside React, so the tab layout and the screen read one value.

From the prototype: `src/navigation/navbar-store.ts`

```ts
let state: readonly NavbarItem[] = navbarCatalog.slice(0, 1);
// ...
/**
 * The header buttons currently shown on the Navbar screen. Kept outside React so the tab bar badge
 * in `(tabs)/_layout.tsx` can show the count too.
 */
export function useNavbarItems() {
  return useSyncExternalStore(subscribe, () => state);
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

## Back guard

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
// ...
<Stack.Screen
  options={{
    headerBackTitle: level === 1 ? 'All items' : 'Previous',
    // Long-press back lists every screen below; only worth it once the stack is deep. It would
    // skip `usePreventRemove` (React Navigation logs an error), so it is off while dirty.
    headerBackButtonMenuEnabled: level > 1 && !dirty,
  }}
/>
```

## Navigation facade

Not from the prototype, whose screens call `router.*` directly. This is a sketch for a migration, and it was not run. Replace the route names and params with the app's own.

Screens import only the facade, so they stay shared while old and new navigation coexist. The facade imports no navigation library. Importing `expo-router` sets a global `react-native-screens` flag at module load, so under the [Entry seam](../flag-seams.md#entry-seam) a static `import { router } from 'expo-router'` here would change the legacy branch.

```ts
// src/navigation/facade.ts
export type Target = { route: 'home' } | { route: 'item'; id: string };

export type Navigator = {
  goTo(target: Target): void;
  back(): void;
  canGoBack(): boolean;
  useBackGuard(dirty: boolean, confirm: (leave: () => void) => void): void;
};

let navigator: Navigator | undefined;

export function installNavigator(next: Navigator) {
  navigator = next;
}

function current() {
  if (!navigator) throw new Error('installNavigator has not run');
  return navigator;
}

export const goTo = (target: Target) => current().goTo(target);
export const back = () => current().back();
export const canGoBack = () => current().canGoBack();
export const useBackGuard: Navigator['useBackGuard'] = (dirty, confirm) =>
  current().useBackGuard(dirty, confirm);
```

Each adapter loads only on its own branch. Install it before that branch's first render: the legacy root module installs the first, and the root `_layout` module installs the second.

```ts
// src/legacy/navigator.ts: imported only by the legacy root
import { createNavigationContainerRef, usePreventRemove } from '@react-navigation/native';
import type { Navigator } from '../navigation/facade';

export const navigationRef = createNavigationContainerRef<LegacyParams>();

export const legacyNavigator: Navigator = {
  goTo: (target) =>
    target.route === 'item'
      ? navigationRef.navigate('Item', { id: target.id })
      : navigationRef.navigate('Home'),
  back: () => navigationRef.goBack(),
  canGoBack: () => navigationRef.canGoBack(),
  useBackGuard: (dirty, confirm) =>
    usePreventRemove(dirty, ({ data }) => confirm(() => navigationRef.dispatch(data.action))),
};
```

```ts
// src/navigation/router-navigator.ts: imported only by the root _layout
import { router, usePreventRemove } from 'expo-router';
import type { Navigator } from './facade';

export const routerNavigator: Navigator = {
  goTo: (target) =>
    target.route === 'item'
      ? router.push({ pathname: '/item/[id]', params: { id: target.id } })
      : router.navigate('/'),
  back: () => router.back(),
  canGoBack: () => router.canGoBack(),
  useBackGuard: (dirty, confirm) => {
    usePreventRemove(dirty, ({ repeat }) => confirm(repeat));
  },
};
```

- `router.*` throws before the first router render, so a call from outside React still has to wait for it.
- The flag is read once per launch, so `useBackGuard` resolves to the same hook on every render.
- A screen that needs the iOS back-menu setting from [Back guard](#back-guard) still sets it in its own options.

The single module-level navigator holds only when one tree runs per launch, as under the [Entry seam](../flag-seams.md#entry-seam). Under the [Hosted tree seam](../flag-seams.md#hosted-tree-seam) and [no-flag path C](../no-flag-paths.md#c-slice-by-self-contained-flow), old and new trees share a runtime, so a second `installNavigator` call overwrites the first, and a shared screen can navigate in the wrong tree. There, choose the adapter by which tree owns the calling screen, for example with a `useNavigator()` hook reading a context that each tree's root provides. A call from outside React has no owning screen, so it must name its tree. This variant was not run either.

## @expo/ui

The @expo/ui shells use two pieces of this layer: the tab config and, on Android, the icons hook. They have no routes, so the presentation helpers and stack options do not apply, and they keep their stacks and button counts in React state rather than the navbar store.

### iOS (SwiftUI)

`shellTabs` reuses the config's titles and icons. `sfSymbol` picks the symbol name, which SwiftUI takes directly, so the icons hook is not needed.

From the prototype: `src/expo-ui/model.ts`

```ts
function fromConfig(value: ShellTab, name: TabConfig['name']): ShellTabConfig {
  const tab = tabs.find((candidate) => candidate.name === name);
  return { value, title: tab?.title ?? value, icon: tab?.icon ?? { sf: 'circle', md: 'circle' } };
}
// ...
export const shellTabs: readonly ShellTabConfig[] = [
  fromConfig('stack', '(stack)'),
  fromConfig('present', 'present'),
  fromConfig('navbar', 'navbar'),
];
// ...
export function sfSymbol(icon: PlatformIcon, selected = false) {
  if (typeof icon.sf === 'string') return icon.sf;
  return selected ? icon.sf.selected : icon.sf.default;
}
```

### Android (Compose)

The same `shellTabs`. Compose `Icon` takes an image source, so `useShellIcons` wraps `useToolbarIcons`, and the shell renders once `ready` is true.

From the prototype: `src/expo-ui/compose/icons.tsx`

```tsx
export function useShellIcons() {
  const { icon, ready } = useToolbarIcons(shellIcons);
  return { ready, source: (name: string) => icon(name) as ImageSourcePropType };
}
```

## Android navigation summary

| | React Navigation (Expo Router) | @expo/ui (Compose) |
| --- | --- | --- |
| Tabs | Material `BottomNavigationView`, max 5 items | `NavigationBar` + `NavigationBarItem` |
| Push / pop | Fragment stack, animated | Array in React state, no transition |
| System back | Pops automatically | `BackHandler` from React Native, written by hand |
| Back intercept | `usePreventRemove` | Confirm inside the `BackHandler` callback |
| App bar | Material top app bar. Header items, menus and the bottom toolbar are @expo/ui Compose | `TopAppBar` (small only) with `Title`, `NavigationIcon` and `Actions` slots |
| Overflow menu | Material dropdown with cascading submenus | `DropdownMenu`, submenus replace items in place |
| Large title | Not supported | Not supported |
| Modal | Full-screen (`modal` and `fullScreenModal` look the same) | None; full-height `ModalBottomSheet` is the closest |
| Page / form sheet | Falls back to the full-screen modal | Full-height `ModalBottomSheet` with its own `TopAppBar` |
| Bottom sheet | `BottomSheetBehavior`, fractional detents, no grabber drawn | `ModalBottomSheet`, half / expanded |
| Icons | Image sources via `useToolbarIcons` | Same hook, then Compose `Icon` |

## Testing guidance

- **Types.** `typedRoutes` makes a wrong `pathname` or missing param a compile error. Run `npx tsc --noEmit` and `npx expo lint` in CI.
- **Unit.** `modalOptions` and `sheetOptions` are pure functions per platform, so they suit table tests. The prototype has none.
- **UI flows.** Rows carry a `testID`. `Stack.Toolbar.Button` has no `testID`, so target `accessibilityLabel`. Compose views take a tag through the `testID` modifier. Tools that ran are in [verification.md](verification.md).
- **Matrix.** iPhone, iPad (sidebar and top tab bar), Android phone, and a foldable or tablet when layouts depend on width. Test system back with and without unsaved changes on every screen that guards it.

## Gotchas

- `Stack.Toolbar`, `Stack.Title` and `NativeTabs` are new APIs that change between SDKs, for example the `headerLargeTitle` rename. Pin versions and re-verify every SDK upgrade.
- Android header icons go through `unstable_getMaterialSymbolSourceAsync`, which is unstable-prefixed and async, so toolbars render a frame late. Render them once `ready` is true.
- `useToolbarIcons` keys its effect on `id:md` pairs, because `icons` is usually a fresh object each render.
- Hiding the tab bar under an iPhone bottom toolbar is an app decision through `setBottomToolbar`. It is not automatic.
- @expo/ui behaviour that needed workarounds here (badge redraw, reversed toolbar order, slots that must stay mounted) can change in any release.
- The full limit list is in [gaps-and-bugs.md](gaps-and-bugs.md).

## Migration notes

- Look for tab lists, screen option objects and modal presets repeated across navigators. Each one maps to a piece above.
- Find every place that sets `presentation` by hand. Move them behind helpers so Android fallbacks stay in one file.
- Find global state that drives chrome from outside a screen, such as badge counts or a hidden tab bar. Those are candidates for a small store.
- Inventory unsaved-changes guards. Each needs `usePreventRemove`, plus the back-menu setting on iOS.
- Inventory icon names. Each icon needs both an SF Symbol and a Material Symbol.
