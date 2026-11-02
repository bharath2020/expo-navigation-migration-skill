import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

export type ModalStyle = 'modal' | 'fullScreenModal' | 'pageSheet' | 'formSheet';
export type SheetDetents = 'detents' | 'fit';

/** Params a screen passes to `router.push('/modal', ...)` to pick the presentation. */
export type ModalParams = { style?: ModalStyle };
/** Params a screen passes to `router.push('/sheet', ...)` to pick the sheet sizing. */
export type SheetParams = { detents?: SheetDetents };

/**
 * Root stack options for `/modal`. The modal route has its own stack inside, so the root header
 * is hidden and the inner stack draws the modal's navbar.
 *
 * `pageSheet` falls back to `modal` on Android inside react-native-screens. Android `formSheet` is a
 * Material bottom sheet that cannot host a nested stack or header, so it falls back to `modal` here.
 * On iPad a `formSheet` is the centred, form-sized sheet; on iPhone it is a full-height sheet.
 */
// #region view-code:rn-modal
export function modalOptions(style: ModalStyle = 'modal'): NativeStackNavigationOptions {
  if (style === 'formSheet') {
    if (Platform.OS !== 'ios') return { presentation: 'modal', headerShown: false };
    return { presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [1] };
  }
  return { presentation: style, headerShown: false };
}
// #endregion view-code:rn-modal

/**
 * Root stack options for `/sheet`: a native form sheet - `UISheetPresentationController` detents on
 * iOS, a Material `BottomSheetBehavior` sheet on Android.
 */
// #region view-code:rn-sheet
export function sheetOptions(params: object | undefined): NativeStackNavigationOptions {
  const { detents = 'detents' } = (params ?? {}) as SheetParams;
  return {
    presentation: 'formSheet',
    headerShown: false,
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    sheetAllowedDetents: detents === 'fit' ? 'fitToContents' : [0.3, 0.6, 1],
    sheetInitialDetentIndex: 0,
    sheetLargestUndimmedDetentIndex: detents === 'fit' ? 'none' : 0,
  };
}
// #endregion view-code:rn-sheet
