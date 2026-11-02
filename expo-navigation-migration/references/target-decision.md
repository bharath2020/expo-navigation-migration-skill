# Choosing a target

Make one recommendation for this repository, with reasons drawn from its analysis report. The evidence behind the defaults is in [patterns/verification.md](patterns/verification.md) and [patterns/gaps-and-bugs.md](patterns/gaps-and-bugs.md).

## Default

**Expo Router owns navigation. @expo/ui draws leaf content inside screens.**

```text
Expo Router: routes, URLs, per-tab stacks, back, tabs, sidebar, modals, sheets
   └─ screen
        └─ <Host> SwiftUI or Compose controls: menus, pickers, toggles, forms
```

Why, from building every feature twice:

| | Expo Router | @expo/ui as the navigation shell |
| --- | --- | --- |
| iOS | Native for every feature tested, except sidebar sections, which are a gap with no tested path | No full-screen cover, no interception of the back button or swipe |
| Android | Everything except large titles and page or form sheets with a header | No stack, back handling, push animation, cascading menus or large app bar; the prototype wrote those in JavaScript |
| URLs, deep links, typed routes | Built into Router. In the prototype: one iPad deep-link open and `typedRoutes` compile checks; no Android deep-link run. Test the app's URL table. | State only |
| Custom native code in the prototype | None | Sidebar sections and sidebar placement, each a local module |

Expo's own docs send routed full-screen tabs to `expo-router/native-tabs` rather than the SwiftUI `TabView`, and document no way to use @expo/ui as a router or to connect its `NavigationStack` to URLs.

## Decide per archetype

| Archetype | Usual recommendation |
| --- | --- |
| **R** Expo Router | Stay on Router. Upgrade, adopt the SDK 58 chrome APIs, add @expo/ui leaves. |
| **N** code-defined React Navigation | Router plus @expo/ui leaves. Choose plain React Navigation if a row below says so. |
| **U** @expo/ui shell | Router backbone. Keep @expo/ui screens as leaves or as a self-contained flow. Keep the shell only if a row below says so. |
| **W** `react-native-navigation` | Router. Expo's only guidance points to a native stack, and no migration guide exists, so plan a rewrite of the navigation layer. Expect the no-flag path unless the entry seam spike passes. |
| **X** other | Router. No official guide exists. |
| **M** mixed | Decide per part. The end state has one owner of navigation state. |

## What changes the recommendation

| Finding | Effect |
| --- | --- |
| Custom `getStateFromPath` or `getPathFromState` that shared routes cannot replace | The official guide calls this a poor fit for Router. Consider plain React Navigation 7. |
| Many custom navigators or routers | Check `createStandardRouterNavigator` and `integrateWithRouter` first. If they cannot carry them, consider plain React Navigation. |
| `NavigatorScreenParams`, `resetRoot`, or non-serializable params used everywhere | Router stays viable, but raise the estimate. The guide says to move off them first. |
| Screens call into a React Navigation fork-removed API | See [api-mapping.md](api-mapping.md). |
| Self-contained iOS-only flow with no deep links, back interception or Android twin | @expo/ui `NavigationStack` is acceptable for that flow, presented as one Router route. |
| iPad sidebar needs collapsible sections | Router's `NativeTabs` builds no sections. The only tested sections are SwiftUI's `TabView` in a local view, shown by the `tab-sections` module. Either keep sections on an @expo/ui iPad shell, or reach the same destinations another way. See [patterns/sidebar.md](patterns/sidebar.md). |
| Tabs built from data at runtime | Expo's docs say `NativeTabs` does not support adding or removing tabs at runtime. A long, data-driven sidebar weighs against Router. See [patterns/tabs.md](patterns/tabs.md). |
| Several windows or scenes, or a custom entry per window | Multi-window was never run in the prototype. Expo's docs do not cover two Router trees in one runtime, beyond noting that the module-level `router` cannot tell roots apart. Prove it before choosing Router. |
| iOS-only app whose shell is already @expo/ui and which uses no deep links | Staying on the shell is defensible. State the costs: no back interception, no full-screen cover, no URLs, and no Android path. This is the hop-only outcome below. |
| Android is a target | Do not build Android navigation from Compose pieces. Design large-title and form-sheet screens for Material instead of mirroring iOS. |
| Plain React Navigation chosen | Stable 7.x has no SDK 58 pin: `expo/bundledNativeModules.json` lists no `@react-navigation/*` package, and no page states SDK 58 compatibility. None of the patterns here was run on plain React Navigation. Add a verification step. |
| Foldable or dual-screen target | [patterns/dual-screen.md](patterns/dual-screen.md). Router has the tested two-pane path; @expo/ui has no two-pane screen in the prototype. |

## Outcomes

Name one. It sets the shape of the plan.

| Outcome | Means | Plan |
| --- | --- | --- |
| **Switch** | The owner of navigation changes: to Router, or between shells | Flag and no-flag paths both apply. Full ladder. |
| **Adopt in place** | The owner stays, and the app takes up new APIs or @expo/ui leaves, or replaces a navigator | Screen, Route or Navigator seam. Without a flag, [no-flag path E](no-flag-paths.md). Most of the ladder falls away. |
| **Hop only** | The owner stays, and only the SDK moves | Nothing to flag: section (a) records that. Section (b) is the plan, using [no-flag path E](no-flag-paths.md). |

## Writing the recommendation

State, for this repository:

1. The outcome and the target, in one sentence.
2. The three to five findings that decide it, each with its evidence.
3. What the target cannot do that the app does today, from the parity table.
4. What would change your mind.

When the choice belongs to the owner, and no one can answer now, assume the option that keeps today's behaviour, say so, and make it the first open question. A second option that depends on that answer goes in the plan as a conditional track.
