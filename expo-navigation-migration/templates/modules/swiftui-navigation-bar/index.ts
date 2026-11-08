import { createModifier } from '@expo/ui/swift-ui/modifiers';
import { requireOptionalNativeModule } from 'expo';

// Loads the native module, whose `OnCreate` registers the modifier before a screen uses it.
requireOptionalNativeModule('SwiftUINavigationBar');

/**
 * Hides or shows the navigation bar of the `NavigationStack` screen it is applied to. It drives the
 * stack's `UINavigationController` (`setNavigationBarHidden`) and lays the screen out in the same
 * animation, so the List does not jump the way it does with SwiftUI's
 * `toolbarVisibility(.hidden, for: .navigationBar)`. @expo/ui 58 has no toolbar visibility modifier,
 * so this local module registers one with @expo/ui's modifier registry.
 */
export const navigationBarHidden = (hidden: boolean) =>
  createModifier('navigationBarHidden', { hidden });
