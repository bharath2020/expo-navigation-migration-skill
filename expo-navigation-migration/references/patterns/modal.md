# Modal

A modal is a screen presented over the whole app, tab bar and iPad sidebar included, for a self-contained task that can have its own pushed steps.

## Status

| | React Navigation iOS | React Navigation Android | @expo/ui iOS (SwiftUI) | @expo/ui Android (Compose) |
| --- | --- | --- | --- | --- |
| Default modal | verified: page sheet | verified: full-screen dialog | verified: page-sized sheet only | gap: full-height sheet closest |
| Full-screen modal | verified | verified: looks like default | gap: no `fullScreenCover` | gap: no full-screen dialog |
| Push inside the modal | verified | verified | verified: sheet's `NavigationStack` | partial: push in React state |
| Close from first screen | verified: Close button | verified: system back | verified: sheet Close button | verified: sheet Close button |
| Pop a pushed step | not exercised: flows dismissed instead | verified: system back | verified | partial: app bar arrow only |
| Close whole modal from a step | verified: `parent.goBack()` | not exercised | n/a: no such control | verified: system back only |
| Bottom sheet over the modal | verified: over form sheet | not exercised | n/a: not built | n/a: not built |

Every `verified` cell ran on a simulator or emulator.

## React Navigation (Expo Router + react-native-screens)

### Shared

A modal is a root-stack route. The caller picks the style with a route param. `modalOptions`, the style values and the reason for `useGlobalSearchParams` are in [modal-sheets.md](modal-sheets.md).

From the prototype: `src/app/(tabs)/present/index.tsx`

```tsx
<Row
  testID="open-modal"
  title="Present modal"
  subtitle="Page sheet on iOS, full-screen dialog on Android"
  onPress={() => router.push('/modal')}
/>
<Row
  testID="open-fullscreen-modal"
  title="Present full-screen modal"
  onPress={() => router.push({ pathname: '/modal', params: { style: 'fullScreenModal' } })}
/>
```

From the prototype: `src/app/_layout.tsx`

```tsx
const { style } = useGlobalSearchParams<ModalParams>();
// ...
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  // ...
  <Stack.Screen name="modal" options={modalOptions(style)} />
  // ...
</Stack>
```

The route is a folder with its own `Stack`, so it can push. Its first screen declares the Close button as a navbar item. `useToolbarIcons` is a prototype hook that resolves an SF Symbol on iOS and a Material Symbol image on Android, and reports `ready`.

From the prototype: `src/app/modal/_layout.tsx`

```tsx
const navigation = useNavigation();
const [style] = useState(useGlobalSearchParams<ModalParams>().style);
useLayoutEffect(() => navigation.setOptions(modalOptions(style)), [navigation, style]);
// iOS shows "Close" as text; Android header buttons are icon-only.
const { icon, ready } = useToolbarIcons({ close: { sf: 'xmark', md: 'close' } });
// ...
return (
  <Stack>
    <Stack.Screen name="index" options={{ title: 'Modal' }}>
      {ready ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={Platform.OS === 'android' ? icon('close') : undefined}
            accessibilityLabel="Close"
            onPress={() => router.dismiss()}>
            Close
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
    </Stack.Screen>
    <Stack.Screen name="step" options={{ title: 'Step 2' }} />
  </Stack>
);
```

The first screen pushes on the modal's stack, opens a sheet over the modal, or dismisses.

From the prototype: `src/app/modal/index.tsx`

```tsx
<Row
  testID="modal-push"
  title="Push inside the modal"
  onPress={() => router.push('/modal/step')}
/>
<Row title="Open bottom sheet over the modal" onPress={() => router.push('/sheet')} />
<Row title="Dismiss" onPress={() => router.dismiss()} />
```

A pushed step goes back one screen with `router.back()`, and closes the whole modal through the parent (root) stack.

From the prototype: `src/app/modal/step.tsx`

```tsx
// `router.dismissAll()` would only pop to the modal's first screen; going back on the parent
// (root) stack removes the modal route itself.
const parent = useNavigation().getParent();
// ...
<Row title="Back" onPress={() => router.back()} />
<Row
  testID="modal-dismiss-all"
  title="Dismiss the whole modal"
  onPress={() => parent?.goBack()}
/>
```

### iOS

`modal` is a page sheet. `fullScreenModal` covers the screen. The Close button shows as text.

### Android

`modal` and `fullScreenModal` look the same: a full-screen dialog fragment. The Close button shows as an icon. System back pops the step, then closes the modal.

## @expo/ui

No full-screen modal on either platform. Pushing inside a presented surface works only inside a sheet: see [modal-sheets.md](modal-sheets.md).

### iOS (SwiftUI)

`fullScreenCover` is not exposed. The prototype shows the gap.

From the prototype: `src/expo-ui/swift-ui/present-tab.tsx`

```tsx
<Section title="Full-screen cover">
  {/* Gap: @expo/ui has no fullScreenCover, so there is no SwiftUI full-screen modal. */}
  <Text>
    Gap: @expo/ui has no fullScreenCover. Use the React Navigation shell for that.
  </Text>
</Section>
```

Workaround: present the SwiftUI flow as one Expo Router `fullScreenModal` route. The prototype presents its whole @expo/ui shell this way.

From the prototype: `src/app/_layout.tsx`

```tsx
<Stack.Screen
  name="expo-ui"
  options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
/>
```

### Android (Compose)

@expo/ui's Compose set has no full-screen dialog. The closest native piece is a fully expanded `ModalBottomSheet`, in [modal-sheets.md](modal-sheets.md).

From the prototype: `src/expo-ui/compose/screens.tsx`

```tsx
<Header title="Full-screen cover" />
<Row title="Gap: @expo/ui has no full-screen dialog. Use the React Navigation shell for that." />
```

## Gotchas

- `router.dismissAll()` from a pushed step leaves the modal open on its first screen. It pops only the inner stack. Call `useNavigation().getParent()?.goBack()` to remove the modal route.
- A text-only header button renders nothing on Android. Android header items are icon-only image sources. Pass an `icon` on Android and mount the toolbar once `useToolbarIcons` reports `ready`.
- A design that expects `modal` and `fullScreenModal` to differ on Android gets two identical screens. Both are full screen. Accept it.

## Migration notes

- Look for `presentation: 'modal'` or `'fullScreenModal'` on stack screens, and for navigator groups that hold modals. Each maps to a root-stack route plus a `modalOptions(style)` helper.
- Look for React Native's `Modal` component or a JavaScript modal library wrapping a screen. Move the content to a route so the modal gets native presentation and a URL. Use a folder route with its own `Stack` when the modal has steps.
- Look for stack resets or nested-navigator `goBack` calls used to close a multi-step modal. They map to `router.dismiss()` on the first screen and `parent?.goBack()` on deeper screens.
- A legacy full-screen modal targeting @expo/ui has no direct equivalent. Keep the Expo Router `fullScreenModal` route and host the @expo/ui content inside it.
