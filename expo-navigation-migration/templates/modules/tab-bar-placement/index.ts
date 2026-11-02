import { createModifier } from '@expo/ui/swift-ui/modifiers';
import { requireOptionalNativeModule } from 'expo';

// Loads the native module, whose `OnCreate` registers the modifier before a `TabView` uses it.
requireOptionalNativeModule('TabBarPlacement');

/**
 * SwiftUI's `defaultTabBarPlacement` (iOS 27): which of the sidebar and the tab bar a
 * `sidebarAdaptable` `TabView` shows when only one of them can show, as on an unfolded iPhone Duo.
 * The counterpart of `NativeTabs` `preferredPlacement`. @expo/ui 58 does not ship it, so this local
 * module registers it with @expo/ui's modifier registry. No effect before iOS 27 or on iPadOS.
 */
export const defaultTabBarPlacement = (placement: 'automatic' | 'sidebar' | 'tabBar') =>
  createModifier('defaultTabBarPlacement', { placement });
