import { PixelRatio, Platform, useWindowDimensions } from 'react-native';

/** A physical hinge between two screens, in dp from the window's top-left corner. */
export type Hinge = {
  /** `vertical` when the screens sit side by side, `horizontal` when one is above the other. */
  orientation: 'vertical' | 'horizontal';
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Dual-screen devices whose hinge is a gap with no pixels. Each screen's size and the hinge width
 * are in pixels, measured in the device's portrait orientation.
 */
const dualScreenDevices = [
  { name: 'Surface Duo', screen: { width: 1350, height: 1800 }, hingeWidth: 84 },
  { name: 'Surface Duo 2', screen: { width: 1344, height: 1892 }, hingeWidth: 66 },
] as const;

/**
 * Where the hinge cuts the window, or `null` when the window is on one screen or the device has no
 * hinge gap.
 *
 * Android reports an app spanned across a Surface Duo as one wide window, and React Native exposes
 * no hinge bounds, so the hinge is derived from the device table above: the window is spanned when
 * it is exactly two screens plus the hinge wide (or tall, when the device is rotated).
 */
export function useHinge(): Hinge | null {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'android' || Platform.constants.Manufacturer !== 'Microsoft') {
    return null;
  }
  const scale = PixelRatio.get();
  const widthPx = Math.round(width * scale);
  const heightPx = Math.round(height * scale);
  for (const device of dualScreenDevices) {
    const spannedPx = device.screen.width * 2 + device.hingeWidth;
    if (widthPx === spannedPx) {
      return {
        orientation: 'vertical',
        x: device.screen.width / scale,
        y: 0,
        width: device.hingeWidth / scale,
        height,
      };
    }
    if (heightPx === spannedPx) {
      return {
        orientation: 'horizontal',
        x: 0,
        y: device.screen.width / scale,
        width,
        height: device.hingeWidth / scale,
      };
    }
  }
  return null;
}
