# Navigation analysis: <repository>

Commit analyzed: <sha, or "unknown" when `git rev-parse --show-toplevel` is not this repository's root>. Inventory run: <date>.

## Summary

<Three sentences: archetype, what owns navigation, what will make the migration hard.>

**Archetype:** <R / N / U / W / X / M>

## Findings

Confidence is `confirmed`, `signal` or `not found`. For `not found`, the evidence says what was searched.

| # | Dimension | Finding | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| 1 | Repository shape | | | |
| 2 | Versions: expo, react-native, react | | | |
| 2 | Versions: navigation packages | | | |
| 2 | New Architecture | | | |
| 3 | Archetype, and what owns the screens | | | |
| 3 | Starting point, N or the N part of M: stack, tabs, Expo, per navigator | | | |
| 4 | Route tree and screen count | | | |
| 4 | Params and global refs | | | |
| 5 | Shells per platform and width | | | |
| 5 | Entry point and root providers | | | |
| 6 | Native projects: committed or generated | | | |
| 6 | Local modules and plugins | | | |
| 6 | Patches | | | |
| 6 | Native navigation code | | | |
| 7 | Scheme, domains, intent filters | | | |
| 7 | Link handling | | | |
| 8 | Platform targets and minimum OS | | | |
| 10 | Flags, synchronous store, remote value channel | | | |
| 10 | Crash reporter and analytics | | | |
| 10 | OTA and runtime version | | | |
| 10 | CI and internal distribution | | | |
| 11 | Tests | | | |

## Route tree

```text
<navigators and screens>
```

## URL table

| URL shape | Handled by | Evidence | Target route |
| --- | --- | --- | --- |

## Behaviours in use (dimension 9)

| Behaviour | Where | Evidence | Confidence |
| --- | --- | --- | --- |

## Inventory signals

| Signal | Locations | Confirmed or dismissed | Note |
| --- | --- | --- | --- |

## Open questions

| Question | Who can answer |
| --- | --- |
