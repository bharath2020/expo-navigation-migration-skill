# Modal sheets: page, form, full screen

A modal sheet is a modal presented at page, form or full-screen size with its own navigation bar and pushes, for a task that should keep the caller's context visible or fit a form-sized card on iPad.

## Status

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Page sheet with navbar | verified | partial: falls back to modal | verified: `presentationSizing('page')` | partial: full-height `ModalBottomSheet` |
| Form sheet with navbar | verified: iPad centred after fix | partial: falls back to modal | verified: `presentationSizing('form')` | partial: same full-height sheet |
| Full screen | verified | verified: looks like modal | gap: no `fullScreenCover` | gap: no full-screen dialog |
| Push inside the sheet | verified | verified: inside fallback modal | verified: own `NavigationStack` | partial: push in React state |
| System back on a pushed step | n/a | verified: pops the step | n/a | gap: dismisses whole sheet |
| Block dismissal while dirty | not exercised | not exercised | partial: `interactiveDismissDisabled`, swipe block unconfirmed | partial: sheet `properties`, back, scrim, swipe unconfirmed |
| First-mount style rule | verified: iPad after fix | n/a: all fall back | n/a: state-driven sizing | n/a: one sheet style |

Every `verified` cell ran on a simulator or emulator.

## React Navigation (Expo Router + react-native-screens)

### Shared

All styles use the same `/modal` route from [modal.md](modal.md). The caller picks the style, and one helper holds the platform fallbacks.

From the prototype: `src/app/(tabs)/present/index.tsx`

```tsx
onPress={() => router.push({ pathname: '/modal', params: { style: 'fullScreenModal' } })}
// ...
onPress={() => router.push({ pathname: '/modal', params: { style: 'pageSheet' } })}
// ...
onPress={() => router.push({ pathname: '/modal', params: { style: 'formSheet' } })}
```

From the prototype: `src/navigation/presentation.ts`

```ts
export type ModalStyle = 'modal' | 'fullScreenModal' | 'pageSheet' | 'formSheet';
// ...
export type ModalParams = { style?: ModalStyle };
// ...
export function modalOptions(style: ModalStyle = 'modal'): NativeStackNavigationOptions {
  if (style === 'formSheet') {
    if (Platform.OS !== 'ios') return { presentation: 'modal', headerShown: false };
    return { presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [1] };
  }
  return { presentation: style, headerShown: false };
}
```

**First-mount style rule.** The presentation must be correct on the modal's first mount. Two pieces enforce it. The root layout reads `?style=` from the URL, because the `modal` route's own params never carry it.

From the prototype: `src/app/_layout.tsx`

```tsx
// `?style=` belongs to the modal's first screen, so the `modal` route's own params never carry
// it. The URL does, and the presentation has to be right on the modal's first mount: an iPad
// form sheet first mounted as another style keeps page-sheet sizing.
const { style } = useGlobalSearchParams<ModalParams>();
// ...
<Stack.Screen name="modal" options={modalOptions(style)} />
```

The modal's layout then pins that first value, because the URL changes as the inner stack pushes or a sheet opens over the modal.

From the prototype: `src/app/modal/_layout.tsx`

```tsx
// The root layout presents the modal in the `?style=` the URL had when it opened. The URL changes
// as the inner stack pushes or a sheet opens over the modal, so this layout pins that first value
// on its own route (`setOptions` wins over the root's screen options).
const navigation = useNavigation();
const [style] = useState(useGlobalSearchParams<ModalParams>().style);
useLayoutEffect(() => navigation.setOptions(modalOptions(style)), [navigation, style]);
```

### iOS

`pageSheet` and `formSheet` are UIKit sheets hosting the modal's native stack and navbar. On iPad a form sheet is a centred, form-sized card and a page sheet is wider. On iPhone they look alike.

### Android

`pageSheet` falls back to `modal` inside react-native-screens. `formSheet` is a Material bottom sheet that cannot host a header or nested stack, so the helper returns `modal`. Every style opens as the full-screen modal with its own app bar and pushes.

## @expo/ui

### iOS (SwiftUI)

A `BottomSheet` whose content is a `NavigationStack`. A sheet is its own presentation context, so it needs its own stack for a navigation bar and pushes. `presentationSizing` picks page or form. One `BottomSheet` serves both, with the size in state.

From the prototype: `src/expo-ui/swift-ui/present-tab.tsx`

```tsx
const [modal, setModal] = useState<'page' | 'form'>();
// ...
<BottomSheet
  isPresented={modal !== undefined}
  onIsPresentedChange={(presented) => {
    if (!presented) setModal(undefined);
  }}
  anchor={
    <Button
      testID="expo-ui-open-modal"
      label="Open page sheet"
      onPress={() => setModal('page')}
    />
  }>
  <ModalSheet sizing={modal ?? 'page'} onClose={() => setModal(undefined)} />
</BottomSheet>
<Button
  testID="expo-ui-open-form-sheet"
  label="Open form sheet"
  onPress={() => setModal('form')}
/>
```

The content holds the path in state, and disables swipe-down while dirty. `confirmDiscard` is a prototype helper: it runs the action, or asks first through `Alert.alert` when dirty.

From the prototype: `src/expo-ui/swift-ui/present-tab.tsx`

```tsx
function ModalSheet({ sizing, onClose }: { sizing: 'page' | 'form'; onClose: () => void }) {
  const [path, setPath] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  // ...
  return (
    <NavigationStack
      path={path}
      onPathChange={setPath}
      modifiers={[presentationSizing(sizing), interactiveDismissDisabled(dirty)]}>
      <Toolbar modifiers={[navigationTitle(sizing === 'page' ? 'Page sheet' : 'Form sheet')]}>
        <List>
          <Section>
            // ...
            <NavigationLink testID="expo-ui-modal-push" value="step-2">
              <Text>Push step 2</Text>
            </NavigationLink>
          </Section>
          <Section footer={<Text>On: swipe-down is disabled and Close asks first.</Text>}>
            <Toggle
              testID="expo-ui-modal-dirty"
              label="Unsaved sheet changes"
              isOn={dirty}
              onIsOnChange={setDirty}
            />
          </Section>
        </List>
        <Toolbar.Content>
          // ...
          <ToolbarItem placement="topBarTrailing">
            <Button
              testID="expo-ui-modal-close"
              label="Close"
              onPress={() => confirmDiscard(dirty, onClose)}
            />
          </ToolbarItem>
        </Toolbar.Content>
      </Toolbar>
      <NavigationDestination value="step-2">
        <Toolbar modifiers={[navigationTitle('Step 2')]}>
          <List>
            <Text>Pushed inside the sheet&apos;s own stack.</Text>
            <Button
              testID="expo-ui-modal-pop"
              label="Back to sheet root"
              onPress={() => setPath([])}
            />
          </List>
          // ...
        </Toolbar>
      </NavigationDestination>
    </NavigationStack>
  );
// ...
}
```

Full screen is a gap: see [modal.md](modal.md).

### Android (Compose)

@expo/ui's Compose set has no page sheet with its own navigation stack. The closest native piece is a fully expanded `ModalBottomSheet` holding a `TopAppBar`, with the one-step push in React state. There is one size, and page and form do not differ. `ShellIcon` is a prototype icon helper.

From the prototype: `src/expo-ui/compose/sheets.tsx`

```tsx
export function ModalSheetDemo({ onClose }: { onClose: () => void }) {
  const ref = useRef<ModalBottomSheetRef>(null);
  const [pushed, setPushed] = useState(false);
  const [dirty, setDirty] = useState(false);
  // ...
  const close = () =>
    confirmDiscard(dirty, async () => {
      await ref.current?.hide();
      onClose();
    });
  // ...
  return (
    <ModalBottomSheet
      ref={ref}
      onDismissRequest={onClose}
      skipPartiallyExpanded
      showDragHandle={false}
      sheetGesturesEnabled={!dirty}
      properties={{ shouldDismissOnBackPress: !dirty, shouldDismissOnClickOutside: !dirty }}>
      {/* Full height so it reads as a page sheet rather than a content-sized bottom sheet. */}
      <Column modifiers={[fillMaxWidth(), fillMaxHeight(), padding(0, 0, 0, 24)]}>
        <TopAppBar windowInsets={{}}>
          <TopAppBar.NavigationIcon>
            <IconButton
              onClick={pushed ? () => setPushed(false) : close}
              modifiers={[testTag(pushed ? 'expo-ui-modal-pop' : 'expo-ui-modal-close')]}>
              <ShellIcon name={pushed ? 'back' : 'close'} label={pushed ? 'Back' : 'Close'} />
            </IconButton>
          </TopAppBar.NavigationIcon>
          <TopAppBar.Title>
            <Text style={{ typography: 'titleLarge' }}>{pushed ? 'Step 2' : 'Modal sheet'}</Text>
          </TopAppBar.Title>
          // ...
        </TopAppBar>
        // ...
      </Column>
      // ...
    </ModalBottomSheet>
  );
// ...
}
```

The shell mounts the sheet only while it is open.

From the prototype: `src/expo-ui/shell.android.tsx`

```tsx
{sheet === 'modal' ? <ModalSheetDemo onClose={() => setSheet(undefined)} /> : null}
```

## Gotchas

- An iPad form sheet shows at page-sheet size. Cause: it first mounted as another style, and react-native-screens keeps that sizing. Fix: read `?style=` in the root layout and pin it in the modal's layout, as in the first-mount rule above.
- Requested styles are ignored at root level. Cause: `?style=` never reaches the `modal` route's params, because it belongs to the modal's first screen. Fix: `useGlobalSearchParams`.
- An Android `formSheet` shows no header and cannot nest a stack. Cause: it is a Material bottom sheet. Fix: present `modal` on Android, or put the title and actions in the sheet's content.
- Compose: system back on Step 2 closes the whole sheet instead of popping. Cause: `ModalBottomSheet` is its own window. Workaround: pop with the app bar's back arrow. While dirty, back, scrim taps and swipes are off and Close asks first.
- SwiftUI: a `BottomSheet` without its own `NavigationStack` has no navigation bar or pushes. Fix: make `NavigationStack` the sheet's content, and put `presentationSizing` on it.
- SwiftUI: there is no way to intercept the back button of the sheet's own stack. Only pops that the screen starts itself can confirm.
- iOS sheets can fail to open right after another closes: see [bottom-sheet.md](bottom-sheet.md).

## Migration notes

- Look for `presentation: 'pageSheet'` or `'formSheet'`, and iPad-specific modal sizing. Map them to the `style` param on one modal route, with fallbacks in one helper.
- Look for screens that set their presentation after mount or change it from route state. Move the decision to first mount, or iPad sizing stays wrong.
- Android parity for a sheet with a header: on React Navigation, expect the full-screen modal. On @expo/ui, expect the full-height `ModalBottomSheet`, and redesign any flow that needs system back to pop inside it.
- Look for unsaved-change guards on modals. For @expo/ui, map them to `interactiveDismissDisabled` on iOS and `sheetGesturesEnabled` plus `properties` on Android. React Navigation sheet guards were not exercised here, so verify them after migrating.
