# Overflow Menu
A navbar button that opens a native menu of actions with checkmarks, sections, submenus and destructive items; an app needs this when a screen has more actions than the bar can hold.

## Status
| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Menu opens from a navbar button | verified, `UIMenu` | verified, Material dropdown | verified, `Menu` | verified, `DropdownMenu` |
| Checkmark item | verified, `isOn` | verified, trailing checkmark | verified, `Toggle` | verified, trailing checkmark |
| Section | verified, titled | partial, divider without title | verified, `Section` | partial, dividers only |
| Submenu | verified | verified, cascading | verified, nested `Menu` | partial, replaces list in place |
| Destructive item | verified | verified | verified, `role` | verified, error colour |
| Disabled item | verified, Delete | partial, see Gotchas | not exercised, no implementation | verified, Delete |
| Item subtitle | verified | gap, not shown | not exercised, no implementation | not exercised, no implementation |
| `hidden` item | not exercised | not exercised | n/a, not used | n/a, not used |
| Disabled whole submenu | not exercised | not exercised | n/a, not used | n/a, not used |

Every `verified` cell ran on a simulator or emulator.

## React Navigation (Expo Router + react-native-screens)
### Shared
`Stack.Toolbar.Menu` goes inside `Stack.Toolbar`. `isOn` draws a checkmark, `inline` makes a section, a nested `Menu` is a submenu, and `destructive`, `disabled` and `subtitle` style an action. The `icon` comes from `useToolbarIcons` (see `navbar-buttons.md`).

From the prototype: `src/app/(tabs)/(stack)/item/[id].tsx`
```tsx
<Stack.Toolbar.Menu icon={icon('menu')} accessibilityLabel="Item actions">
  // ...
  <Stack.Toolbar.MenuAction
    subtitle={`Next: ${titles[(renames + 1) % titles.length]}`}
    onPress={rename}>
    Rename title
  </Stack.Toolbar.MenuAction>
  <Stack.Toolbar.MenuAction isOn={dirty} onPress={() => setDirty(!dirty)}>
    Unsaved changes
  </Stack.Toolbar.MenuAction>
  <Stack.Toolbar.Menu inline title="Share">
    <Stack.Toolbar.MenuAction onPress={() => setLastAction('Copied link')}>
      Copy link
    </Stack.Toolbar.MenuAction>
    <Stack.Toolbar.MenuAction onPress={() => setLastAction('Duplicated')}>
      Duplicate
    </Stack.Toolbar.MenuAction>
  </Stack.Toolbar.Menu>
  <Stack.Toolbar.Menu title="Move to">
    {folders.map((target) => (
      <Stack.Toolbar.MenuAction
        key={target}
        isOn={folder === target}
        onPress={() => setFolder(target)}>
        {target}
      </Stack.Toolbar.MenuAction>
    ))}
  </Stack.Toolbar.Menu>
  <Stack.Toolbar.MenuAction
    destructive
    disabled={favorite}
    subtitle={favorite ? 'Unfavorite to delete' : undefined}
    onPress={confirmDelete}>
    Delete
  </Stack.Toolbar.MenuAction>
// ...
</Stack.Toolbar.Menu>
```

`disabled` on `Menu` and `hidden` on `MenuAction` also follow state.

From the prototype: `src/app/(tabs)/navbar/index.tsx`
```tsx
<Stack.Toolbar.Menu icon={icon('menu')} accessibilityLabel="Navbar actions">
  // ...
  <Stack.Toolbar.MenuAction disabled={!canAdd} onPress={() => navbarItems.add()}>
    Add button
  </Stack.Toolbar.MenuAction>
  <Stack.Toolbar.Menu title="Add specific button" disabled={!canAdd}>
    {missing.map((item) => (
      <Stack.Toolbar.MenuAction
        key={item.id}
        onPress={() => navbarItems.add(item.id)}>
        {item.title}
      </Stack.Toolbar.MenuAction>
    ))}
  </Stack.Toolbar.Menu>
  // ...
  <Stack.Toolbar.MenuAction
    hidden={Platform.OS !== 'ios'}
    isOn={largeTitle}
    onPress={() => setLargeTitle(!largeTitle)}>
    Large title
  </Stack.Toolbar.MenuAction>
  <Stack.Toolbar.MenuAction
    destructive
    disabled={items.length === 0}
    onPress={() => navbarItems.removeLast()}>
    Remove last button
  </Stack.Toolbar.MenuAction>
// ...
</Stack.Toolbar.Menu>
```

### iOS
`UIMenu`. All props in the first snippet draw as named: subtitle as a second line, inline section with its title.

### Android
Material dropdown drawn with Compose. Same code. Submenus cascade. An inline section shows as a divider and `subtitle` is not drawn.

## @expo/ui
### iOS (SwiftUI)
A `Menu` in a `ToolbarItem`. A `Toggle` draws the checkmark, `Section` groups, a nested `Menu` is a submenu, and `role="destructive"` styles an item.

From the prototype: `src/expo-ui/swift-ui/item-detail.tsx`
```tsx
<ToolbarItem placement="topBarTrailing">
  <Menu testID={testID('more')} label="More" systemImage="ellipsis.circle">
    // ...
    <Toggle label="Unsaved changes" isOn={dirty} onIsOnChange={setDirty} />
    <Button label="Rename" systemImage="pencil" onPress={() => setRenames((n) => n + 1)} />
    <Section title="Navigate">
      <Button label="Pop to root" systemImage="arrow.up.to.line" onPress={popToRoot} />
      // ...
    </Section>
    <Menu label="Move to" systemImage="folder">
      {/* A Toggle in a menu is drawn with the system checkmark, like `isOn` in React Navigation. */}
      {folders.map((name) => (
        <Toggle
          key={name}
          label={name}
          isOn={folder === name}
          onIsOnChange={() => setFolder(name)}
        />
      ))}
    </Menu>
    <Button role="destructive" label="Delete" systemImage="trash" onPress={pop} />
  // ...
  </Menu>
</ToolbarItem>
```

### Android (Compose)
The shell declares entries as data.

From the prototype: `src/expo-ui/shell.android.tsx`
```tsx
const exitEntry: MenuEntry = { label: 'React Navigation', onClick: exit, dividerBefore: !!top };
const menu: MenuEntry[] =
  item && top
    ? [
        {
          label: 'Unsaved changes',
          checked: top.dirty,
          onClick: () => changeTop({ dirty: !top.dirty }),
        },
        { label: 'Rename', onClick: () => changeTop({ renames: top.renames + 1 }) },
        { label: 'Pop to root', onClick: popToRoot, dividerBefore: true },
        {
          label: 'Move to',
          submenu: folders.map((folder) => ({
            label: folder,
            checked: top.folder === folder,
            onClick: () => changeTop({ folder }),
          })),
        },
        // Like the React Navigation shell, a favorite cannot be deleted until it is unfavorited.
        {
          label: 'Delete',
          destructive: true,
          disabled: isFavorite,
          onClick: pop,
          dividerBefore: true,
        },
        exitEntry,
      ]
    : [exitEntry];
```

`OverflowMenu` renders those entries as a Material `DropdownMenu`. A submenu replaces the list, with a back entry on top.

From the prototype: `src/expo-ui/compose/overflow-menu.tsx`
```tsx
export type MenuEntry = {
  label: string;
  onClick?: () => void;
  /** Set for a check toggle or a choice: a checkmark shows when it is on. */
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Draws a divider above the entry, the Material way to group menu items. */
  dividerBefore?: boolean;
  /** Entries of a nested menu opened from this one. */
  submenu?: readonly MenuEntry[];
};
// ...
export function OverflowMenu({ entries }: { entries: readonly MenuEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const [parent, setParent] = useState<MenuEntry>();
  const colors = useMaterialColors();
  const close = () => {
    setExpanded(false);
    setParent(undefined);
  };
  // Gap: Compose's DropdownMenu has no cascading submenus, so a nested menu replaces the items in
  // place with a back entry on top.
  const shown = parent?.submenu ?? entries;

  return (
    <DropdownMenu expanded={expanded} onDismissRequest={close}>
      <DropdownMenu.Trigger>
        <IconButton onClick={() => setExpanded(true)} modifiers={[testTag('expo-ui-overflow')]}>
          <ShellIcon name="more" label="More options" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {parent ? (
          <>
            <DropdownMenuItem onClick={() => setParent(undefined)}>
              <DropdownMenuItem.LeadingIcon>
                <ShellIcon name="back" />
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text>{parent.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
            <HorizontalDivider />
          </>
        ) : null}
        {shown.map((entry) => (
          <Fragment key={entry.label}>
            {entry.dividerBefore ? <HorizontalDivider /> : null}
            <DropdownMenuItem
              enabled={!entry.disabled}
              modifiers={[
                testTag(`expo-ui-menu-${entry.label.toLowerCase().replace(/\s+/g, '-')}`),
              ]}
              onClick={() => {
                if (entry.submenu) {
                  setParent(entry);
                  return;
                }
                close();
                entry.onClick?.();
              }}>
              <DropdownMenuItem.Text>
                <Text color={entry.destructive && !entry.disabled ? colors.error : undefined}>
                  {entry.label}
                </Text>
              </DropdownMenuItem.Text>
              {/* A trailing checkmark marks the on state, as in the React Navigation shell's menu.
                  The slot stays mounted and only the icon toggles: a Compose slot added after the
                  first render is not picked up. */}
              {entry.checked !== undefined || entry.submenu ? (
                <DropdownMenuItem.TrailingIcon>
                  {entry.submenu || entry.checked ? (
                    <ShellIcon name={entry.submenu ? 'submenu' : 'checkmark'} />
                  ) : null}
                </DropdownMenuItem.TrailingIcon>
              ) : null}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}
```

## Gotchas
- React Navigation Android, a disabled destructive `MenuAction` looks enabled. A capture with Delete disabled (`favorite` on) shows it drawn red. The verification notes list `disabled` as working, but the capture does not show a disabled look. Test that a tap is ignored before relying on it.
- React Navigation Android, inline section title is missing. It draws as a divider. The prototype has no workaround.
- React Navigation Android, `subtitle` is missing. Keep needed information out of subtitles, such as `Unfavorite to delete`.
- @expo/ui Android, no cascading submenu. Compose's `DropdownMenu` has none. Replace the list in place with a back entry.
- @expo/ui Android, trailing checkmark does not appear when added later. A Compose slot added after first render is not picked up. Set `checked` to a boolean from the start, so the slot mounts, and toggle only the icon.
- @expo/ui Android, destructive has no prop in this menu. Colour the `Text` with `colors.error` while the entry is enabled.
- Children of a React Navigation menu follow the toolbar child rules in `navbar-buttons.md`.

## Migration notes
- `@react-native-menu/menu` or a JS popover opened from `headerRight` -> `Stack.Toolbar.Menu` with `Stack.Toolbar.MenuAction`.
- Action sheets used as a screen's overflow -> `Stack.Toolbar.Menu`. Check marks tracked by hand -> `isOn`.
- Menu items built from an options array -> `.map(...)` of `MenuAction`. Fragments are not read.
- Menus whose Android layout relies on section titles or item subtitles -> move that text into item labels.
- @expo/ui Compose target -> a `MenuEntry[]` array passed to a shared `OverflowMenu`, as in the snippet.
