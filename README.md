# expo-navigation-migration-skill

An agent skill for moving an existing Expo or React Native app to **Expo SDK 58** navigation. Point Claude Code, or another coding agent, at your repository and it works out how navigation is done today, then writes a migration plan to **Expo Router (React Navigation)** and/or **@expo/ui (SwiftUI, Jetpack Compose)**.

It also carries a catalog of navigation patterns, each built both ways in a prototype app and compared on iOS and Android.

## What it does

**Analyzes your repository.** Library and version, Expo SDK, route structure, shells, native code, deep links and platform targets, each finding with `path:line` evidence. A small read-only script gathers the signals; the agent confirms them by reading the code.

**Writes a migration plan for that repository**, covering:

- **A recommendation** between the targets, with reasons from your code.
- **The switch behind a feature flag**: where the flag can sit, what is documented, and what needs a spike with pass conditions before you depend on it.
- **The switch when a flag is not possible**: how to replace what a flag gives you, including the weak point, rollback.
- **Ordered incremental steps**, each shippable and verifiable alone, ending in a clean exit that removes the flag and the old navigation, with a checkable finish.

**Answers pattern questions** from the catalog, with code from the prototype, status per platform and known gaps.

The skill plans. It does not change your application code unless you separately ask for that.

## Pattern catalog

| Area | Scenarios |
| --- | --- |
| Stacks | Push, pop, pop to root |
| Back | System back, Android back, unsaved-changes guards |
| Tabs | Native tabs, badges, coloured icons, config-driven tabs |
| Sidebar | iPad sidebar, top tab bar, default placement, collapsible sections |
| Dual screen | Surface Duo, iPhone Duo, foldables, two panes, hinge geometry |
| Presentation | Modal, page sheet, form sheet, full screen, bottom sheet with detents |
| Navbar | Buttons on entry, updating and removing them, overflow menus, live and large titles, bottom toolbar |
| Mixing | React Navigation chrome around a SwiftUI or Compose body, two shells in one app |

Each pattern shows React Navigation and @expo/ui on iOS and Android.

### What "verified" means

Every status comes from running the prototype on **simulators and emulators**: iPhone, iPad, iPhone Duo, a Pixel phone, a Pixel Fold and the Surface Duo emulator. **Nothing was run on physical hardware.** Anything else is marked `partial`, `gap` or `not exercised`. See [verification.md](expo-navigation-migration/references/patterns/verification.md) for the matrix, the toolchain and what never ran, and [gaps-and-bugs.md](expo-navigation-migration/references/patterns/gaps-and-bugs.md) for known problems and their fixes.

The headline result: use Expo Router for navigation and @expo/ui for controls inside screens. As a navigation shell, @expo/ui has gaps on both platforms, most of all on Android, where Compose has no stack, back handling or transitions. Your repository may have reasons to differ, and the plan will say so.

## What's inside

```
expo-navigation-migration/
  SKILL.md                 Entry point: analyze, plan, or look up a pattern
  references/
    analysis.md            How to analyze a repository, with evidence rules
    migration-planning.md  How to write the plan, the step ladder, the clean exit
    target-decision.md     Choosing between the targets
    flag-seams.md          Where a flag can sit, and what is proven
    no-flag-paths.md       Switching without a flag
    api-mapping.md         SDK hops, import replacements, breaking changes
    pattern-catalog.md     Index of every scenario
    patterns/              One file per scenario, plus gaps and verification
  scripts/                 Read-only navigation inventory (Node, no dependencies)
  templates/               Report and plan templates, local modules, helper code
```

## Requirements

- An agent that can read files and run Node 18 or later.
- The target repository can be on any SDK. Plans take apps below SDK 58 through one SDK at a time. A React Native app without Expo adopts Expo first.
- Using the patterns needs Expo SDK 58. The prototype ran `expo` 58.0.19, `expo-router` 58.0.26, `@expo/ui` 58.0.23, React Native 0.88 and `react-native-screens` 4.30.
- The sidebar section and placement modules need a development build.

## Install

### Claude Code

Copy the skill folder into your personal skills or a project's skills:

```sh
git clone https://github.com/bharath2020/expo-navigation-migration-skill.git
# personal (all projects)
cp -R expo-navigation-migration-skill/expo-navigation-migration ~/.claude/skills/
# or one project
mkdir -p <your-app>/.claude/skills
cp -R expo-navigation-migration-skill/expo-navigation-migration <your-app>/.claude/skills/
```

### Other agents

Copy `expo-navigation-migration/` wherever your agent loads skills from, or point it at `SKILL.md` directly.

## Use

```text
Analyze this repository's navigation and plan a migration to Expo 58.
Can we move to Expo Router behind a feature flag?
Should we use React Navigation or @expo/ui here?
How do I build a collapsible iPad sidebar on Expo 58?
What are our options for Surface Duo?
```

## Limits

- API facts were checked against Expo's docs and the SDK 58 packages on 2026-11-02. Expo changes every SDK, so the skill tells the agent to re-check versioned docs.
- Choosing old or new navigation in a custom entry point, and hosting a legacy tree under Router, are not documented by Expo and were not run in the prototype. The skill labels them and requires a spike.
- Nothing here was run on plain React Navigation without Expo Router.
- Adopting Expo in a React Native app without it follows Expo's docs and was not run here. The plan labels that step as unproven and requires a spike.
- There is no official migration guide for `react-native-navigation` or `react-router-native`.

## Tests

```sh
node --test expo-navigation-migration/scripts/inventory-navigation.test.mjs
```

## License

MIT. See [LICENSE](LICENSE).

This project is not affiliated with Expo, Software Mansion, Apple, Google or Microsoft.
