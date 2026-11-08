# Verification

What ran, on which toolchain, with what result, and what never ran.

**No physical hardware was used.** Every result in this catalog came from a simulator or emulator.

"Comparison" and "API doc" below are the prototype's two reports, `NAVIGATION_COMPARISON.md` and `NAVIGATION_API.md`.

## Status vocabulary

| Word | Meaning |
| --- | --- |
| verified | Exercised on a simulator or emulator |
| partial | Works with a workaround or a reduced form, or only part was exercised |
| gap | The library has no way to do it |
| not exercised | No run is recorded. This says nothing about whether it works |
| n/a | Does not apply to that shell or platform |

## Toolchain

| Item | Version |
| --- | --- |
| `expo` | 58.0.19 |
| `expo-router` | 58.0.26 |
| `react-native-screens` | 4.30.0 |
| `@expo/ui` | 58.0.23 |
| `expo-hinge` | 58.0.2 |
| `expo-symbols` | ~58.0.4 |
| React Native | 0.88.0 |
| React | 19.3.0 |
| `react-native-gesture-handler` | ~3.3.0 |
| `react-native-reanimated` | 4.7.1 |
| `react-native-safe-area-context` | ~5.10.1 |
| TypeScript | ~6.0.3 |
| Xcode | 27.1 (27A9275) |
| iOS SDK | iPhone Simulator 27.1 (`DTSDKName iphonesimulator27.1`, `DTXcodeBuild 27A9275`) |
| Android emulator | 35.3.11 |

`expo-doctor` passed 20 of 20 on the follow-up pass. Nothing in the app needed to change for Xcode 27.

| Target | Details | Build |
| --- | --- | --- |
| iPhone 17 Pro simulator | Runtime disputed, see below | Debug against Metro |
| iPad Pro 13-inch (M5) simulator | Runtime disputed, see below | Debug against Metro |
| iPhone Duo simulator | iOS 27.1 (iPhone19,4), Xcode 27.1 Device Hub. Folded: 466 x 678 pt, right inset 84 pt | Release |
| Pixel 8 AVD | API 35 (Android 15) | Debug against Metro |
| Pixel 9 Pro Fold AVD | API 35. First delivery, plus a regression check after the hinge changes | Debug |
| Surface Duo emulator | Android 12L (API 32) arm64 image 2022.815.115 for Apple silicon, from the [Microsoft Download Center](https://www.microsoft.com/en-us/download/details.aspx?id=100847), 2784 x 1800 at 400 dpi | Debug |

The Pixel 8 and Pixel 9 Pro Fold runs in the API doc's screenshots come from the first delivery. That native build is unchanged apart from patch updates to `expo` (58.0.17 to 58.0.19), `expo-router` and `@expo/ui`.

The mixed-content screen's recorded iOS build script is Release arm64, unlike the comparison's stated debug build. See [mixed-content.md](mixed-content.md).

## iOS runtime: what the sources say

The sources conflict, and the conflict is only partly settled.

| Source | Statement |
| --- | --- |
| Feature-by-shell verification notes | iPhone 17 Pro iOS 27.1, iPad Pro 13-inch (M5) iOS 27.1 |
| `NAVIGATION_COMPARISON.md`, "Verified on" | iPhone 17 Pro and iPad Pro 13-inch (M5) simulators on iOS 27.1, iPhone Duo on iOS 27.1 |
| `NAVIGATION_COMPARISON.md`, section 15 | A standard iPhone check on iPhone 17 Pro, iOS 27.0 |
| `NAVIGATION_API.md`, "Toolchain and verification" | iOS 26.3 for iPhone 17 Pro and iPad Pro 13-inch (M5); iOS 27.1 for iPhone Duo, "the only device type that runtime supports" |
| Follow-up verification notes (written before the comparison) | iOS 27.1 runtime supports only iPhone Duo; iPhone 17 Pro and iPad Pro 13-inch (M5) verified on the iOS 26.3 runtime with the Xcode 27.1 build |
| Simulator inventory, read from `xcrun simctl` while writing this file | iOS 27.1 runtime lists one device type, iPhone Duo. iOS 27.0 and 26.3 both list iPhone 17 Pro and iPad Pro 13-inch (M5), and neither lists iPhone Duo. The API-doc pass's simulators sit on 26.3. The comparison's later iPhone and iPad simulators sit on 27.0 |
| Scripts behind the feature-by-shell runs | They name two simulator IDs that no longer exist. No text record gives their runtime |

Settled:

- iPhone Duo ran iOS 27.1. Every source agrees.
- The API doc's pass ran iPhone 17 Pro and iPad on iOS 26.3.
- The section 15 standard iPhone check ran iOS 27.0.

Unsettled:

- The runtime behind the feature-by-shell matrix below. Two sources state iOS 27.1 for iPhone 17 Pro and iPad, and the runtime's device list excludes both models. The list was already recorded as Duo-only before those statements. The deleted simulators' runtime is unrecorded. Run logs were not consulted.

Cite those results as "iPhone 17 Pro and iPad Pro 13-inch (M5) simulators, Xcode 27.1 build, runtime disputed".

## Drivers

| Source | Statement |
| --- | --- |
| Comparison, "Verified on" | iOS driven with Maestro, because `idb` and `axe` taps do not work under Xcode 27. Android driven with `adb` input |
| Comparison, "Testing" | Maestro flows on iPhone, iPad and Android drove the screenshots. iOS was driven with AXe and `simctl` |
| API doc | iOS screenshots driven with AXe 1.8.0, the first release that supports Xcode 27 |

The iOS helper scripts wrap Maestro, AXe and `simctl`, so each statement may describe a different pass.

## Feature-by-shell matrix

Rows are the comparison's difference table. Its legend maps as: native to `verified`, partial or workaround to `partial`, gap to `gap`, not applicable to `n/a`. Where the recorded runs support less than the comparison's mark, the cell takes the more cautious status and the notes say why.

| Feature | React Navigation iOS | React Navigation Android | @expo/ui iOS | @expo/ui Android |
| --- | --- | --- | --- | --- |
| Push / pop | verified: UINavigationController | verified: Fragment stack | verified: NavigationStack | partial: JS stack, no animation |
| Pop to root | verified: `dismissAll()` | verified: `dismissAll()` | verified: `setPath([])` | partial: JS stack |
| Back button + swipe | verified | verified | verified | partial: own back arrow |
| Android system back | n/a | verified: automatic | n/a | partial: `BackHandler` |
| Intercept back (unsaved) | verified: `usePreventRemove` | verified: `usePreventRemove` | gap: own buttons only | partial: in `BackHandler` |
| Block sheet dismissal | not exercised | not exercised | partial: `interactiveDismissDisabled`, swipe block unconfirmed | partial: sheet `properties`, back, scrim, swipe unconfirmed |
| Tabs + badge | verified | verified | partial: badge redraw workaround | verified: `BadgedBox` |
| Coloured tab icon | verified: `src` + `renderingMode="original"` | partial: `tinting: 'original'` via `unstable_nativeProps` | partial: local module; `TabView.Tab` takes symbols only | verified: untinted `Image` |
| iPad sidebar / top tabs | verified: `sidebarAdaptable` | n/a: no rail | verified: `tabViewStyle` | n/a: no rail |
| iPhone Duo sidebar (open) | verified: `preferredPlacement` | n/a | partial: local `defaultTabBarPlacement` modifier | n/a |
| Sidebar sections | gap: flat `NativeTabs` | n/a | partial: local `TabSection` module | n/a |
| Full-screen modal | verified | verified | gap: no `fullScreenCover` | gap: no full-screen dialog |
| Page / form sheet with navbar | verified | partial: full-screen modal | verified: `presentationSizing` | partial: full-height bottom sheet |
| Bottom sheet detents | verified: fractions | partial: fractions, see notes | verified: medium / large | partial: half / expanded |
| Buttons on entry | verified | verified: icon-only | verified | verified: icon-only |
| Update / badge / disable buttons | partial: icon and badge, disable on menu action only | partial: icon and badge, disable on menu action only | partial: icon and `disabled`, no bar-button badge | verified |
| Overflow menu: checkmark, section, destructive | verified | partial: section without title | verified | partial: dividers, no section title |
| Overflow submenu | verified | verified: cascading | verified | partial: replaces in place |
| Live title | verified | verified | verified | verified |
| Large title | verified: `headerLargeTitleEnabled` | gap | verified: display mode | gap: small app bar only |
| Bottom toolbar | verified: hide tab bar on iPhone | verified: floating toolbar | partial: iPad only | verified: floating toolbar |
| Hide navbar on tap and scroll | verified: `headerShown` | partial: local module, `AppBarLayout.setExpanded` | partial: local `navigationBarHidden` modifier drives UIKit | partial: `AnimatedVisibility` + local `nestedScrollOffset`, no `scrollBehavior` |
| URLs, deep links, typed routes | partial: see notes | not exercised: see notes | gap: state only | gap: state only |

One row from the verification notes is outside that table:

| Feature | React Navigation iOS | React Navigation Android | @expo/ui iOS | @expo/ui Android |
| --- | --- | --- | --- | --- |
| Switch shells | verified | verified | verified | verified: menu + back |

Notes on the matrix:

- **Bottom sheet detents, React Navigation Android.** The comparison marks it native. The verification notes mark it partial: on the Pixel 8 AVD the sheet opened at the 30% detent and closed with back, and `adb` did not drive a drag. The follow-up pass later dragged from 30% to full height on the Surface Duo emulator while spanned. No text record covers the 60% stop or a driven drag on a phone emulator, so it stays partial.
- **Block sheet dismissal, @expo/ui.** The comparison marks it native. The recorded captures show Close asking first on a dirty sheet. No text record shows a swipe, scrim tap or back press being blocked.
- **Update / badge / disable buttons.** The comparison marks all four native. The React Navigation runs record `disabled` on a menu action only, and the SwiftUI shell has no bar-button badge. See [navbar-buttons.md](navbar-buttons.md).
- **Overflow menu, @expo/ui Android.** The comparison marks it native. A section shows as dividers with no title, the same reduction marked partial for React Navigation Android.
- **URLs, deep links, typed routes, React Navigation.** The comparison marks it native on both platforms. The recorded runs are one iPad deep-link open and `typedRoutes` compile checks. No Android deep-link run is recorded.
- **Rows from the comparison only.** Block sheet dismissal, Coloured tab icon, iPhone Duo sidebar (open) and Sidebar sections have no row in the feature-by-shell notes. Their status rests on the comparison, reduced as noted above for Block sheet dismissal.
- **Hide navbar on tap and scroll.** From the comparison's section 16. Its iOS runs were on the iPhone 17 Pro and iPad Pro 13-inch (M5) simulators on the iOS 27.0 runtime, and Android on a Pixel emulator (API 35), both shells. @expo/ui swipe-back while hidden was re-checked after its fix on iPhone only. See [hide-navbar.md](hide-navbar.md).
- **Modal, React Navigation Android.** All presentation styles fall back to the full-screen modal with its own app bar and a push inside.
- **Back, @expo/ui Android.** `BackHandler` pops, shows the discard alert, moves another tab to the Stack tab, and leaves the shell from the root.
- **Back, React Navigation Android.** System back from a root tab exits the app.

## iPhone Duo checklist

Expo's guide, [Supporting iPhone Duo](https://expo.dev/blog/supporting-iphone-duo), item by item.

| Guide item | React Navigation shell | @expo/ui shell |
| --- | --- | --- |
| Native bars, not JS bars | verified: `Stack` and `NativeTabs` | verified: `NavigationStack` and `TabView` |
| Sidebar on the open display | verified: `preferredPlacement="sidebar"` | partial: verified, needs local `defaultTabBarPlacement('sidebar')` |
| Safe areas | verified: `SafeAreaView` left and right edges, no fixed tab bar heights | verified: SwiftUI applies them |
| Two panes: `ArrangementView` | verified on iOS 27.1+; flex split before 27.1 and on Android | not exercised: no two-pane screen |
| Hinge: `expo-hinge` | verified: `fullyOpen · 180°`, `partiallyOpen · 128°` | not exercised: not used |
| Expo Router `<SplitView>` | not exercised: experimental in SDK 58 | n/a |
| Rail detection, reserved regions | n/a: native bars and `ArrangementView` handle them | n/a |

| Check (React Navigation shell unless noted) | Result |
| --- | --- |
| Folded | verified, both shells: tab bar in the trailing rail, 84 pt right inset, rows clear of it |
| Open | verified, both shells: landscape shows sidebar plus content, Panes in two panes (safe area left 280, right 84). Portrait collapses the sidebar into a navbar button |
| Partially open | partial: Panes stacks around the fold and a bottom sheet opens below it. Full-width lists scroll across the fold |
| Split View | not exercised: no scripted way to put a second app beside this one in the simulator |
| Folding with a screen open | partial: tab, screen and selected item survive. Folded, Panes shows the list without the detail pushed |
| A standard iPhone | verified: iPhone 17 Pro, iOS 27.0, bottom tab bar in portrait and landscape |

The API doc, written at an earlier pass, says no fold control was available and only folded was verified. The checklist above is from the later comparison pass, driven through Device Hub. The scripts in the evidence take the unfolded state as a precondition rather than setting it, so no scripted fold control is recorded.

## Surface Duo checks

Spanned by a drag from the left screen's gesture bar onto the hinge. `useHinge` reported a vertical 34 x 720 dp hinge at (540, 0), and a horizontal 720 x 34 dp hinge at (0, 540) when rotated.

Exercised spanned: push (depth 2), modal with a push inside, sheet at 30% with a drag to full height, fit sheet, every tab, runtime navbar items, More and Layout info. Rotating moved the hinge across the window and the app switched to one pane. Unspanning returned to a single screen.

Pixel 9 Pro Fold regression check: dual panes still split at the fold, `Hinge: none`.

## Not tested

- Physical hardware of any kind: phones, tablets, foldables.
- A runtime switch of one route between two implementations, and coexistence with a legacy navigator. See [shell-coexistence.md](shell-coexistence.md).
- Android predictive back. It stays off (`predictiveBackGestureEnabled: false`), and its interaction with `usePreventRemove` was not verified.
- The iOS software keyboard over a SwiftUI text field. The simulators' hardware keyboard kept it hidden.
- Android deep links.
- Block sheet dismissal in the React Navigation shell, and any swipe, scrim tap or back press against a dirty @expo/ui sheet.
- The React Navigation Android sheet's 60% stop, and a driven drag between detents on a phone emulator.
- iPhone Duo Split View.
- Multiple windows and scene delegates. No run covers more than one window, a custom `ExpoAppSceneDelegate` subclass or a plugin that writes the scene manifest. See [api-mapping.md](../api-mapping.md).
- iPad landscape on the Xcode 27.1 build. There is no headless rotation, so the first delivery's screenshot was not re-taken.
- Android posture (tabletop) and live hinge bounds. The hinge values come from published geometry.
- A TalkBack or VoiceOver pass. `accessibilityLabel` was used as a test handle, with no screen reader result recorded.
- State restoration. The comparison credits the native containers with it, with no run recorded.
- Unit tests for the navigation helpers. The prototype has none.
- Hiding the navbar on iPhone Duo, in landscape, while rotating, inside a modal or sheet stack, or on Android tablets and foldables. See [hide-navbar.md](hide-navbar.md).
- The web fallback in `src/expo-ui/shell.tsx`.
