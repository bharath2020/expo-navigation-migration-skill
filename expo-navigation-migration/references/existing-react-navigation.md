# Scenario: existing React Navigation app

For an app on `@react-navigation/*` that wants more native elements and a stable library for navigation and deep links: archetype **N**, or the N part of an **M** app. It adds a starting point, a stability order and a deep link track to the normal analysis and plan.

**Unproven.** No migration from an existing React Navigation app has been run. The prototype was built on Expo Router from the start, so it is evidence about the destination and says nothing about the journey. Write this label in the **Evidence** line of every step of a plan that uses this page, and give each step a check that can fail.

API facts checked on 2026-11-02 against Expo's and React Navigation's docs and the SDK 58 packages. `expo` 58.0.22 and `expo-router` 58.0.29 were the latest then, with no SDK 59 published.

## Destination

**Expo Router owns routes, URLs, tabs and stacks. react-native-screens provides the native controls. @expo/ui draws controls inside screens.** The reasons and the findings that change this are in [target-decision.md](target-decision.md).

```text
NativeTabs                  switches sections
  ├─ tab A: Stack           native stack, its own history
  │    └─ screen
  │         └─ <Host>       @expo/ui leaf controls
  └─ tab B: Stack
```

Native tabs and the native stack are different things, and neither replaces the other. Tabs switch sections, and each tab holds its own stack: in Router, a tab directory whose `_layout` returns `<Stack />`. Moving to native tabs keeps every stack, so plan the two moves separately.

## Find the starting point

Record these in the analysis report, with evidence. An app can differ per navigator, so record each one.

| Question | Read | Answer |
| --- | --- | --- |
| Stack | The navigator's import | `createStackNavigator` is the **JS stack**. `createNativeStackNavigator` is the **native stack**. |
| Tabs | The import and the resolved `@react-navigation/bottom-tabs` version. The name alone misleads. | `createBottomTabNavigator` on 7.x is **JS tabs**. The same name on 8.x is **native tabs** on iOS and Android, unless it passes `implementation: 'custom'`. `createNativeBottomTabNavigator` from `@react-navigation/bottom-tabs/unstable` is **native tabs**. From any other package it is a third-party library: name it. A custom `tabBar` is **JS tabs** with app-owned chrome. |
| Expo | `expo` in the lockfile; `ios/` and `android/` committed or generated | **On Expo**, or **not on Expo** |
| React Navigation major | Lockfile | 7.x is stable. 8.x is alpha: record it as a risk. |

What each answer changes:

| Start | Effect on the plan |
| --- | --- |
| JS stack | Keep step 4. Header options differ and no official mapping exists, so audit each one. |
| Native stack | Skip step 4. Its header options are the ones to port. |
| JS tabs | Carry them across step 6 on Router's JS tabs ([api-mapping.md](api-mapping.md#import-replacements-inside-an-expo-router-app)), so that step changes the owner and leaves the chrome alone. Step 7 then swaps them. |
| Custom tab bar | `NativeTabs` draws the system bar. Expo's native tabs page points to custom tabs for an app-drawn bar. This needs a parity decision before step 7. |
| Native tabs on plain React Navigation | Step 6 moves to `NativeTabs` directly and absorbs step 7. No official mapping exists between the two APIs, so audit each option. |
| On Expo | Start at step 1. |
| Not on Expo | Choose a [track](#not-on-expo). |

## What is settled and what moves

Stability is an input to the order. Use these three words in the plan.

| Word | Means |
| --- | --- |
| **settled** | The docs carry no warning, and it does not depend on one SDK's new surface. |
| **stable at 58** | Declared stable at SDK 58 or shortly before. Plan to use it only after the hop to 58. |
| **moving** | Labelled alpha, unstable, experimental or pre-release, changed in a recent hop, or undeclared. |

| Piece | Word | Source |
| --- | --- | --- |
| URL schemes, Universal Links, App Links | settled | [Expo's linking overview](https://docs.expo.dev/linking/overview/). Native handlers are the exception: see [the scene life cycle](api-mapping.md#ios-57-to-58-changes-that-catch-apps). |
| Your URL table and its tests | settled | Yours |
| Native stack, on plain React Navigation or Router | settled | [React Navigation's page](https://reactnavigation.org/docs/native-stack-navigator/) and `Stack` in Router. Appearance can still change per SDK. |
| Plain React Navigation 7.x and its `linking` config | settled | [Configuring links](https://reactnavigation.org/docs/configuring-links/). No page names SDK 58, and `expo/bundledNativeModules.json` pins no `@react-navigation/*` package. |
| Router file routes, hrefs and `<Redirect>` | settled | [Redirects](https://docs.expo.dev/router/reference/redirects/). `expo-router` and `react-native-screens` are pinned per SDK in `bundledNativeModules.json`. |
| `NativeTabs` from `expo-router/native-tabs` | stable at 58 | [SDK 58 changelog](https://expo.dev/changelog/sdk-58). Earlier SDKs use the `unstable-native-tabs` path. |
| `@expo/ui` leaf controls in `Host` | stable at 58 | Declared stable in the SDK 56 post. New parts arrive per SDK. See [status](api-mapping.md#status-of-the-new-apis). |
| `Stack.Toolbar` | moving | The [Stack guide](https://docs.expo.dev/router/advanced/stack/) still labels composition components alpha, so it stays moving until the guide drops the label. The [SDK 58 changelog](https://expo.dev/changelog/sdk-58) calls toolbars stable. See [status](api-mapping.md#status-of-the-new-apis). |
| `Stack.Title`, `Stack.Header` | moving | The Stack guide's alpha label. The changelog does not name them. |
| iPad sidebar beyond `sidebarAdaptable` | moving | Placement and icon workarounds use `unstable_nativeProps`, and custom layouts use `react-native-screens/experimental`. See [sidebar.md](patterns/sidebar.md). |
| `+native-intent` with `redirectSystemPath` | moving | [Customizing links](https://docs.expo.dev/router/advanced/native-intent/) gives no stability word. The page labels its sibling `legacy_subscribe` alpha. |
| `redirects` in the `expo-router` plugin | moving | Listed in the [v58 reference](https://docs.expo.dev/versions/v58.0.0/sdk/router/) in HTTP terms. No page says they apply on native. The SDK 58 source does apply them there, which was read and not run. |
| Router's import surface | moving | Changed at SDK 56 and again at 58: [api-mapping.md](api-mapping.md#router-57-to-58-changes-that-catch-apps). The thin layer keeps screens clear of it. |
| Plain React Navigation native tabs, 7.x | moving | [The docs](https://reactnavigation.org/docs/native-bottom-tab-navigator/): "This navigator's API may change in a minor release." |
| React Navigation 8.x | moving | Alpha. [The upgrade guide](https://reactnavigation.org/docs/8.x/upgrading-from-7.x/) changes what `createBottomTabNavigator` means. |

"Stable" here means a known set of versions and one upgrade path. It does not mean frozen: Router has breaking changes at SDK hops. That is the case for Router over plain React Navigation on this question, since Expo pins Router per SDK and pins no `@react-navigation/*` package.

Order rules:

1. Settled pieces go first, and each ships alone.
2. A piece waits for what it sits on: tabs after stacks, sidebar after tabs, toolbars after the stack they sit in.
3. Stable-at-58 pieces come after the hop to 58.
4. A moving piece gets its own step with pinned versions, and a re-test at every later SDK hop. The exception is a URL tool that old URLs need from the release Router goes live: it ships in step 6, with the same pin and re-test.
5. The plan names a stopping point before the first moving piece, so the app keeps its gains if the team stops there. In the order below that is the first stopping point.

## Order of steps

Each row names a rung of [the ladder](migration-planning.md#the-ladder), which holds the detail. This order differs from the ladder in one place: the thin layer comes before rung 2's improvements, so the stack change has a single module to touch. Put these steps through the procedure in [migration-planning.md](migration-planning.md), including the parity table and the clean exit.

| # | Step | Ladder | Stability | Skip when |
| --- | --- | --- | --- | --- |
| 0 | Adopt Expo | A | Unproven, from docs | On Expo, or on [track B](#not-on-expo) |
| 1 | Baseline flows, and one run of the URL table on old navigation. Then SDK hops on old navigation, re-running both at each hop, because plain React Navigation has no SDK pin. | 0, 1 | settled | Already on 58 skips the hops only |
| 2 | Thin navigation layer: the [facade](patterns/navigation-api-layer.md#navigation-facade) | 3 | Yours | No navigation calls to wrap, or track B |
| 3 | Standalone improvements that do not touch the stack, such as serializable params and split screen files | 2 | settled | Nothing qualifies |
| 4 | Native stack in place of the JS stack. Keep route names identical, using the [Navigator seam](flag-seams.md#navigator-seam). | 2 | settled | Already on it |
| 5 | Deep link suite, complete and automated. See below. | 0, 8 | settled | The app accepts no URLs |
| | **Stopping point: native stack and tested URLs, with settled pieces only. Step 11 still runs, scoped to what the plan replaced.** | | | |
| 6 | Router, with old URLs kept working. Native dependencies ship dark first. | 4 to 8 | settled, plus any moving URL tool it needs, under order rule 4's exception | Track B |
| 7 | Native tabs. See [tabs.md](patterns/tabs.md). | 9 | stable at 58 | No tabs, or track B |
| | **Stopping point: Router and native tabs. Steps 8 to 10 are optional chrome and controls. Step 11 still runs, scoped to what the plan replaced.** | | | |
| 8 | iPad sidebar. See [sidebar.md](patterns/sidebar.md). | 9 | moving | No iPad layout, or track B |
| 9 | Header toolbars in place of `headerRight`. See [navbar-buttons.md](patterns/navbar-buttons.md). On Android this needs `@expo/ui` and `expo-symbols`, so include them in step 6's binary. | 9 | moving | No buttons set from screens, or track B |
| 10 | `@expo/ui` screen by screen. See [mixed-content.md](patterns/mixed-content.md). | 10 | stable at 58 | Not recommended |
| 11 | Ramp, bake, then remove old code | 11 to 14 | | Never |

A plan that reaches Router has the outcome **Switch**. Write both switch paths: [flag-seams.md](flag-seams.md) for the seam, where the Entry and Hosted tree seams were never run and need their spikes, and [no-flag-paths.md](no-flag-paths.md), usually path A. Steps 0 to 5 ship on old navigation with no switch.

Preparation for step 6 is listed in [api-mapping.md](api-mapping.md#moving-from-code-defined-react-navigation). Expo's [migration guide](https://docs.expo.dev/router/migrate/from-react-navigation/) does not say how to migrate incrementally, so this order is first principles.

## Deep links

URLs are a contract with things outside the app, so they get their own track through every step.

### Inventory

Start from the URL table in [analysis.md](analysis.md), dimension 7. Include each `alias`, `parse`, `stringify`, custom `getStateFromPath`, `getInitialURL` and `subscribe` in the old `linking` config, along with push payloads and in-app `Linking.openURL` calls. Native URL handlers in `AppDelegate` or activities get a row too: under the scene life cycle that SDK 58 generates, [UIKit stops calling the app delegate's URL methods](api-mapping.md#ios-57-to-58-changes-that-catch-apps).

The repository cannot show URLs already out in the world: emails, sent notifications, QR codes, other apps, partner sites. Make that an open question for the owner, because those URLs decide how long the old ones must keep working.

Each row of the plan's table adds: link kind (scheme or verified `https`), sign-in needed, the tab it lands in, where back goes, and the tool that keeps it working.

### Tests

Run the table on old navigation first, so later runs have a baseline to match. On track A that first run comes before step 0, and the table runs again straight after it, because adopting Expo changes native app setup. The same table then runs at steps 1, 3, 4, 5, 6 and 7, at each SDK hop, and in the clean exit. Every run covers every row, and every row passes cold and warm on each shipped platform. A plan records this in each step's **URL table** line. On an app already on Expo, the baseline run comes before the first SDK hop, in its own step.

| Level | Old navigation | Router | What it leaves unproven |
| --- | --- | --- | --- |
| Mapping | `getStateFromPath` from `@react-navigation/native` with the app's config. React Navigation's docs do not describe this as a test, so it is a sketch. | Awaited [`renderRouter(routes, { initialUrl })`](https://docs.expo.dev/router/reference/testing/) with `expect(screen).toHavePathname(...)`. Needs `@testing-library/react-native` 14+. | The docs do not say `initialUrl` passes through `+native-intent` or `redirects`, so a rewrite needs a device run. |
| Device, scheme | [`npx uri-scheme open`, `xcrun simctl openurl booted`, `adb shell am start -W -a android.intent.action.VIEW -d`](https://reactnavigation.org/docs/deep-linking/) | The same | Domain verification |
| Device, `https` | The same tools, on a build with [associated domains](https://docs.expo.dev/linking/ios-universal-links/) and [`autoVerify` intent filters](https://docs.expo.dev/linking/android-app-links/), and their hosted files | The same | |

Beyond the happy path, each row also checks: signed out, an invalid param, the right tab selected, and back landing where it landed before. A `linking` config `initialRouteName` becomes `unstable_settings.anchor`, which the prototype never used, so check back explicitly.

### Keeping old URLs

Prefer the top of this list. The tools are described in [api-mapping.md](api-mapping.md#old-urls).

1. **Same path.** Lay out the routes so the old URL is the new URL, with no redirect to maintain.
2. **`<Redirect>` in a stub route**, for a few moved paths.
3. **`+native-intent`**, for many paths or changed shapes. Native only, with no access to app state, and a throw can crash the app. Test it on a device at each SDK.
4. **`usePathname` and `Redirect` in a layout**, when the rewrite needs app state such as sign-in.
5. **`redirects` in the plugin**, once a device run on each platform proves it, since no page says it applies on native.
6. **`+not-found`**, for what is left: link home, and log the URL so unknown old links show up.

A custom `subscribe` or `getInitialURL` that feeds notifications needs a new home. `legacy_subscribe` in `+native-intent` is labelled alpha, so it is a moving piece under order rule 4.

## Not on Expo

Pick a track, as an open question for the owner if nobody can answer now.

| | Track A: adopt Expo | Track B: stay on plain React Navigation |
| --- | --- | --- |
| Means | Step 0, then the whole order | Native stack and a hand-written `linking` config |
| Outcome | Switch | Adopt in place: [Navigator seam](flag-seams.md#navigator-seam), [no-flag path E](no-flag-paths.md#e-owner-stays-on-a-release-branch) |
| Steps | All | 1, 3, 4, 5, 11's clean exit. The hops apply only with Expo. |
| Old URLs | As above | Same path first, then [`alias`](https://reactnavigation.org/docs/configuring-links/). It is ignored when generating URLs and does not match child screens in nested navigators. |
| Native tabs | `NativeTabs` | None: tabs stay as they are |
| `@expo/ui` | Available | Unavailable: its docs tell a React Native app to install `expo` first |
| Committed native projects | Router's [install page](https://docs.expo.dev/router/installation/) does not say how config reaches them. Spike it. Universal Links need the [capability set by hand](https://docs.expo.dev/linking/ios-universal-links/). | No change |
| Evidence | Unproven, from docs | `not exercised (no catalog entry)` throughout |

An app already on Expo can also take track B when [target-decision.md](target-decision.md#what-changes-the-recommendation) says so, for example a custom `getStateFromPath` that shared routes cannot replace. It still takes SDK hops. `@expo/ui` declares no router peer, but no page says `Host` works under plain React Navigation, so spike it before relying on it.

## What the prototype supports

Quote statuses from the status table in each file of the [pattern catalog](pattern-catalog.md). [verification.md](patterns/verification.md) defines the words and covers deep links. These pieces have no catalog entry:

| Piece | Status |
| --- | --- |
| `+native-intent`, plugin `redirects`, `<Redirect>`, `unstable_settings.anchor` | `not exercised (no catalog entry)` |
| JS stack to native stack, native tabs on plain React Navigation, anything on plain React Navigation | `not exercised (no catalog entry)` |
| Adopting Expo, or moving any existing app to Router | not run |

Each `not exercised` row a plan relies on adds a verification task, as [migration-planning.md](migration-planning.md) requires.

## Done when

The plan built from this page:

- states the starting point per navigator, with evidence
- carries the **Unproven** label in each step's **Evidence** line, and a stability word there for each piece that step adopts
- skips or keeps each step of the order by its number, with the reason from the starting point
- names the stopping point before the first moving piece
- has a URL table with each row's tests and old-URL tool, and an open question for URLs outside the repository
- fills each step's **URL table** line, with the baseline run before any SDK hop or Expo adoption, and every row at each run [Tests](#tests) names
- names track A or B when the app is not on Expo
