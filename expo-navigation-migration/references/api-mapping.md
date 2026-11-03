# SDK hops and API mapping

Checked 2026-11-02 against Expo's docs and the SDK 58 packages. Docs named here: [upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [React Navigation to Expo Router](https://docs.expo.dev/router/migrate/from-react-navigation/), [Router SDK 55 to 56](https://docs.expo.dev/router/migrate/sdk-55-to-56/), [Router SDK 57 to 58](https://docs.expo.dev/router/migrate/sdk-57-to-58/), [SDK 58 changelog](https://expo.dev/changelog/sdk-58), [iOS scene life cycle](https://expo.fyi/ios-scene-lifecycle). Read the guide for each hop the repository takes: they carry more than this page.

## SDK 58 baseline

React Native 0.88, React 19.3.0, Node 22.13, iOS 16.4+, Android 7+, Xcode 26.4+, `compileSdkVersion` 37, `targetSdkVersion` 36. New Architecture only. Xcode 27 is needed for Device Hub. macOS is not supported yet. The prototype ran `expo` 58.0.19, `expo-router` 58.0.26 and `@expo/ui` 58.0.23; the docs now recommend slightly later patch versions.

## SDK hops

Expo recommends "upgrading SDK versions incrementally, one at a time". Each hop is its own shippable release on the old navigation.

| From | Stop for |
| --- | --- |
| No `expo` yet | Adopt Expo first: step A of [the ladder](migration-planning.md#the-ladder). Then hop from the SDK it installs. |
| 54 or earlier | Move to the New Architecture before SDK 55. |
| 55 to 56 | `expo-router` drops `@react-navigation/*`. Imports move, with a codemod: `npx expo-codemod sdk-56-expo-router-react-navigation-replace src`. |
| 56 | Known Hermes memory regression. Expo recommends moving on to 57, so do not park here. |
| 56 to 57 | No Router guide is listed. |
| 57 to 58 | Router breaking changes below. React Native removals below. iOS scene life cycle below. |

Each hop: `npm install expo@^<N>.0.0`, `npx expo install --fix`, `npx expo-doctor`. With generated native projects, delete `ios` and `android`. Otherwise run `npx pod-install` and follow the [bare upgrade guide](https://docs.expo.dev/bare/upgrade/). Then make a new development build.

## Import replacements inside an Expo Router app

From SDK 56, Router does not support importing `@react-navigation/*` in app code. The one stated exception is `NavigationContainer` from `@react-navigation/native` for an isolated embedded tree.

| Old | SDK 56+ |
| --- | --- |
| `@react-navigation/native`, `core`, `elements`, `routers` | `expo-router/react-navigation` |
| `@react-navigation/stack` | `expo-router/js-stack`, using the `Stack` layout rather than `createStackNavigator`, which SDK 58 removes from that entry |
| `@react-navigation/bottom-tabs` | `expo-router/js-tabs` |
| `@react-navigation/material-top-tabs` | `expo-router/js-top-tabs` |
| `@react-navigation/native-stack` | The `Stack` layout. `createNativeStackNavigator` from `expo-router/native-stack` remains available. |
| `@react-navigation/drawer` | The `Drawer` layout |
| `expo-router/unstable-native-tabs` | `expo-router/native-tabs` from SDK 58. The old path is deprecated and still ships. |

## Moving from code-defined React Navigation

The official guide assumes a full conversion. Its preparation steps can each ship alone, on old navigation:

- Split screens into individual files.
- Convert to TypeScript. Convert relative imports to aliases.
- Move away from `resetRoot`.
- Rename the initial route to `index`.
- Make params top-level `number`, `boolean` or `string` values.
- Stop returning `null` from the root while assets load.

| Old | Router |
| --- | --- |
| `navigation.navigate('Item', { id })`, `push` | `router.push({ pathname: '/item/[id]', params: { id } })` |
| `navigation.goBack()` | `router.back()` |
| `navigation.popToTop()` | `router.dismissAll()`: [patterns/stack.md](patterns/stack.md) |
| `navigation.replace` | `router.replace` |
| `route.params` | `useLocalSearchParams()` |
| `<Link to=...>` | `<Link href=...>` |
| Navigator with `Screen` children | A directory and a `_layout` file |
| Shared screens across navigators | Shared routes or re-exports |
| `linking` prop | Generated from files. Old URLs: see below. |
| `NavigationContainer` props | See the guide. Router owns the container. |
| Custom navigator | `createStandardRouterNavigator` or `integrateWithRouter`; `withLayoutContext` still works and is deprecated. |
| `beforeRemove` | `usePreventRemove`. `beforeRemove` is gone at SDK 58. |
| `headerRight` in `setOptions` | `Stack.Toolbar`: [patterns/navbar-buttons.md](patterns/navbar-buttons.md) |
| Nested `screen`, `params`, `initial` | Complete hrefs |
| `initialRouteName` | `unstable_settings.anchor`. The launch URL picks the launch screen. |

Android `Stack.Toolbar` requires `@expo/ui`, and Android `md` icons require `expo-symbols`. Both are optional peers from SDK 58.

No official guide exists for `react-native-navigation` or `react-router-native`, and none for a JS stack to native stack move beyond the two navigators' docs. Plans for these state that they are working from first principles.

## Old URLs

| Tool | Use |
| --- | --- |
| `+native-intent` with `redirectSystemPath` | Primary native tool. Runs on cold start and while running. Native only, and has no app state such as auth. |
| `redirects` in the `expo-router` plugin | Arrays of static rules with `source` and `destination`. No page says they apply on native; the SDK 58 source does, which was read and not run. Prove it with a device run. |
| `<Redirect>` in a stub route file | One old path per file. Replaces the removed `redirect` prop on layout screens. |
| `usePathname` and `Redirect` in a layout | Rewrites that need app state |
| `+not-found` | Fallback only. Link home. |

`Stack.Protected` is access control and does not map URLs. Web needs a server or client redirect instead of `+native-intent`.

## Router 57 to 58 changes that catch apps

- Tabs, drawer and native tabs show only screens declared in the layout.
- `redirect` and `initialParams` are gone from layout `Screen`.
- `freezeOnBlur` has no effect. Use `activityEnabled`.
- Protected routes stay registered and render a redirect when the guard fails.
- `useNavigation` throws outside a navigator. `navigation.dispatch` is queued until after commit, and function dispatch is gone.
- Persisted state must be complete, including `routeKeySeq`.
- Removed from `expo-router/react-navigation`: `NavigationContainer`, `BaseNavigationContainer`, `NavigationIndependentTree`, the React Navigation `Link`, `useLinkProps`, `NavigatorScreenParams`, `getActionFromState`, `resetRoot`, `PreventRemoveContext`, static navigation APIs.
- iOS 26+ `Stack` headers default to transparent Liquid Glass, and content may need `contentInsetAdjustmentBehavior="automatic"`.
- `@testing-library/react-native` 14 or later is required, and `renderRouter` returns a promise.
- On web, `web.output: "server"` is the default when unset, and more: read the guide.

React Native removals that hit navigation code: `InteractionManager`, the Touchable root export, the Modal `animated` prop, and StatusBar `backgroundColor`, `translucent` and `networkActivityIndicatorVisible`. Deep imports from `react-native/Libraries/*` become type errors.

## iOS 57 to 58 changes that catch apps

- **Scene life cycle.** From the [SDK 58 changelog](https://expo.dev/changelog/sdk-58) and [Expo's guide](https://expo.fyi/ios-scene-lifecycle).
  - **Generated.** `npx expo prebuild` now generates `SceneDelegate.swift` and a `UIApplicationSceneManifest` entry in `Info.plist`. The scene delegate creates the `UIWindow`, not `didFinishLaunchingWithOptions`. With Continuous Native Generation and no committed `ios` directory, run `npx expo prebuild --clean` after upgrading.
  - **Breaks.** The iOS 27 SDK requires this life cycle. Apps built with Xcode 27 on the application-based life cycle "do not launch correctly on iOS 27". UIKit stops calling the `UIApplicationDelegate` methods for opening URLs, continuing user activity, active and background changes, and quick actions. A black screen on iOS 27 means the manifest or `SceneDelegate.swift` is missing, or `UISceneDelegateClassName` does not resolve.
  - **Custom scene delegates.** The guide's `SceneDelegate` subclasses `ExpoAppSceneDelegate`, which creates the window and starts React Native. `UISceneDelegateClassName` must resolve to that class, keeping the `$(PRODUCT_MODULE_NAME)` prefix. `ExpoAppSceneDelegate` is unavailable in app extensions and widget targets. For a hand-managed `ios` directory, diff against `npx expo prebuild --platform ios` run in a scratch copy.
  - **Plugins and native code.** `ExpoAppDelegate` overrides, which must keep calling `super`, and `ExpoAppDelegateSubscriber` implementations still get the events. Direct `UIApplicationDelegate` hooks and swizzles do not fire: move them to a scene delegate equivalent or a subscriber. Replace `UIScreen.main` and `UIApplication.shared.keyWindow` with the owning scene's geometry or `Utilities.keyWindow()`.
  - **Not covered by either page.** Multiple windows, and how a plugin's own scene manifest combines with the generated entry. The guide's sample manifest sets `UIApplicationSupportsMultipleScenes` to `false`. Compare the result against a freshly generated project.
  - **Staying on 57 with Xcode 27.** Set `ios.enableSceneSupport` in `expo-build-properties`, on `expo@57.0.23` or newer: the plugin throws on older patches. It generates no `SceneDelegate.swift` and points the manifest at `EXExpoAppSceneDelegate`. It will not overwrite a non-template `AppDelegate.swift` or an existing manifest, so apply those by hand. It is a no-op at 58, where prebuild warns that it can be removed.

## Status of the new APIs

| API | Status at SDK 58 |
| --- | --- |
| `NativeTabs` from `expo-router/native-tabs` | Stable |
| `Stack.Toolbar` | Stable per the SDK 58 changelog. The package's `@experimental` tag went away in 58.0.16. The Stack guide still labels composition components alpha, directly above a `Stack.Toolbar` sample. |
| `Stack.Title` | The Stack guide still says composition components are in alpha. Pin versions and re-test. |
| `@expo/ui` SwiftUI and Compose | Declared stable in the SDK 56 post. `Host` required. Included in Expo Go. Local modules still need a development build. |
| @expo/ui `NavigationStack`, `NavigationSplitView`, `TabView` | iOS and tvOS. |
| @expo/ui `NavigationStack`, `NavigationSplitView`, `Toolbar` | Documented from SDK 58: the [v57 SwiftUI index](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/) lists none of them. The changelog says @expo/ui "adds" `NavigationStack` and `Toolbar`, and that `NavigationSplitView` "adds two- and three-column layouts". Late SDK 57 patches already export them, undocumented: `NavigationStack` and `Toolbar` from 57.0.18, `NavigationSplitView` from [57.0.19](https://unpkg.com/@expo/ui@57.0.19/src/swift-ui/index.tsx). Check the lockfile version. |
| @expo/ui Compose navigation | `NavigationBar` and `TopAppBar` only. No stack, `NavHost`, rail or drawer. |
| Plain React Navigation | 7.x stable. 8.x pre-release. No page names SDK 58 compatibility. |
