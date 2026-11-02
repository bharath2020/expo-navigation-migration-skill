# Migration planning

Turn an analysis report into a plan for this repository. A plan with generic steps has failed: every step names this repository's screens, files, URLs and gaps.

## Procedure

### 1. Recommend a target
Follow [target-decision.md](target-decision.md). Done when the recommendation cites findings from the report.

### 2. Build the parity table
One row per behaviour from dimensions 5 and 9 of the report.

| Column | Content |
| --- | --- |
| In use today | The behaviour, with evidence |
| Target pattern | The file in [patterns/](patterns/) |
| Status on target | The status word for each platform the app ships on |
| Decision | `match`, `accept the difference`, `redesign`, or `needs a decision` |

Any `gap`, `partial` or `not exercised` on a shipped platform needs a decision and a reason. `not exercised` also adds a verification task. A row marked `needs a decision` becomes an open question and blocks the ramp, not the early steps. A row can depend on another open question: write `conditional on question N`.

When the catalog has no row for a behaviour, write `not exercised (no catalog entry)`, leave Target pattern empty, and add a verification task. [pattern-catalog.md](pattern-catalog.md) lists what was never built. The catalog's status columns are per shell and platform: note it when an iPad-only or foldable-only behaviour rests on a wider row.

### 3. Choose the seam
Follow [flag-seams.md](flag-seams.md). Name the seam, why it fits, what is proven, and what the spike must prove. If no seam fits, or the outcome is hop only, say so; section (a) of the plan then records why, and (b) becomes the plan.

### 4. Write the no-flag path
Follow [no-flag-paths.md](no-flag-paths.md). Always written, so the team can compare costs and fall back.

### 5. Order the steps
Start from the ladder below. Delete rungs that do not apply and say why. Split any rung too large to ship in one release. Steps that depend on an open question go in a conditional track, named after the question.

### 6. Check the plan
Run the checks at the end of this page, and fix what fails.

## The ladder

Every step in the plan states:

- **Change**: files and screens in this repository.
- **Ships as**: OTA, new binary, or internal only.
- **User-visible**: what changes, usually nothing before the ramp.
- **Verify**: the commands, E2E flows or simulator checks that prove it.
- **Roll back**: exactly how.
- **Done when**: a checkable condition.

Steps 0 to 3 pay off even if the migration stops there.

| # | Step | Notes | Skip when |
| --- | --- | --- | --- |
| A | **Adopt Expo** | The first step for an app with `react-native` and no `expo`, which the inventory shows as `isExpoApp: false` with no `expo` under `navigation`. Follow Expo's [guide for existing React Native apps](https://docs.expo.dev/bare/overview/): [install Expo modules](https://docs.expo.dev/bare/installing-expo-modules/) with `npx install-expo-modules@latest`, or by hand if the project differs significantly from a default React Native project, then [use Expo CLI](https://docs.expo.dev/bare/using-expo-cli/). Navigation does not change, and this ships as a new binary. The install page does not say which SDK you get, so read the installed `expo` version, and start step 1 from it. **Unproven: from Expo's docs, not run here.** Label it in the plan. Spike on a branch, which passes when a release build starts on each shipped platform with navigation unchanged. | `expo` is already a dependency |
| 0 | **Baseline** | E2E flows for every parity row that has none. URL table as a test list. Record crash-free rate and start time where a reporter exists; otherwise record that and add one if the ramp needs it. Add `testID`s. | Never |
| 1 | **SDK hops** | One release per SDK, on old navigation. [api-mapping.md](api-mapping.md). | Already on 58 |
| 2 | **Standalone improvements** | Ship what is worth having whatever happens: serializable params, split screen files, no `null` root, native stack in place of a JS stack, safe-area fixes. | Nothing qualifies |
| 3 | **Navigation facade** | Route names and a small API in one module: `goTo`, `back`, `canGoBack`, back guard. Move call sites over. Replace global refs. The module imports no router. When one tree runs per launch, each adapter loads only on its own branch. See the [sketch](patterns/navigation-api-layer.md#navigation-facade), which was not run and also covers two trees in one runtime. No behaviour change. | Screen or Navigator seam only, Router stays owner under both flag values, hop only, or no navigation calls to wrap |
| 4 | **Native dependencies, dark** | New binary containing the target's packages, unused. Bump the runtime version. Run the full baseline. Proves the binary before any code depends on it. | The binary already has them |
| 5 | **Seam and flag** | Flag read, default old, kill switch, telemetry label. Any seam with a spike: the spike comes first and must pass. | No flag |
| 6 | **First vertical slice, internal** | One low-traffic flow end to end on the new shell, with the flag on for developers only. | Hop only |
| 7 | **Route parity** | Remaining screens, in batches that each ship. New tree stays behind the flag. Screens stay shared through the facade. | Hop only, or no route changes |
| 8 | **Deep link parity** | Every row of the URL table passes on both shells, cold and warm. Old URLs map through the tools in [api-mapping.md](api-mapping.md). | The app accepts no URLs |
| 9 | **Chrome parity** | Tabs, sidebar, modals, sheets, buttons, menus, per the parity table. Device matrix: every platform the app ships on, including iPad widths and foldables where relevant. | Hop only |
| 10 | **@expo/ui leaves** | If recommended: screen by screen behind the Screen seam. Independent of the ramp. | Not recommended, or bodies already @expo/ui |
| 11 | **Internal ramp** | Staff, then beta. Fix findings. Exit: all parity rows closed, baseline green on the new shell. | Never |
| 12 | **Staged ramp** | Percentages agreed with the owner. Abort conditions written beforehand: crash-free rate, deep link failures, a failing flow. Abort means flag off, then diagnose. With no flag, this is the store's staged rollout, and abort means halting it and shipping the rollback build. | Never |
| 13 | **Bake** | Hold at 100% with the kill switch live for at least one release cycle. Exit: old-shell traffic is negligible, and the oldest supported binary contains the new shell. With no flag or no telemetry, hold for one release cycle and state what stands in for the measure. | Hop only |
| 14 | **Clean exit** | Below. | Never. The plan's removal list sets its size. |

### Clean exit

Ships as a new binary when native dependencies change, and otherwise as whatever the change needs. Do it in one change that can be reviewed, and do not bundle unrelated work.

- With a flag, delete the flag, its read, its store key, its telemetry label and its dashboards.
- Name the removal list: the specific old packages, imports, components, files and config this plan removes. Start from this table:

  | Plan | Usually on the list |
  | --- | --- |
  | Replaces React Navigation, Wix or `react-router-native` | Old navigators, screens' old adapters and the old `linking` config. `@react-navigation/*`, `react-native-navigation` or `react-router-native`, and any patches for them. |
  | Replaces Router | The replaced routes and layouts. If Router goes entirely, `expo-router` and any patches for it. |
  | Replaces an @expo/ui shell | Shell components and the local modules only they use |
  | Owner stays | Only what the plan replaced: a navigator and any package of its own, or old screen bodies or chrome |
  | Hop only | Scaffolding: patches and workarounds the new SDK makes unnecessary |

  What the target keeps is never on the list, such as `Stack.Protected` for auth, @expo/ui leaves, and Router as the host of a shell.

- When moving to Router, set `main` to `expo-router/entry`, or keep a side-effects-only entry that imports it last. If analysis found an entry that branches per window or scene, keep that branch, and record that it is outside the documented contract and must be re-tested each SDK. When dropping Router, point `main` at the new root.
- Collapse the facade if it now only forwards to the router. Keep it if it holds real logic.
- Keep `+native-intent` maps for old URLs for as long as they can arrive.
- Remove test flows and config for the old shell.
- Bump the runtime version if native code changed.

Done when:

- everything on the removal list is gone. With a flag, `node <skill>/scripts/inventory-navigation.mjs <repo> --flag '<flag name>'` reports `signals.flagName.count` as 0. Check packages in the lockfile, and imports, components and files with targeted searches.
- every remaining inventory hit on old navigation is confirmed or dismissed by reading its code. Signals are text matches, so a hit fails this check only when it is something on the removal list still in use.
- `npx expo-doctor`, typecheck, lint and the full E2E baseline pass
- the URL table passes

## Plan checks

- [ ] Sections (a) flagged, (b) no-flag and (c) steps are all present. When nothing switches, (a) says so and why.
- [ ] One outcome and one recommendation, with reasons from this repository.
- [ ] Each step can ship alone and leaves the app working if the next step never happens.
- [ ] Each step has Change, Ships as, User-visible, Verify, Roll back and Done when.
- [ ] Nothing a flag cannot cover is claimed to be behind one.
- [ ] Each undocumented or unrun approach is labelled and has a spike with pass conditions.
- [ ] Each parity row has a status from the catalog, or `not exercised (no catalog entry)`, and no status is upgraded.
- [ ] The final step names any flag and the old packages, imports, components and files it removes, with a checkable finish.
- [ ] Open questions are listed, with who can answer each.
