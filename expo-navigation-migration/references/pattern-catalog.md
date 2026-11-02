# Pattern catalog

Every navigation scenario built in the prototype: an Expo SDK 58 app with each feature built twice, once with Expo Router and react-native-screens, once with @expo/ui. Code is copied from that app, and paths in `From the prototype:` labels are relative to it. The app itself is not published; [templates/](../templates/) holds its reusable files.

Read [patterns/verification.md](patterns/verification.md) for what status words mean, what ran where, and the full feature matrix. Nothing was run on physical hardware.

| Scenario | File | Read for |
| --- | --- | --- |
| Push, pop, pop to root | [stack.md](patterns/stack.md) | Stack navigation on both targets |
| Going back, Android back, unsaved-changes guards | [back.md](patterns/back.md) | Back interception, and what @expo/ui cannot intercept |
| Tabs, badges, coloured icons, config-driven tabs | [tabs.md](patterns/tabs.md) | Tab bars on all platforms |
| iPad sidebar, top tab bar, sidebar placement, collapsible sections | [sidebar.md](patterns/sidebar.md) | Sidebar options and which needs a local module |
| Surface Duo, iPhone Duo, foldables, two panes, hinge | [dual-screen.md](patterns/dual-screen.md) | Dual-screen options per device |
| Modal, and pushing inside one | [modal.md](patterns/modal.md) | Modal stacks |
| Page sheet, form sheet, full screen | [modal-sheets.md](patterns/modal-sheets.md) | Sheet presentation and the first-mount rule |
| Bottom sheet with detents | [bottom-sheet.md](patterns/bottom-sheet.md) | Detents per platform |
| Navbar buttons: on entry, updated, badged, removed | [navbar-buttons.md](patterns/navbar-buttons.md) | Replacing `headerRight` |
| Overflow menu: checkmarks, sections, submenus | [overflow-menu.md](patterns/overflow-menu.md) | Menus in the navbar |
| Live titles, large titles | [titles.md](patterns/titles.md) | Title changes and Android's limit |
| Bottom toolbar | [bottom-toolbar.md](patterns/bottom-toolbar.md) | The iOS 26 tab bar overlap and its fix |
| React Navigation chrome around a SwiftUI or Compose body | [mixed-content.md](patterns/mixed-content.md) | The recommended mix, and what was observed |
| Two shells in one app | [shell-coexistence.md](patterns/shell-coexistence.md) | Mounting @expo/ui as one route; the base of the route seam |
| Thin TypeScript layer between screens and router | [navigation-api-layer.md](patterns/navigation-api-layer.md) | Tab config, presentation helpers, navbar store, Android navigation summary, testing guidance |
| Every known gap and bug, with fixes | [gaps-and-bugs.md](patterns/gaps-and-bugs.md) | Checking a feature before promising it |

## Never built

The prototype has no code or evidence for these. In a plan, mark them `not exercised (no catalog entry)`:

- @expo/ui `NavigationSplitView` inside a tab
- Popovers
- Search-role tabs and `.searchable`
- Multiple windows, scene delegates, dragging a row out to a new window, and a splash per root
- Drawers and top tabs
- Plain React Navigation without Expo Router

Multiple windows, search-role tabs and system search are covered for SDK 57 in the separate [expo-ipad-navigation](https://github.com/bharath2020/expo-ipad-navigation-skill) skill. Its evidence is not carried over to SDK 58.

## Templates

| Files | Use |
| --- | --- |
| `templates/modules/tab-sections/` | Collapsible sidebar sections for @expo/ui `TabView` (Swift). Needs a development build. |
| `templates/modules/tab-bar-placement/` | `defaultTabBarPlacement` for @expo/ui `TabView` (Swift). Needs a development build. |
| `templates/src/navigation/config.ts`, `presentation.ts`, `stack-options.ts`, `use-toolbar-icons.ts`, `navbar-store.ts` | Navigation helper layer. `config.ts` requires `assets/images/tab-colored.png`: supply an image or remove `coloredTabIcon`. |
| `templates/src/navigation/use-hinge.ts`, `use-pane-layout.ts`, `templates/src/components/pane-split*.tsx`, `flex-pane-split.tsx` | Hinge geometry and two-pane layout |
| `templates/src/theme.ts` | The palette the pane components import as `@/theme`. Replace it with the app's theme. |
