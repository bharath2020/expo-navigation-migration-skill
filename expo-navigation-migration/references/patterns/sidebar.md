# Sidebar and top tab bar
One tab list that shows as a sidebar and top tab bar on iPad, a sidebar on an open iPhone Duo and a tab bar everywhere else, with collapsible sections available in the @expo/ui shell.

## Status
Versions: `expo` 58.0.19, `expo-router` 58.0.26, `react-native-screens` 4.30.0, `@expo/ui` 58.0.23. "verified" means exercised on a simulator or emulator; no physical hardware was used. iPhone Duo runs used the iOS 27.1 simulator with Xcode 27.1 Device Hub and a Release build.

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| iPad: sidebar expanded, collapses to top tab bar | verified: `sidebarAdaptable` | n/a: no navigation rail | verified: `tabViewStyle` modifier | n/a: no navigation rail |
| iPad: open in the sidebar by default | gap: iPadOS ignores placement | n/a | gap: iPadOS ignores placement | n/a |
| Open iPhone Duo, landscape: sidebar plus content | verified: `preferredPlacement` | n/a | partial: verified, needs local module | n/a |
| Open iPhone Duo, portrait: sidebar behind navbar button | verified: opens over content | n/a | verified: tabs flat, see Gotchas | n/a |
| Open iPhone Duo: floating top tab bar | gap: iPad idiom only | n/a | gap: iPad idiom only | n/a |
| Folded iPhone Duo: tab bar in the rail | verified | n/a | verified: tabs flat | n/a |
| Standard iPhone: bottom tab bar, unchanged | verified | n/a | verified: tabs flat | n/a |
| Collapsible sidebar sections | gap: flat triggers only | n/a | partial: verified, needs local module | n/a |
| Sections on the iPad top tab bar | n/a: no sections | n/a | partial: `tab-sections` template, one item per section | n/a |
| Wide Android window (tablet, unfolded foldable) | n/a | gap: bottom bar only | n/a | gap: no `NavigationRail`, `TabRow` |
| Colored tab icon in the sidebar | verified: iPad | n/a | verified: iPhone Duo | n/a |

## Options
| Option | Device | What you get | Cost |
| --- | --- | --- | --- |
| `NativeTabs` `sidebarAdaptable` | iPad | Top tab bar with a sidebar button; the same tabs expand into a sidebar. No effect on iPhone or Android | One prop |
| `NativeTabs` `preferredPlacement="sidebar"` | Open iPhone Duo | Sidebar on the open display. Folded Duo and other iPhones keep the tab bar. iPadOS ignores it | One prop |
| `tabViewStyle({ type: 'sidebarAdaptable' })` | iPad | The same UIKit sidebar and top tab bar, in a SwiftUI `TabView` | One @expo/ui modifier |
| `defaultTabBarPlacement('sidebar')` from `templates/modules/tab-bar-placement/` | Open iPhone Duo | SwiftUI's counterpart of `preferredPlacement` (iOS 27) | Local module and a development build |
| `SectionedTabView` from `templates/modules/tab-sections/` | iPad, open iPhone Duo in landscape | Sidebar headings that collapse and expand; tabs flat in a tab bar | Local module and a development build |
| `.defaultVisibility(.hidden, for: .tabBar)` in a local module | iPad | Sections stay out of the top bar. `not exercised`: see Sections outside the top bar | Local module and a development build |
| Patch `RNSTabBarController` to use `UITabGroup` | iPad, iPhone Duo | Sections in the React Navigation shell | Patching react-native-screens' native code. Not built |
| Bottom bar | Android, any width | `BottomNavigationView` or `NavigationBar`. Neither framework offers a rail or top tabs here | None |

Pick React Navigation unless the user needs collapsible sidebar sections. Sections are the one sidebar feature only the @expo/ui shell has.

## React Navigation (Expo Router + react-native-screens)
iPad: the tabs render as the floating tab bar at the top, with a sidebar button at its leading edge. The button expands the same tabs into a sidebar (icons, titles and badges carry over) and collapses it back. In portrait the sidebar overlays the content; in landscape it opens beside it. No per-screen code is needed.

iPhone Duo: on a phone the sidebar and the tab bar exclude each other, and iOS 27 shows the tab bar (the rail) unless asked otherwise. UIKit offers the sidebar only in a regular-width window, which on the Duo is the open display. `preferredPlacement` asks for the sidebar there.

Android: `NativeTabs` stays a Material bottom bar at every width because it has no navigation rail, so neither prop changes anything there.

From the prototype: `src/app/(tabs)/_layout.tsx`
```tsx
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
      // ...
```

Sections: not available. `NativeTabs` takes a flat list of triggers, and `RNSTabBarController` in react-native-screens 4.30 makes one `UITab` per screen and never a `UITabGroup`, UIKit's sidebar section. There is also no `.sidebarOnly` placement, so the sidebar lists the same tabs as the top bar. Rows that exist only in the sidebar need a native module: see Sections outside the top bar.

Safe area: the open sidebar is a leading safe-area inset. Native headers and scroll views follow it. A custom horizontal layout must follow it too, with `SafeAreaView` from `react-native-screens/experimental`. See `references/patterns/dual-screen.md` for the code and the double-inset bug.

## @expo/ui
### iOS (SwiftUI)
Both shells draw the same UIKit sidebar and top tab bar. The prototype's shell uses two local modules. Copy each folder to `modules/`, then run `expo prebuild` and pod install and rebuild. The shell imports them by relative path; they are not listed in `package.json`.

**Placement.** @expo/ui 58.0.23 and 58.0.25 do not ship `defaultTabBarPlacement`. `templates/modules/tab-bar-placement/` registers it through @expo/ui's public `ViewModifierRegistry`. It has no effect before iOS 27 or on iPadOS.

From the prototype: `modules/tab-bar-placement/ios/TabBarPlacementModule.swift`
```swift
OnCreate {
  ViewModifierRegistry.register("defaultTabBarPlacement") { params, _, _ in
    DefaultTabBarPlacementModifier(placement: params["placement"] as? String)
  }
}
// ...
func body(content: Content) -> some View {
  if #available(iOS 27.0, *) {
    content.defaultTabBarPlacement(adaptablePlacement)
  } else {
    content
  }
}
```

From the prototype: `modules/tab-bar-placement/index.ts`
```ts
// Loads the native module, whose `OnCreate` registers the modifier before a `TabView` uses it.
requireOptionalNativeModule('TabBarPlacement');
// ...
export const defaultTabBarPlacement = (placement: 'automatic' | 'sidebar' | 'tabBar') =>
  createModifier('defaultTabBarPlacement', { placement });
```

**Sections.** SwiftUI groups tabs with `TabSection` (iOS 18). @expo/ui 58's `TabView` builds only from `TabView.Tab` children, so `templates/modules/tab-sections/` wraps SwiftUI's `TabView` in a local view. That view is an @expo/ui view (`ExpoUIView`), so @expo/ui modifiers such as `tabViewStyle` still apply. Place it in a `Host`. This template needs every tab to sit in a section; that limit is the template's, not one of sections in general. In a sidebar each heading collapses and expands its tabs; in a tab bar the tabs show flat.

The groups are one list in the shell model. This list has two sections, Navigation and Toolbars:

From the prototype: `src/expo-ui/model.ts`
```ts
export const shellSections: readonly { title: string; tabs: readonly ShellTab[] }[] = [
  { title: 'Navigation', tabs: ['stack', 'present'] },
  { title: 'Toolbars', tabs: ['navbar'] },
];
```

The shell renders them with both modules:

From the prototype: `src/expo-ui/shell.ios.tsx`
```tsx
import { Host } from '@expo/ui/swift-ui';
import { tabViewStyle } from '@expo/ui/swift-ui/modifiers';
// ...
import { defaultTabBarPlacement } from '../../modules/tab-bar-placement';
import { SectionedTabView } from '../../modules/tab-sections';
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

The module turns each section into a `TabSection` of `Tab`s, and drops the sections on an upright phone (see Gotchas):

From the prototype: `modules/tab-sections/ios/TabSectionsModule.swift`
```swift
if isPhonePortrait {
  SwiftUI.TabView(selection: selection) {
    ForEach(sections.flatMap(Self.tabs(in:)), id: \.props.value) { tab in
      Self.tab(tab)
    }
  }
} else {
  SwiftUI.TabView(selection: selection) {
    ForEach(sections, id: \.props.title) { section in
      TabSection(section.props.title) {
        ForEach(Self.tabs(in: section), id: \.props.value) { tab in
          Self.tab(tab)
        }
      }
    }
  }
}
// ...
.onGeometryChange(for: Bool.self) { proxy in
  proxy.size.height > proxy.size.width
} action: { portrait in
  isPhonePortrait = portrait && UIDevice.current.userInterfaceIdiom == .phone
}
```

Before iOS 18 the module draws a plain tab bar with every tab. A tab's `image` (a URL, with its `imageScale`) replaces `systemImage` with a full-color picture that the tab bar and the sidebar do not tint.

**Sections outside the top bar.** Status: `not exercised` on SDK 58 in this catalog's prototype, and `tab-sections` does not use it. SwiftUI's [`.defaultVisibility(.hidden, for: .tabBar)`](https://developer.apple.com/documentation/swiftui/tabcontent/defaultvisibility(_:for:)) keeps a section out of the iPad top bar. The public sibling skill [expo-ipad-navigation-skill](https://github.com/bharath2020/expo-ipad-navigation-skill), written for SDK 57, uses it in `expo-ipad-navigation/templates/modules/sidebar-tabs/ios/SidebarTabsModule.swift`, on each `TabSection` and on each of its tabs. Flat main tabs stay in both the bar and the sidebar, and section tabs appear only in the sidebar. Apple's page says the modifier needs iOS 18, sets a default in customizable contexts, and has no effect on other platforms or on a `TabView` style without customization. It also says to attach a `TabViewCustomization` to enable customization; the sibling's module attaches none.

Safe area: SwiftUI applies the sidebar and rail insets itself.

### Android (Compose)
No sidebar and no sections. @expo/ui 58 ships `NavigationBar` but no `NavigationRail` or `TabRow`, so the shell keeps a bottom bar at every width.

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
      // ...
```

## Gotchas
- **Back button, bar buttons and sidebar button do nothing on an open, upright iPhone Duo (@expo/ui shell with sections).** The list below still works. Cause: in a portrait window on the phone idiom, iOS 27.1 puts the navigation bar inside the top safe-area inset, beside the sidebar button. SwiftUI hosts a `TabSection`'s tabs in one more hosting view, and that view takes every touch in the inset as its own. A flat list of tabs has no such view. Fix: `SectionedTabView` drops the sections while a phone is portrait and brings them back in landscape, already in the template. Pushed screens and the selected tab survive the switch. The React Navigation shell and the iPad are not affected.
- **Regression check for that bug.** With the Duo open and upright (window 669 × 951 pt), hit-test points in the navigation bar from lldb with `hitTest:withEvent:`. The bug is present when the innermost view at a point is a hosting view whose class name includes `TabItem` and `RootView`. Passing means each point lands on a bar button.
- **Rail on the open Duo instead of a sidebar.** Both shells showed it before the placement was set. It is the iOS default on a phone. Set `preferredPlacement` or `defaultTabBarPlacement`.
- **No top tab bar on the Duo.** With the sidebar hidden, a phone shows a sidebar button in the navbar and nothing else. UIKit draws the top tab bar only for the iPad idiom. Setting `traitOverrides.userInterfaceIdiom = .pad` on the tab bar controller, in a throwaway test, did not bring it. Design for the sidebar button.
- **The iPad cannot be told to open in the sidebar.** `preferredPlacement` has no effect where both placements exist (iPadOS), and the app opens in the top tab bar. Older notes name `tabBarSidebarPreferredPlacement` through `unstable_nativeProps`; `preferredPlacement` is what the prototype uses and it writes that same option.
- **Tabs in a section become unreachable from the iPad top bar (`tab-sections` template).** With the sidebar hidden, the top bar shows one item per section (Navigation, Toolbars), not the three tabs. Choosing Navigation opens its first tab, Stack. Present can then be reached only through the sidebar. If every tab must be one tap away in the top bar, keep the tabs flat. This limit is the template's, not one of sections in general: see Sections outside the top bar.
- **Upright Duo shows no headings.** This is the workaround above, not a rendering failure. Folded Duos and iPhones also show the tabs flat.
- **Badge change not drawn until the next tab switch.** `SectionedTabView` reads each tab's `badge` in its own body but only observes its own props. Carry the badge in a `SectionedTabView` prop, as `testID` does in the shell above.
- **`SectionedTabView` `modifiers`.** Pass modifiers without event listeners, such as `tabViewStyle`.
- **Sidebar shows fewer rows than expected.** Rows come only from the tab list. In the prototype React Navigation lists 5 tabs, @expo/ui lists 3, and More's sections are not sidebar rows; they are reached through More.
- **First builds of both modules failed.** `xcodebuild` exited 65 until the Swift was fixed, with an availability fix for `tab-bar-placement`. The templates carry the fixes. Keep the `#available` guards when editing them.
- **Custom pane row under the sidebar.** See the double-inset bug in `references/patterns/dual-screen.md`.
- **Sidebar built from runtime data.** `NativeTabs` does not support adding or removing tabs at runtime, per Expo's docs, and the sidebar lists the same tabs. See Gotchas in [tabs.md](tabs.md). The prototype did not exercise it.

## Migration notes
- JS drawer or custom sidebar: replace with `NativeTabs` `sidebarAdaptable`. iOS then moves the tabs between sidebar, top bar and rail.
- Custom tab bar or JS header: Expo's iPhone Duo guide advises against them, since JS bars do not follow the rail. Move to `NativeTabs` and `Stack`.
- Custom native sidebar with groups: use `SectionedTabView` if the shell can be @expo/ui on iOS. Otherwise flatten the groups or keep a native module, since `NativeTabs` has no sections.
- Existing sectioned module: compare before replacing it. It may do what `SectionedTabView` does not, such as flat tabs beside sections, or sections kept out of the top bar.
- Sidebar tabs built from runtime data: `NativeTabs` does not support this, per Expo's docs. With no sidebar-only rows either, this decides whether `NativeTabs` fits. See Gotchas in [tabs.md](tabs.md).
- Android rail or drawer in a legacy tablet layout: neither shell has a replacement. Design those windows around the bottom bar, or keep native code for the rail.
- Screens that assume the leading edge is x = 0: wrap custom rows in the native-aware `SafeAreaView`.
