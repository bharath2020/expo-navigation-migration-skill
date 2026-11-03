---
name: expo-navigation-migration
description: Analyzes how an existing Expo or React Native repository does navigation and plans an incremental migration to Expo SDK 58 navigation, Expo Router (React Navigation and react-native-screens) and/or @expo/ui (SwiftUI, Jetpack Compose), behind a feature flag or without one, ending in a clean exit. Also a catalog of navigation patterns with verified status and known gaps - stacks, back interception, tabs, iPad sidebar and collapsible sections, modals, sheets, navbar buttons, overflow menus, large titles, bottom toolbars, Surface Duo, iPhone Duo and foldables. Use when asked to assess an app's navigation, plan a move to Expo Router, React Navigation or @expo/ui, move an existing React Navigation app to more native elements and stable deep links (including a bare app that will not adopt Expo and stays on plain React Navigation), or choose or implement any of these patterns on Expo 58.
---

# Expo navigation migration (SDK 58)

Three jobs. Pick by the request; a migration plan needs all three in order.

| Request | Do |
| --- | --- |
| "How is navigation done in this repo?" | Analyze |
| "Plan the migration", "Can we flag this?", "React Navigation or @expo/ui?" | Analyze, then Plan |
| "We're on React Navigation and want more native elements and a stable library for navigation and deep links" | Analyze, then Plan, with the [existing React Navigation scenario](references/existing-react-navigation.md) |
| "How do I build a sidebar / sheet / Duo layout?", "Does X work?" | Look up in the catalog |

Target names used throughout:

- **React Navigation** means Expo Router on react-native-screens. Since SDK 56 `expo-router` no longer depends on `@react-navigation/*` and forks the parts it builds on. SDK 58 removed most of that forked API.
- **Plain React Navigation** means `@react-navigation/*` 7.x without Expo Router.
- **@expo/ui** means SwiftUI on iOS and Jetpack Compose on Android.

Read only the target repository. This skill plans; it changes no application code unless the user separately asks.

Expo changes every SDK. API facts here were checked on 2026-11-02 against SDK 58. Fetch `https://docs.expo.dev/versions/v58.0.0/` for any API you are about to rely on that the catalog does not show as verified.

## Analyze

1. Run `node <skill>/scripts/inventory-navigation.mjs <repo-root>`. It reads only, and prints signals with `path:line` locations. When a signal shows `truncated` above zero, re-run with `--max-locations 200`.
2. Follow [references/analysis.md](references/analysis.md). Fill [templates/analysis-report.md](templates/analysis-report.md).

Done when every row of the report has a value with evidence, or says what was searched and not found, and every inventory signal is confirmed or dismissed by reading its code.

## Plan

Follow [references/migration-planning.md](references/migration-planning.md). It reaches for:

- [references/target-decision.md](references/target-decision.md): the recommendation between targets
- [references/flag-seams.md](references/flag-seams.md): where a flag can sit, what is documented, what needs a spike
- [references/no-flag-paths.md](references/no-flag-paths.md): the switch when a flag is not possible
- [references/api-mapping.md](references/api-mapping.md): SDK hops, import replacements, breaking changes
- [references/existing-react-navigation.md](references/existing-react-navigation.md): the scenario for archetype N, or the N part of M: starting point, stability order, deep links

Fill [templates/migration-plan.md](templates/migration-plan.md). The plan always covers the flagged switch, the no-flag switch, ordered steps that each ship and verify alone, and a clean exit that removes any flag and what the plan replaced. It names one recommendation with reasons from this repository. That recommendation can be to keep the current owner of navigation; when only the SDK moves, the plan says there is nothing to flag, and why.

## Look up a pattern

[references/pattern-catalog.md](references/pattern-catalog.md) lists every scenario and its file. Each file gives code from a working prototype for both targets on iOS and Android, status per platform, gotchas and migration notes. Quote status words as written: **verified** means exercised on a simulator or emulator, and no physical hardware was used.

[templates/](templates/) holds the reusable files: the local modules for sidebar sections and sidebar placement, the navigation helper layer, and the hinge and pane-split components. Local modules need a development build.
