# Switching without a feature flag

Every plan includes this path, even when a flag looks possible: the spike can fail, or the team can decline to carry two navigation stacks.

A flag is not possible when:

- no seam fits, or the entry seam spike failed and the hosted tree cost is too high
- the app has no way to read a value before the root mounts, and the team will not add one
- two navigation stacks in one binary break a size, compliance or staffing limit
- the old library cannot share a binary with the target
- the app has no way to deliver a remote value or to measure a ramp, and the team will not add one
- nothing is switching: the plan is an SDK hop only
- the owner rejects it

Name the reason for this repository.

## What replaces the flag

A flag gives four things. Each no-flag path has to answer for each of them.

| Flag gives | Without a flag |
| --- | --- |
| Separate deploy from release | Release branch or build profile, merged when ready |
| Gradual exposure | Store staged rollout, internal track first |
| Fast reversal | Prepared rollback build. OTA cannot undo a native change, and it can only reach binaries with a matching runtime version. |
| Side-by-side comparison | Before-and-after E2E runs and telemetry per app version |

Treat reversal as the weak point. Confirm with the owner what their stores allow, and rehearse the rollback build before the switch.

## Paths

Pick one, and say why.

### A. Facade first, then a direct cut

For any app with one owner of navigation to replace, of modest size. Most of the work ships before the switch.

1. Ship the navigation facade, route registry, deep link table and E2E flows on old navigation.
2. Ship screens made router-agnostic: no navigator imports, params serializable, loading handled inside screens.
3. Build the Router tree on a short-lived branch. Screens are shared, so little diverges.
4. Release as one version: internal track, then staged rollout, then full.

### B. Build-time selection

For apps that want real builds of both, with no runtime branch.

An `app.config` value picks the entry and the plugin set at build time, for example from an environment variable and an EAS build profile. Internal users get the new build and the store gets the old one until cutover. The code paths still coexist in the repository, so the clean exit is the same.

The docs do not describe swapping `main` by profile. Prove it with one internal build before relying on it.

### C. Slice by self-contained flow

For apps with separate areas. Replace a whole area with its own navigator in each release, entered from a stable boundary such as one modal route. Works where an area has few links into it. Cannot be used to replace the root, so it must end in A.

### D. New shell in a new major version

For apps being redesigned anyway. Accept that old and new versions differ in the field for as long as users update slowly. Keep old URLs working through `+native-intent`, `redirects` or `Redirect` stub routes.

### E. SDK hop on a release branch

For the hop-only outcome: the owner of navigation stays, and one binary per SDK ships. Branch, upgrade, fix what breaks, run the baseline, then release through the internal track and a staged rollout. Before the switch, write down what the hop puts at risk in this app: local modules, patches, private imports, custom entries, scene handling. Each gets a check. The clean exit removes only the hop's scaffolding, such as patches that the new SDK makes unnecessary.

## Any path

- Upgrade the SDK first, in its own releases.
- Freeze navigation changes for the cut window. Short-lived branches only.
- Publish no OTA that assumes the new native code to binaries with the old runtime version. Use the `fingerprint` runtime version policy, or bump by hand.
- Set abort conditions before the rollout starts: crash-free rate, deep link failure rate, and any flow that fails E2E.
- Run the clean exit in the same plan. There is no flag to remove, but legacy packages, `linking` config and the facade's old adapter remain.
