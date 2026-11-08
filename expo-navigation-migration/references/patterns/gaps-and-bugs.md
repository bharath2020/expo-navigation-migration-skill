# Gaps and bugs

The single list of verified gaps, documented limits and known bugs, grouped by platform, with cause, fix and status.

Status is `fixed` (code changed, problem gone), `workaround` (code avoids the limit, limit remains), `accepted gap` (the app lives with it) or `not exercised` (stated by docs, no run recorded). "RN" is the React Navigation shell (Expo Router + react-native-screens). "Compose" and "SwiftUI" are the @expo/ui shell. Apart from `not exercised` rows, everything here came from simulators and emulators; see [verification.md](verification.md).

## iOS: iPhone and iPad

| Symptom | Shell | Cause | Fix or workaround | Status |
| --- | --- | --- | --- | --- |
| Floating tab bar covers a bottom toolbar on iPhone | RN | iOS 26+ draws the floating tab bar over the stack's bottom `UIToolbar`. Also happens in plain SwiftUI (Apple FB20447249; Apple forums 802558, 790916) | Hide the tab bar while the toolbar shows (`NativeTabs hidden`). iPad is fine | workaround |
| Same overlap, no fix available | SwiftUI | `.toolbarVisibility(.hidden, for: .tabBar)` is not exposed in @expo/ui 58.0.23 | None. Bottom toolbar works on iPad only | accepted gap |
| No full-screen cover | SwiftUI | @expo/ui has no `fullScreenCover` | Use an Expo Router `fullScreenModal` route | workaround |
| System back button and swipe always pop, even with unsaved changes | SwiftUI | No `navigationBarBackButtonHidden` or custom back button | Only pops the screen starts itself can confirm. Sheets can block swipe-down with `interactiveDismissDisabled` | accepted gap |
| `ToolbarItem`s with the same placement show in reverse order | SwiftUI | @expo/ui layers every `ToolbarItem` as its own `.toolbar` | Declare them last to first | workaround |
| Tab badge draws only on the next tab switch | SwiftUI | `TabView` reads each tab's badge in its own body but observes only its own props | Carry the badge in a `TabView` prop to force a redraw | workaround |
| No `defaultTabBarPlacement` | SwiftUI | Not in @expo/ui | Local module `modules/tab-bar-placement`; needs a development build | workaround |
| No `TabSection` on `TabView` | SwiftUI | Not in @expo/ui | Local module `modules/tab-sections` wraps SwiftUI's `TabView` in a local view; needs a development build. With this template every tab must sit in a section and the iPad top tab bar shows each section as one item. Those limits are the template's, not ones of sections in general: see [sidebar.md](sidebar.md) | workaround |
| No sidebar sections | RN | react-native-screens 4.30 builds only `UITab`s, never a `UITabGroup`, and has no `.sidebarOnly` placement. The sidebar lists the same 5 tabs as the top bar | Reach sections through More. Sidebar-only sections need a native module (an earlier prototype used a custom Swift one) | accepted gap |
| The iPad cannot be told to open in the sidebar | RN | `preferredPlacement` has no effect where both placements exist (iPadOS). The API doc names the option `tabBarSidebarPreferredPlacement`, through `unstable_nativeProps`, iOS 27+; expo-router 58.0.26 writes that option from the `preferredPlacement` prop | None. The app opens in the top tab bar | accepted gap |
| Custom row layouts run under an open iPad sidebar | RN | The open sidebar is a leading safe-area inset | `SafeAreaView` from `react-native-screens/experimental` | workaround |
| iPad form sheet keeps page-sheet sizing | RN | Presentation is fixed by first mount. The `?style=` param never reached root stack options on either platform, and a modal first mounted as `modal` then switched kept page-sheet sizing | Root reads `?style=` with `useGlobalSearchParams`; the modal layout pins it with `setOptions` | fixed |
| Detents do nothing on iPad form sheets | RN | Form sheets are centred cards in regular width | None. Detents apply on iPhone and Android | accepted gap |
| Long-press back menu skips the guard; React Navigation logs an error when dirty at depth 2 or more | RN | `headerBackButtonMenuEnabled` bypasses `usePreventRemove` | Turn `headerBackButtonMenuEnabled` off while dirty | fixed |
| `<Stack.Title large>` toggle has no effect | RN | It writes the deprecated `headerLargeTitle`, which loses to `headerLargeTitleEnabled` from `screenOptions` | Set `headerLargeTitleEnabled` through `Stack.Screen` options | workaround |
| Turning the large title back on stays collapsed until pull-down | SwiftUI | Normal UIKit behaviour per the verification notes | None needed | accepted gap |
| `Stack.Toolbar.Button` has no `testID`, and iOS nav bar items are not in the accessibility tree simulator tools read | RN | Not in the API | Target `accessibilityLabel` | workaround |
| Inline title hides when the nav bar is crowded with buttons | RN, SwiftUI | iOS behaviour | None | accepted gap |
| Hiding the nav bar jumps the `List` by the bar's height in one frame | SwiftUI | @expo/ui has no toolbar visibility modifier, and SwiftUI's `toolbarVisibility(.hidden, for: .navigationBar)` applies the new safe area outside the bar's animation | Local module `modules/swiftui-navigation-bar` drives the `UINavigationController` inside a UIKit animation. See [hide-navbar.md](hide-navbar.md) | fixed |
| No swipe-back while the nav bar is hidden | SwiftUI | UIKit's delegate for the swipe-back recognizers refuses touches while the bar is hidden | The same module takes over the delegate while hidden, with react-native-screens' rules. Re-checked on iPhone only | fixed |
| The nav bar does not hide | RN | A `Stack.Toolbar` forces `headerShown: true` over the screen's options | Declare header items only while the bar shows | workaround |
| With the nav bar hidden, the iPad top tab bar covers the first rows | RN, SwiftUI | The top tab bar is not part of the navigation bar | None | accepted gap |
| A sheet sometimes does not open when tapped right after another sheet closes | shell not named in the source | Unknown | None recorded | accepted gap |

## iOS: iPhone Duo

| Symptom | Shell | Cause | Fix or workaround | Status |
| --- | --- | --- | --- | --- |
| Open Duo never shows the iPad-style floating top tab bar | RN, SwiftUI | On the phone idiom the sidebar and the tab bar exclude each other | Shows the sidebar or a sidebar button | accepted gap |
| Back, bar buttons and the sidebar button do nothing on an upright open Duo (iOS 27.1) | SwiftUI | `TabSection`'s extra hosting view takes touches in the top inset, where the bar sits | The module shows tabs flat on a phone in portrait | workaround |
| Expanded sidebar's 280 pt applied twice, list pane drew no rows. Also affects an iPad before iOS 27.1 with the sidebar expanded | RN | `SafeAreaView` from react-native-screens reads the screen's insets whatever its position, and the flex split already applied them | List pane passes `sideInsets={false}` to `ListScreen` | fixed |
| Full-width lists (Stack, Present) scroll across the fold when partially open | RN | Unknown | None. Panes and bottom sheets do avoid the fold | accepted gap |
| Folded, Panes shows the list without the selected detail pushed. Tab, screen and selected item survive | RN | Unknown | None | accepted gap |
| API doc records no fold control in the Xcode 27.1 simulator (no Simulator app; DeviceHub, `simctl` and AXe expose none) and only the folded state verified | RN | Tooling at that pass | The later comparison pass records open and partially open checks through Device Hub. See [verification.md](verification.md) | workaround |

## iOS: toolchain

| Symptom | Shell | Cause | Fix or workaround | Status |
| --- | --- | --- | --- | --- |
| iOS 27.1 runtime supports only iPhone Duo | both | Runtime's device list | iPhone 17 Pro and iPad ran on another runtime with the same Xcode 27.1 build. See [verification.md](verification.md) | accepted gap |
| No headless rotation, so the first delivery's iPad landscape screenshot was not re-taken | both | Xcode 27.1 tooling | None | accepted gap |
| Simulator automation tools break | both | Xcode 27 removed the standalone Simulator app and moved `SimulatorKit.framework` to `Contents/SharedFrameworks` | AXe 1.8.0 is the first release that supports Xcode 27 (Homebrew AXe 1.7.0 fails). `idb` and earlier `axe` taps do not work, so Maestro drove the comparison runs | workaround |

## Android: phone

| Symptom | Shell | Cause | Fix or workaround | Status |
| --- | --- | --- | --- | --- |
| No large title | RN, Compose | RN: `headerLargeTitleEnabled` is ignored, `setLargeTitle` is a no-op in react-native-screens on Android, and only the Material 3 small top app bar is drawn. Compose: `TopAppBar` has no medium, large or collapsing variant | Toggle hidden on Android | accepted gap |
| Page and form sheets have no sheet form with a header | RN | `formSheet` is a Material bottom sheet with no native header and no nested stack. `pageSheet` falls back inside react-native-screens | `modalOptions` presents both as `modal`. For a bottom sheet, put title and actions in content | workaround |
| `modal` and `fullScreenModal` look the same | RN | Both are full screen | None | accepted gap |
| No grabber on the bottom sheet | RN | Not drawn; the sheet is dragged by its body | None | accepted gap |
| Bottom sheet was opened at 30% and closed with back; drag between detents not driven on the Pixel 8 | RN | adb automation limit | Drag from the 30% detent to full height was exercised later on the Surface Duo emulator | accepted gap |
| Max 5 tab items; react-native-screens throws past that | RN | `BottomNavigationView` limit | Explicit More tab on every platform | workaround |
| Only the selected tab's label shows at 4+ items | RN | Default label mode | `labelVisibilityMode="labeled"` | workaround |
| Header buttons are icon-only; text-only buttons render nothing, text labels are dropped, SF Symbols render nothing | RN, Compose | Compose `IconButton`s take image sources | `useToolbarIcons`; mount the toolbar once `ready` | workaround |
| A `Stack.Toolbar` that first mounts empty and later gets a single button did not show it (seen on the Panes screen) | RN | Unknown | Render the whole `<Stack.Toolbar>` behind `ready`. Adding and removing buttons in a toolbar already showing items works | workaround |
| `star`, `star_border` and `star_outline` are the same glyph, so no filled star | RN, Compose | Material Symbols are rendered from the outlined font | RN: `star_shine` plus `tintColor`. Compose: tint `#F9A825` | workaround |
| No stack, NavHost, BackHandler or push animation | Compose | Not in @expo/ui | Route stack in React state; back through React Native's `BackHandler`. No transition is possible | accepted gap |
| No full-screen dialog | Compose | Not in @expo/ui | Full-height `ModalBottomSheet` is the closest | accepted gap |
| No cascading submenus | Compose | `DropdownMenu` has none | A submenu replaces the list in place, with a back entry | workaround |
| Modal-sheet back dismisses the whole sheet instead of popping the step pushed inside | Compose | A `ModalBottomSheet` is its own window | With unsaved changes, back, scrim and swipe are off and Close asks first | workaround |
| Sheet does not stop half way | Compose | `ModalBottomSheet` stops half way only when content is taller than half the screen | Sheets made full height | workaround |
| `TopAppBar.NavigationIcon` and `DropdownMenuItem.TrailingIcon` added after first render never show | Compose | Slots added after first render are not picked up | Keep the slot mounted and toggle its content | workaround |
| Checkbox-style menu items (the source records only the fix) | Compose | Unknown | Trailing checkmark | fixed |
| Bottom `Stack.Toolbar` inside a `ScrollView` drew behind rows | RN | Toolbar was inside the list | Render it outside the scroll view | fixed |
| Keyboard covers a focused Compose text field | RN + Compose body | Screen neither resizes nor scrolls the field into view | None. See [mixed-content.md](mixed-content.md) | accepted gap |
| `headerShown: false` jumps the content instead of sliding the bar | RN | It removes the toolbar and lays the screen out again in one frame; no option collapses the app bar | Local module `modules/app-bar-visibility` collapses the `AppBarLayout` with `setExpanded`. See [hide-navbar.md](hide-navbar.md) | workaround |
| No scroll events from `LazyColumn`, and `TopAppBar` takes no `scrollBehavior` | Compose | @expo/ui registers `LazyColumn` without view events | The same module's `nestedScrollOffset` modifier on a parent `Box`; the whole bar hides and shows rather than following the finger | workaround |
| Predictive back is off | RN, Compose | `android.predictiveBackGestureEnabled: false` in `app.json`; interaction with `usePreventRemove` not verified | Leave it off until verified | accepted gap |

## Android: foldable, tablet and Surface Duo

| Symptom | Shell | Cause | Fix or workaround | Status |
| --- | --- | --- | --- | --- |
| No navigation rail or top tabs on tablets or unfolded foldables | RN, Compose | `NativeTabs` stays a bottom bar; Compose has `NavigationBar` only | None | accepted gap |
| No hinge or fold geometry at runtime | RN | React Native and Expo SDK 58 expose none. Hinge bounds or posture (tabletop) need Jetpack WindowManager through a native module. npm wrappers (for example `expo-foldables`) were weeks old with a single maintainer and were not adopted | `useHinge` derives the Surface Duo and Duo 2 hinges from published geometry. Symmetric foldables split at the window centre. A new dual-screen device needs a row in `dualScreenDevices` | workaround |
| With 5 tabs, the middle item (Navbar) sits under the hinge when spanned; its icon and most of its label are hidden but it stays selectable from its visible edges | RN | The Material bar centres items as a group. react-native-screens exposes no item gravity or insets, and hiding a trigger remounts the navigator and resets state | An even number of bar items would put the hinge between two. A bar on one screen (Microsoft's `SurfaceDuoBottomNavigationView`) needs native code | accepted gap |
| Top app bar, full-screen modal and bottom sheet span both screens; title stays left, trailing header buttons right | RN | Unknown | Content keeps to the first screen (`ListScreen`, `sheet.tsx`) | workaround |
| Rotated, scrolling content passes under the hinge | RN | Hinge runs across the window | One pane rather than two | accepted gap |
| Surface Duo emulator is frozen at Android 12L (API 32) from 2022, and spanning is a drag gesture rather than an adb command | RN | Microsoft no longer updates it | The app's `minSdkVersion` allows API 32 | accepted gap |

## Both platforms

| Symptom | Shell | Cause | Fix or workaround | Status |
| --- | --- | --- | --- | --- |
| URLs, deep links and typed routes do not exist for @expo/ui screens | SwiftUI, Compose | State-only navigation | Present the flow as one Expo Router route | accepted gap |
| Renaming while scrolled jumps a native list to the top and expands the large title (seen on iPhone Duo) | RN + SwiftUI body | Unknown | None. See [mixed-content.md](mixed-content.md) | accepted gap |
| Adding or removing `NativeTabs` tabs at runtime is not supported, and doing so loses state. From Expo's docs; the prototype did not exercise it | RN | Listed under known limitations in the [native tabs guide](https://docs.expo.dev/router/advanced/native-tabs/) | Define tabs statically in the layout. See [tabs.md](tabs.md) | not exercised |
