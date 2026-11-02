# Mixed content: React Navigation chrome, native body

A screen keeps its Expo Router route, header, back button and guard, and draws only its body with SwiftUI on iOS or Jetpack Compose on Android.

## Status

The columns are the two platforms of the one mixed screen, so this table has no separate @expo/ui shell column.

| Behaviour | iOS: React Navigation + SwiftUI `List` | Android: React Navigation + Compose `LazyColumn` |
| --- | --- | --- |
| Screen renders, chrome and body | verified: iPhone, iPad, iPhone Duo | verified |
| Scroll inside the native stack | verified: iPhone | not exercised |
| Large title collapses on scroll | verified: iPhone | n/a: no large title on Android |
| Large title when pushed from the item screen | verified: iPad | n/a: no large title on Android |
| Tab bar minimizes on scroll | verified: iPhone | not exercised |
| Body changes update the header (star, badge) | verified | not exercised |
| Title change while scrolled | partial: iPhone Duo, list jumps to top | not exercised |
| Safe areas | verified: iPhone, iPhone Duo | not exercised |
| Dynamic Type or font scale | verified: includes accessibility sizes | verified: font scale 1.5 |
| Back guard | verified: back button, swipe | verified: Android back |
| Keyboard over a text field | not exercised: software keyboard stayed hidden | gap: field is covered |
| Opened by deep link as the stack's first screen | partial: iPad, title starts inline | not exercised |

Every `verified` cell ran on a simulator or emulator. Evidence: captures from iPhone, iPad and iPhone Duo simulators and an Android emulator. The iPhone Duo set includes a large accessibility text size, and the Android set includes font scale 1.5. The recorded iOS build for this screen is an incremental Release arm64 simulator build, and the recorded Android build exited 0. Runtime versions are in [verification.md](verification.md).

## The route owns everything except the body

The route file holds the state, the guard, the title and the toolbar. It hands the body plain props and callbacks.

From the prototype: `src/app/(tabs)/(stack)/native-item/[id].tsx`

```tsx
export default function NativeItemDetail() {
  // ...
  const { icon, ready } = useToolbarIcons(toolbarIcons);

  const [favorite, setFavorite] = useState(false);
  const [renames, setRenames] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [folder, setFolder] = useState<Folder>('Inbox');

  const titles = [item.title, `${item.title} (draft)`, 'Quarterly notes', 'Meeting recap'];
  const title = titles[renames % titles.length];
  const rename = () => setRenames(renames + 1);

  // The guard is React Navigation's, so the back button, swipe back and Android back all ask,
  // whatever draws the content.
  usePreventRemove(dirty, ({ repeat }) => {
    Alert.alert('Discard changes?', 'This item has unsaved changes.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setDirty(false);
          repeat();
        },
      },
    ]);
  });

  // ...
  return (
    <>
      <Stack.Title>{title}</Stack.Title>
      <Stack.Screen
        options={{ headerBackTitle: 'Previous', headerBackButtonMenuEnabled: !dirty }}
      />
      {ready ? (
        <Stack.Toolbar placement="right">
          // ...
          <Stack.Toolbar.Button
            icon={icon(favorite ? 'favoriteOn' : 'favoriteOff')}
            tintColor={Platform.OS === 'android' && favorite ? palette.accent : undefined}
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            onPress={() => setFavorite(!favorite)}
          />
          <Stack.Toolbar.Button icon={icon('rename')} accessibilityLabel="Rename" onPress={rename}>
            <Stack.Toolbar.Label>Rename</Stack.Toolbar.Label>
            {renames > 0 ? <Stack.Toolbar.Badge>{String(renames)}</Stack.Toolbar.Badge> : null}
          </Stack.Toolbar.Button>
          // ...
        </Stack.Toolbar>
      ) : null}
      <ItemContent
        item={item}
        title={title}
        favorite={favorite}
        renames={renames}
        dirty={dirty}
        folder={folder}
        folders={folders}
        level={level}
        onRename={rename}
        onFavorite={setFavorite}
        onDirty={setDirty}
        onFolder={(name) => setFolder(folders.find((target) => target === name) ?? folder)}
        onPush={() =>
          router.push({
            pathname: '/native-item/[id]',
            params: { id: nextId, depth: String(level + 1) },
          })
        }
        // ...
        onPop={() => router.back()}
        onPopToTop={() => router.dismissAll()}
      />
    </>
  );
// ...
}
```

The route registers in the tab's ordinary stack. It inherits `headerLargeTitleEnabled` from `stackScreenOptions`.

From the prototype: `src/app/(tabs)/(stack)/_layout.tsx`

```tsx
<Stack screenOptions={stackScreenOptions}>
  <Stack.Screen name="index" options={{ title: 'Stack' }} />
  <Stack.Screen name="item/[id]" options={{ headerLargeTitleEnabled: false }} />
  <Stack.Screen name="native-item/[id]" />
</Stack>
```

## The contract between route and body

From the prototype: `src/components/item-content.types.ts`

```ts
/**
 * What the "Same screen, native content" detail screen hands its body. The route keeps the state
 * and the React Navigation chrome; the body only draws it and reports taps.
 */
export type ItemContentProps = {
  item: Item;
  title: string;
  favorite: boolean;
  renames: number;
  dirty: boolean;
  folder: string;
  folders: readonly string[];
  level: number;
  onRename: () => void;
  onFavorite: (on: boolean) => void;
  onDirty: (on: boolean) => void;
  onFolder: (folder: string) => void;
  onPush: () => void;
  onReplace: () => void;
  onPop: () => void;
  onPopToTop: () => void;
};
```

## iOS body: SwiftUI `List` in a `Host`

iOS resolves `item-content.ios.tsx`. The other platforms resolve `item-content.tsx`.

From the prototype: `src/components/item-content.ios.tsx`

```tsx
return (
  <Host style={{ flex: 1 }}>
    <List>
      <Section>
        <Text modifiers={[font({ textStyle: 'headline' })]}>
          React Navigation + SwiftUI content
        </Text>
        <Text>{item.body}</Text>
        // ...
      </Section>
      <Section
        title="Navbar"
        footer={<Text>The navbar above is React Navigation; this list is SwiftUI.</Text>}>
        <Button
          testID="swiftui-item-rename"
          label={`Rename title (now: ${title})`}
          onPress={onRename}
        />
        <Toggle
          testID="swiftui-item-favorite"
          label="Favorite"
          isOn={favorite}
          onIsOnChange={onFavorite}
        />
        // ...
      </Section>
      <Section title="Note">
        <TextField testID="swiftui-item-note" placeholder="Type to bring up the keyboard" />
      </Section>
      <Section title={`Stack depth ${level}`}>
        <Button testID="swiftui-item-push" label="Push next item" onPress={onPush} />
        // ...
        <Button testID="swiftui-item-pop" label="Pop" onPress={onPop} />
        <Button testID="swiftui-item-pop-to-top" label="Pop to top" onPress={onPopToTop} />
      </Section>
    </List>
  </Host>
);
```

## Android body: Compose `LazyColumn` in a `Host`

From the prototype: `src/components/item-content.tsx`

```tsx
const note = useNativeState('');
// ...
return (
  <Host style={{ flex: 1 }}>
    <LazyColumn modifiers={[fillMaxSize()]}>
      <Row title="React Navigation + Compose content" supporting={item.body} />
      // ...
      <Row
        testID="compose-item-dirty"
        title="Unsaved changes"
        onClick={() => onDirty(!dirty)}
        trailing={<Switch value={dirty} onCheckedChange={onDirty} />}
      />
      // ...
      <Header title="Note" />
      <OutlinedTextField value={note} modifiers={[fillMaxWidth(), padding(16, 0, 16, 8)]}>
        <OutlinedTextField.Placeholder>
          <Text>Type to bring up the keyboard</Text>
        </OutlinedTextField.Placeholder>
      </OutlinedTextField>
      <Header title={`Stack depth ${level}`} />
      <Row testID="compose-item-push" title="Push next item" onClick={onPush} />
      // ...
    </LazyColumn>
  </Host>
);
```

`Row` and `Header` come from `src/expo-ui/compose/rows.tsx`.

## What was observed

- **Scroll and large title.** The SwiftUI `List` scrolls inside the native stack. On iPhone the large title collapses into the inline title and the tab bar minimizes as the list scrolls. UIKit tracks the list's scroll view as it would a React Native `ScrollView`.
- **Title changes.** Renaming while scrolled jumps the list to the top and expands the large title again. Changing the star or the badge leaves the scroll position alone. Seen on the iPhone Duo.
- **Safe areas.** The list starts below the large title and runs under the floating tab bar, like the React Native list. On the iPhone Duo it stays clear of the trailing navbar rail.
- **Dynamic Type.** SwiftUI text follows the content size at once, including accessibility sizes. The segmented picker's labels grow only a little. Compose text follows Android's font scale.
- **Back.** `usePreventRemove` asks before the back button, the iOS swipe and Android back leave the screen, whatever draws the content.
- **Keyboard.** On Android the keyboard covers the focused Compose text field: the screen neither resizes nor scrolls it into view. iOS is unchecked because the simulators' hardware keyboard kept the software keyboard hidden.
- **Deep link.** Opened by deep link as the first screen of the stack on iPad, the title started inline.

## Gotchas

- Gate `Stack.Toolbar` on `ready` from `useToolbarIcons`. Android header icons resolve asynchronously.
- Set `headerBackButtonMenuEnabled: !dirty`. The iOS long-press back menu skips `usePreventRemove`.
- A title that changes while the user reads a scrolled list resets the position. Keep titles stable on long native lists, or test the reset.
- Check any Android form with a Compose text field against the keyboard gap before migrating it.
- The prototype has one mixed screen. Results for other body types are not exercised.

## Migration notes

- Look for detail and settings screens whose body is self-contained. They can change body renderer without changing route, header or guard.
- Move screen state up into the route and pass props, so the header and body read one source.
- Keep existing `usePreventRemove` or equivalent guards in the route. They keep working when the body changes.
- List screens that have text input on Android, and screens that retitle themselves while scrolled. Both need a manual check.
- Run the mixed screen at the largest accessibility text size. The segmented picker grew less than surrounding text.
