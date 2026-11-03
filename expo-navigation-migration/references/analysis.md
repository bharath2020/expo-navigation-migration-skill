# Repository analysis

Work out how the repository does navigation today, with evidence the reader can check. The plan is only as good as this report.

## Rules for findings

Every finding has three parts:

- **Value**: what is true.
- **Evidence**: `path:line`, or the command and its output. A manifest range is not an installed version: read the lockfile when a version matters.
- **Confidence**: `confirmed` (you read the code), `signal` (a text match you could not confirm), or `not found` (say what you searched).

Inventory signals are text matches. `TabView` can be a third-party component, `useNavigation` can be a local hook, `linking` can be an unrelated variable. Open the location before you state the finding.

Facts the repository cannot show (release cadence, store rollout habits, who owns the flag service) go in the report's open questions. Leave them unguessed.

## Dimensions

Cover all of them, in this order. In a monorepo, repeat 2 to 9 for each app the user wants migrated.

### 1. Repository shape
Package manager, workspaces, which packages are apps, shared navigation packages. Project rules in `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` that constrain a migration.

### 2. Versions
Resolved versions of `expo`, `react-native`, `react`, `expo-router`, `@react-navigation/*`, `react-native-screens`, `@expo/ui`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`. For SDK 54 or earlier, whether the New Architecture is on: it is mandatory from SDK 55. If an app has `react-native` and no `expo`, record that: its plan starts by adopting Expo.

### 3. Archetype
Assign one. It drives the seam and the target.

| Archetype | Signs |
| --- | --- |
| **R**: Expo Router | `main` is `expo-router/entry`, or an entry importing any `expo-router` path; `app/` or `src/app/` with `_layout` files |
| **N**: code-defined React Navigation | `NavigationContainer`, `create*Navigator`, no route directory |
| **U**: @expo/ui shell | SwiftUI `TabView`, `NavigationStack` or `NavigationSplitView` in a `Host`, from @expo/ui or a local module, or Compose `NavigationBar` and `TopAppBar`, holding app-level state instead of routes |
| **W**: `react-native-navigation` | `Navigation.registerComponent`, `Navigation.setRoot` |
| **X**: other | `react-router-native`, or hand-rolled state switching |
| **M**: mixed | More than one above. Name each part and which screens it owns. |

Several signs can fit: an app with `expo-router` and one `_layout` may still do all its real navigation in an @expo/ui shell mounted at one route. Count which code owns the screens, and classify by that. A second root outside Router, such as a per-window entry, does not make an app M: record it under dimension 6.

For **N**, or the N part of **M**, also record the starting point: JS or native stack, JS or native tabs, Expo or not, per navigator. The `react-navigation:bottom-tabs` signal covers JS and native tabs alike, so [existing-react-navigation.md](existing-react-navigation.md#find-the-starting-point) says what to read. The plan follows that scenario.

### 4. Route structure
The whole tree: navigators and nesting, or file routes and layouts. Screen count. Dynamic routes. Params: non-serializable values, nested `screen`, `params` and `initial`, which Router treats as ordinary params from SDK 58. Global navigation refs and calls from outside React.

### 5. Shells
Everything that frames screens: bottom tabs, native tabs, sidebar, sidebar sections, drawer, top tabs, split views, custom tab bars, JS-drawn headers. Which shell shows at which width or platform. Entry point and root providers. Whether the root returns `null` while loading, which Expo Router does not support.

### 6. Native code
`ios/` and `android/` committed, or generated. Local Expo modules and what each one does. Config plugins, including raw functions, which fingerprinting cannot hash. Patches touching navigation libraries. Native navigation in Swift or Kotlin: `UINavigationController`, `UITabBarController`, scene delegates, `NavHost`. A custom entry that branches per window or scene.

### 7. Deep links
Scheme, associated domains, intent filters. `linking` config, custom `getStateFromPath` or `getPathFromState`, which the official guide names as a poor fit for Expo Router. Links from push notifications and in-app handlers. Build a table of every URL shape the app accepts, with the code that handles it. If the app has no routes behind URLs, record that.

### 8. Platform targets
iOS, iPadOS and whether iPad gets its own layout, Android phones, tablets, foldables, dual-screen, web, tvOS, macOS. Minimum OS versions against SDK 58's iOS 16.4 and Android 7: with generated native projects and nothing declared, it is the SDK default, so say that, and list `#available` guards as hints. Compare `platforms` in local modules with what `app.json` claims. Web raises its own Router changes, and SDK 58 does not support macOS.

### 9. Behaviours that decide parity
Record each one in use with evidence. Each becomes a row in the plan's parity table.

Push and pop, pop to root, back interception (`usePreventRemove`, `beforeRemove`, `BackHandler`), modals, page and form sheets, bottom sheets and third-party sheets, buttons set from screens, overflow menus, live titles, large titles, bottom toolbars, tab badges, tab re-tap, search, state persistence, screen analytics, auth gating, splash handling, multiple windows.

### 10. Release and flag capability
Flag service and whether code reads it before the root mounts. A synchronous local store. Any network channel that could deliver a remote value. Crash reporter and analytics. `expo-updates`, runtime version policy, EAS profiles and channels. Internal distribution. CI gates.

### 11. Tests
E2E framework and what the flows cover. Unit tests that mock navigation. `testID` coverage of navigation controls. Which navigation scenarios have no coverage.

## Completion

The report is finished when:

- every dimension has a finding or a stated `not found`
- every inventory signal in `signals` and `nativeSignals` is confirmed or dismissed. A signal with `truncated` above zero: re-run with a higher `--max-locations`. You may confirm a repetitive signal from a representative sample, and say so
- the URL table lists every handler you found
- open questions name who can answer them
