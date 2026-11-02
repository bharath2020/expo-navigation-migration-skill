# Navigation migration plan: <repository>

Based on analysis of <sha>. Target: Expo SDK 58.

## Recommendation

**Outcome:** <Switch / Adopt in place / Hop only>

<One sentence: the target.>

Why, for this repository:

1. <Finding, with evidence>

What the target cannot do that the app does today:

- <From the parity table>

What would change this recommendation:

- <Condition>

## Parity table

| In use today | Target pattern | Status on target (per shipped platform) | Decision | Reason |
| --- | --- | --- | --- | --- |

## (a) Switching behind a feature flag

**Seam:** <Screen / Route / Navigator / Hosted tree / Entry; or "none fits", or "nothing to switch", with why, and the rest of this section can go>

**Proven or not:** <What the docs and prototype show, and what this repository must prove>

**Spike:** <Pass conditions, if the seam needs one>

**Flag:** where it is read, its store, its default, the kill switch, the telemetry label. Where the app has no channel or telemetry, say so and say what stands in.

**What the flag does not cover:** <Adopting Expo, SDK hops, native dependencies>

## (b) Switching without a feature flag

**Role here:** <The fallback, with reasons specific to this repository; or the plan, because of section (a)>

**Path:** <A / B / C / D / E, with why>

| Flag gives | Here, without one |
| --- | --- |
| Separate deploy from release | |
| Gradual exposure | |
| Fast reversal | |
| Side-by-side comparison | |

**Abort conditions:**

## (c) Ordered steps

Steps that do not apply: <step, and why>

Steps that depend on an open question sit in a conditional track, named after the question.

### Step N: <name>

- **Change:**
- **Ships as:**
- **User-visible:**
- **Verify:**
- **Roll back:**
- **Done when:**

### Final step: clean exit

- **Change:** <The named flag, old navigators, packages, config and tests; for hop only, the named scaffolding>
- **Ships as:** <New binary when native dependencies change>
- **User-visible:** nothing
- **Verify:**
- **Roll back:** <The previous binary. With a flag, this step removes the kill switch, so it runs only after the bake.>
- **Done when:** the inventory run with `--flag '<flag name>'` shows `signals.flagName.count` as 0 and none of <old library signals, from the clean exit in migration-planning.md>; packages are gone from the lockfile; doctor, typecheck, lint, E2E and the URL table pass.

## Open questions

| Question | Blocks | Who can answer |
| --- | --- | --- |
