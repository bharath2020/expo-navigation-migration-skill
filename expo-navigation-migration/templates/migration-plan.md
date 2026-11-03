# Navigation migration plan: <repository>

Based on analysis of <sha>. Target: Expo SDK 58.

## Recommendation

**Outcome:** <Switch / Adopt in place / Hop only>

<One sentence: the target.>

**Scenario:** <For archetype N or the N part of M: existing React Navigation, with the starting point and any track. Unproven: no such migration has been run. Otherwise delete this line.>

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

**Path:** <A / B / C / D, or E when the owner stays, with why>

| Flag gives | Here, without one |
| --- | --- |
| Separate deploy from release | |
| Gradual exposure | |
| Fast reversal | |
| Side-by-side comparison | |

**Abort conditions:**

## (c) Ordered steps

Steps that do not apply: <step, and why. For archetype N or the N part of M: every step of the scenario's order that this plan skips, by its number, with the reason from the starting point.>

Steps that depend on an open question sit in a conditional track, named after the question.

The **Evidence** and **URL table** lines are for archetype N or the N part of M. Otherwise delete them. Fill them on every step, including conditional tracks and the final step: a statement that covers all steps does not replace them.

### Step N: <name>

- **Evidence:** Unproven. <The stability word for each piece this step adopts, or "adopts nothing">
- **URL table:** <"Baseline: every row, cold and warm" on the first run; "every row, cold and warm" on each later run the scenario names; otherwise "no run", with why>
- **Change:**
- **Ships as:**
- **User-visible:**
- **Verify:**
- **Roll back:**
- **Done when:**

### Final step: clean exit

- **Evidence:** Unproven. Adopts nothing.
- **URL table:** every row, cold and warm
- **Change:** <The removal list: any named flag, and the specific old packages, imports, components, files, config and tests. Nothing the target keeps.>
- **Ships as:** <New binary when native dependencies change>
- **User-visible:** nothing
- **Verify:**
- **Roll back:** <The previous binary. With a flag, this step removes the kill switch, so it runs only after the bake.>
- **Done when:** <with a flag: the inventory run with `--flag '<flag name>'` shows `signals.flagName.count` as 0;> everything on the removal list is gone from the lockfile and targeted searches; remaining inventory hits on old navigation are confirmed or dismissed by reading the code; doctor, typecheck, lint, E2E and the URL table pass.

## Open questions

| Question | Blocks | Who can answer |
| --- | --- | --- |
