# Where a feature flag can sit

A **seam** is the place where a flag chooses old or new navigation. The seam decides how much of the switch can be reversed, and how much is proven.

## What a flag cannot cover

- **Adopting Expo.** An app without `expo` adds it in a new binary, before any flag.
- **The SDK upgrade.** "Update the Expo SDK version" is on Expo's list of what requires a new binary. Ship each SDK hop on the old navigation, before any flag.
- **Native dependencies.** `expo-router`, `@expo/ui` and `react-native-screens` all ship native code. They reach users in a new binary with a new runtime version. A flag can only turn on what a shipped binary already contains.
- **A running session.** Evaluate once per process and keep the value until the next launch. Nothing here tests a flip mid-session, and in the prototype remounting a navigator reset its state.

## Choose a seam

First ask whether the recommendation changes who owns navigation.

- **No, and only the SDK moves:** no seam applies. Record that, and use [no-flag path E](no-flag-paths.md).
- **No, but screens change:** use the Screen seam, where a routed screen has a React Native body to replace.
- **No, but a Router app swaps a layout navigator:** use the first form of the [Route seam](#route-seam).
- **No, but an N app on plain React Navigation swaps a navigator:** use the [Navigator seam](#navigator-seam).
- **Yes:** take the first row below that fits, from Route down. Add Screen seams on top if the plan adds @expo/ui leaves.

| Seam | Fits | Flag chooses | Evidence |
| --- | --- | --- | --- |
| **Screen** | A routed screen whose body changes to or from @expo/ui | Body of one screen: React Native or @expo/ui. Chooses nothing in an app with no React Native bodies. | A mixed screen ran at its own route ([mixed-content](patterns/mixed-content.md)). A flag choosing the body was not run. Spike: in a release build, the screen renders and its baseline flows pass under both values. |
| **Route** | R, or U with Router as its host | Which route or layout renders: a Router screen, or an @expo/ui shell mounted as one route | The @expo/ui shell route was verified as a user-triggered switch ([shell-coexistence](patterns/shell-coexistence.md)). A layout choosing a navigator, or a screen choosing its implementation, was not run. A flag driving either form was not run, so both have a spike. |
| **Navigator** | N staying on plain React Navigation | Which navigator a stack uses, for example JS stack or native stack | Standard API. Not in the prototype. No official option-by-option mapping exists, so audit each header option. |
| **Hosted tree** | N, when entry seam spike fails | Router is the root. A legacy tree runs as an isolated embedded tree under one route. | Narrow official carve-out, written for embedded trees. Not run here. |
| **Entry** | N, W, X, or U with no Router host, moving to Router | Which root registers at launch | **Not documented, not run.** Needs the spike below. |

`Stack.Protected` is access control, so keep it for auth rather than as a shell switch. From SDK 58 a guard that fails renders a redirect.

## Flag rules for every seam

- **One read, before the root mounts.** A slow or asynchronous read is a late flip, and a flicker. Evaluate remote flags on the previous run, write the result to a local store, and read that store at launch.
- **Synchronous store.** `expo-sqlite/kv-store` documents `getItemSync`. Its use before root registration is not documented, so test it on a cold start. If the app has MMKV or another synchronous store, use that.
- **Missing or unreadable means old navigation.** A failed read must never strand a user in new code.
- **Kill switch.** Turning the flag off takes effect by the next launch, with no store release. This needs a way to deliver a remote value. With none, a flag only separates internal from public builds: say so, or take a no-flag path.
- **Name the shell in telemetry.** Every crash and screen event carries `old` or `new`, or the ramp's numbers cannot be compared. With no crash reporter or analytics, adding one is a step before the ramp, or the ramp has no measure.
- **Keep persisted navigation state per shell.** Router state and legacy state differ, and Router requires complete persisted state from SDK 58.
- **Both shells take every URL.** See the deep link table in the plan.
- **Testing covers both values** until the clean exit.

## Route seam

For apps already on Expo Router. Two forms:

- Layout chooses a navigator, or a screen chooses its implementation. Screens stay put.
- The @expo/ui shell mounts as one root-stack route with `presentation: 'fullScreenModal'`, as the prototype does. See the code in [shell-coexistence](patterns/shell-coexistence.md).

The @expo/ui shell keeps its navigation in React state. URLs go to Router, so an @expo/ui route cannot honour a deep link into its own stack without code you write.

### Spike: pass all or leave this seam

The prototype switched shells from a button on a root `Stack`. Prove the flagged form, in a release build on each shipped platform:

1. A flag read at launch shows the chosen shell as the first screen, with no flash of the other.
2. A second launch with the flag changed takes the other shell.
3. If the root layout is a `<Slot />`, the choice works there too. Otherwise add the root `Stack` first, as its own shipped step.
4. For the @expo/ui shell route, back at the shell's root does what the app needs: on Android, leaves the app rather than revealing the other shell.
5. Each row of the URL table reaches a usable screen under both values.
6. Typecheck, lint and the baseline flows pass under both values.

## Navigator seam

```text
flag --> createNativeStackNavigator()   same screens, same route names
     \-> createStackNavigator()
```

Keep the route names identical so `linking` and `navigate` calls are untouched. This is also an improvement worth shipping before a Router move, because the native stack is what Router uses and its header options are the ones you will port.

## Hosted tree seam

Router owns the root, and one route renders the legacy tree:

- The SDK 57 to 58 guide says to use `NavigationContainer` from `@react-navigation/native` "for an isolated embedded navigation tree". Expo's change notes describe this as for "very rare cases".
- The rest of the docs say Router does not manage additional containers, and that importing `@react-navigation/*` in app code is otherwise unsupported from SDK 56.
- Moving the entry to Router is itself not flagged, so it is a one-way step for this release.

Prove these before committing: system back on Android at the boundary, deep links into legacy screens through a Router route, headers doubled or hidden, modals presented from the embedded tree, and a screen shared by both trees navigating in the tree that owns it. That last check is [the facade's per-tree choice](patterns/navigation-api-layer.md#navigation-facade), which was not run.

## Entry seam

```text
index.js --flag--> legacy root: real @react-navigation/*, own linking config
         \------> expo-router/entry: Router owns its container and links
```

Sketch only. No run of the prototype exercised it, and no Expo page describes it.

```js
// index.js: the imported flag module must not import expo-router or legacy navigators.
import { readNavigationShell } from './src/navigation/shell-flag';

if (readNavigationShell() === 'router') {
  require('expo-router/entry');
} else {
  const { registerRootComponent } = require('expo');
  const { default: LegacyApp } = require('./src/legacy/App');
  registerRootComponent(LegacyApp);
}
```

Facts this design has to respect, from the SDK 58 packages and docs:

| Fact | Consequence |
| --- | --- |
| The documented custom entry only runs side effects, then imports `expo-router/entry` last | This branch is outside the documented contract. Re-test it on every SDK. |
| `import` hoists | Use `require` for both branches. |
| Importing `expo-router` sets a global `react-native-screens` flag at module load, and rendering `ExpoRoot` sets more | No Router import may run on the legacy branch. That includes shared code. |
| The module-level `router` throws before the first router render | Shared screens call the [navigation facade](patterns/navigation-api-layer.md#navigation-facade), not `router.*`. |
| Router's entry manages the splash screen | The legacy branch keeps its own splash handling. |
| `+native-intent` and `redirects` run only inside Router | The legacy branch keeps its own `linking` for as long as it can launch. |
| `expo-router` no longer depends on `@react-navigation/*`, and `@expo/cli` removed its rewrite of those imports in 58.0.2 | Legacy packages should resolve to the real ones at SDK 58. The SDK 55 to 56 guide still describes the old bundler error and is out of date on this point. Confirm by bundling. |
| `ExpoRoot` is exported but tagged `@hidden`, and shown only in a troubleshooting note | Prefer `expo-router/entry` as above over mounting `ExpoRoot` yourself. |

### Spike: pass all or leave this seam

Run on a branch, in a development build and a release build, on iOS and Android:

1. Both branches cold start to their first screen, and the splash hides.
2. The legacy branch evaluates no `expo-router` module. Prove it with a module-load log, not by inspection.
3. A second launch with the flag changed takes the other branch.
4. Each branch handles a cold-start and a warm deep link from the URL table.
5. A shared screen renders in both branches.
6. `npx expo-doctor`, typecheck and lint pass.
7. Record the bundle size change.

If any fails after one fix attempt, record why and use the hosted tree seam or a [no-flag path](no-flag-paths.md).
