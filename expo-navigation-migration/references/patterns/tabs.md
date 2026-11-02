# Tabs: tab bar, badge, coloured tab icon

A tab bar switches between an app's top-level sections, each with its own stack; an app needs it for its primary destinations.

## Status

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Tab bar from one config | verified: `NativeTabs` | verified: `NativeTabs` | verified: local tab module | verified: `NavigationBar` |
| Live badge | verified: `Trigger.Badge` | verified: Navbar tab badge | partial: redraw workaround | verified: `BadgedBox` |
| Coloured tab icon | verified: `src`, `original` rendering | partial: `unstable_nativeProps` workaround | partial: local module | verified: untinted `Image` |
| Explicit More tab | verified | verified | n/a: 3 tabs, no More | n/a: 3 tabs, no More |
| Stack kept per tab | not exercised: one `Stack` each | not exercised: one `Stack` each | not exercised: app state | not exercised: app state |
| Re-tap pops to root | not exercised | not exercised | not exercised | not exercised |
| Select a tab from code | not exercised: `router.navigate` | not exercised: `router.navigate` | n/a: not implemented | verified: back to first tab |

Every `verified` cell ran on a simulator or emulator. iPad sidebar and top tab bar are a separate pattern.

## React Navigation (Expo Router + react-native-screens)

### Shared

Tabs are static data. One config lists the tabs, each with an SF Symbol for iOS and a Material Symbol for Android.

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

/**
 * The 4 primary tabs, then More. The native tab bar on both platforms and the iPad sidebar are
 * all built from this list in `src/app/(tabs)/_layout.tsx`.
 */
export const tabs: readonly TabConfig[] = [
  {
    name: '(stack)',
    title: 'Stack',
    icon: { sf: { default: 'square.stack', selected: 'square.stack.fill' }, md: 'layers' },
  },
  // ...
];
```

The layout maps the config to native triggers. The badge is live state. `NativeTabs` renders `UITabBarController` on iOS and Material `BottomNavigationView` on Android.

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
          {tab.name === 'navbar' ? (
            // iOS: an image icon with `original` rendering keeps its colours in the tab bar, the
            // sidebar and under Liquid Glass.
            <NativeTabs.Trigger.Icon src={coloredTabIcon} renderingMode="original" />
          ) : (
            <NativeTabs.Trigger.Icon sf={tab.icon.sf} md={tab.icon.md} />
          )}
          {badges[tab.name] ? (
            <NativeTabs.Trigger.Badge>{badges[tab.name]}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
```

To add a tab, add a folder under `src/app/(tabs)/` with a `_layout.tsx` (`Stack`) and an `index.tsx`, then add an entry to `tabs`. `name` must equal the folder name. To select a tab from code, the prototype's API notes give `router.navigate('/navbar')`; no screen calls it.

More is the 5th tab: a stack whose root lists `moreSections` from the same config and pushes `/more/[section]`. Adding a section is one config entry.

From the prototype: `src/app/(tabs)/more/index.tsx`

```tsx
{moreSections.map((section) => (
  <Row
    key={section.id}
    testID={`more-${section.id}`}
    title={section.title}
    subtitle={section.summary}
    onPress={() =>
      router.push({ pathname: '/more/[section]', params: { section: section.id } })
    }
  />
))}
```

The coloured icon is a PNG at 1x, 2x and 3x, loaded once. It keeps its colours selected or not, and the badge still draws on top.

From the prototype: `src/navigation/config.ts`

```ts
export const coloredTabIcon: number = require('../../assets/images/tab-colored.png');
```

### iOS

`Trigger.Icon` takes an image `src` with `renderingMode="original"`, as in the layout above. It holds in the Liquid Glass tab bar and the sidebar.

### Android

The tab bar tints every icon unless told not to. react-native-screens 4.30 has the switch, but expo-router 58's `Icon` does not pass it through, so the trigger sets its Android icons through `unstable_nativeProps`.

From the prototype: `src/app/(tabs)/_layout.tsx`

```tsx
const coloredAndroidIcon = {
  android: {
    icon: { type: 'imageSource', imageSource: coloredTabIcon, tinting: 'original' },
    selectedIcon: { type: 'imageSource', imageSource: coloredTabIcon, tinting: 'original' },
  },
} as const;
```

## @expo/ui

Both shells reuse the same titles and icons from the tab config.

From the prototype: `src/expo-ui/model.ts`

```ts
export const shellTabs: readonly ShellTabConfig[] = [
  fromConfig('stack', '(stack)'),
  fromConfig('present', 'present'),
  fromConfig('navbar', 'navbar'),
];

/** The middle tab, which shows the full-colour `coloredTabIcon` instead of its symbol. */
export const coloredShellTab: ShellTab = 'present';
```

### iOS (SwiftUI)

A SwiftUI `TabView` inside one `Host`. Selection is React state, and each tab's content owns its `NavigationStack`. The shell uses `SectionedTabView`, from a local module that wraps SwiftUI's `TabView` in a local view, so it needs a development build. @expo/ui's own `TabView` draws the same tab bar on iPhone; the prototype has no code using it directly.

From the prototype: `src/expo-ui/shell.ios.tsx`

```tsx
const [tab, setTab] = useState<ShellTab>('stack');
// ...
const favoritesBadge = favorites.length ? String(favorites.length) : undefined;
// ...
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
```

@expo/ui 58's `TabView.Tab` takes only an SF Symbol name, and SwiftUI tints it. The local module also takes an image and draws it with `.alwaysOriginal` rendering.

From the prototype: `modules/tab-sections/ios/TabSectionsModule.swift`

```swift
if let image = coloredImage(tab.props) {
  Label {
    Text(tab.props.label)
  } icon: {
    Image(uiImage: image)
  }
} else {
  Label(tab.props.label, systemImage: tab.props.systemImage)
}
// ...
let image = UIImage(data: data, scale: props.imageScale)?.withRenderingMode(.alwaysOriginal)
```

### Android (Compose)

A Material 3 `NavigationBar` at the bottom of the shell's `Column`, with a `BadgedBox` for the badge. A Compose `Image` is not tinted, unlike an `Icon`. `ShellIcon` is a local wrapper around Compose `Icon`, which takes an image source rather than a symbol name.

From the prototype: `src/expo-ui/shell.android.tsx`

```tsx
<NavigationBar>
  // ...
  {shellTabs.map(({ value, title: label }) => (
    <NavigationBarItem
      key={value}
      selected={tab === value}
      onClick={() => setTab(value)}
      modifiers={[testTag(`expo-ui-tab-${value}`)]}>
      <NavigationBarItem.Icon>
        {value === 'stack' && favorites.length > 0 ? (
          <BadgedBox>
            <BadgedBox.Badge>
              <Badge>
                <Text>{String(favorites.length)}</Text>
              </Badge>
            </BadgedBox.Badge>
            <ShellIcon name={value} />
          </BadgedBox>
        ) : value === coloredShellTab ? (
          // An `Image`, unlike an `Icon`, is not tinted with the item colour.
          <Image source={coloredTabIcon} modifiers={[size(24, 24)]} />
        ) : (
          <ShellIcon name={value} />
        )}
      </NavigationBarItem.Icon>
      <NavigationBarItem.Label>
        <Text>{label}</Text>
      </NavigationBarItem.Label>
    </NavigationBarItem>
  ))}
  // ...
</NavigationBar>
```

## Gotchas

- `react-native-screens` throws past 5 tabs on Android. Cause: `BottomNavigationView` holds at most 5 items. Fix: use an explicit More tab on both platforms; the system More tab would be iOS-only.
- Android shows only the selected tab's label once there are 4 or more items. Fix: `labelVisibilityMode="labeled"`.
- A SwiftUI badge change is not drawn until the next tab switch. Cause: the `TabView` observes only its own props. Fix: carry the badge in a `TabView` prop, as the `testID` above does.
- Android tints a tab image from `Trigger.Icon`. Cause: expo-router 58's `Icon` does not pass `tinting` through. Workaround: `unstable_nativeProps` with `tinting: 'original'`.
- A colour image is unavailable on @expo/ui's `TabView.Tab`. Cause: it accepts SF Symbols only. Workaround: a local module with `.alwaysOriginal` rendering, in a development build.
- On iPhone the iOS 26 floating tab bar covers a bottom toolbar. Fix: the `hidden` prop above; see the bottom toolbar pattern.
- `NativeTabs` tabs cannot change at runtime. Expo's [native tabs guide](https://docs.expo.dev/router/advanced/native-tabs/) says "Dynamically adding or removing tabs at runtime is not supported", and that doing so remounts the content and loses state. Dynamically hiding a tab also remounts the navigator and resets state, so change visibility only before the navigator mounts or while it is not visible. The prototype did not exercise this. The guide states it for `NativeTabs` only.

## Migration notes

- `createBottomTabNavigator` and `<Tab.Screen>` -> `NativeTabs` and `NativeTabs.Trigger`, with one folder per tab holding its own `Stack`.
- `tabBarBadge` -> `NativeTabs.Trigger.Badge`. `tabBarLabel` -> `NativeTabs.Trigger.Label`.
- `tabBarIcon` -> `NativeTabs.Trigger.Icon` with `sf` and `md`, or `src` for a full-colour image plus the Android workaround.
- More than 5 tabs -> move the rest behind an explicit More tab.
- Tabs built from runtime data -> no `NativeTabs` equivalent, per the runtime limit in Gotchas. Define a static list in the layout, or decide against `NativeTabs` before planning the move.
- `navigation.navigate('SomeTab')` -> `router.navigate('/some-tab')`, which the prototype did not exercise.
