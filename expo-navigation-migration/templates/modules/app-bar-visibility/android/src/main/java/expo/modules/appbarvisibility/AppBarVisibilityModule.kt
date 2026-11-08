package expo.modules.appbarvisibility

import android.view.View
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.ui.ModifierRegistry

/**
 * Hides the Android top app bar in both shells:
 *
 * - `setStackAppBarHidden` collapses the react-native-screens native stack header, which is a
 *   Material `AppBarLayout` in a `CoordinatorLayout`, with `AppBarLayout.setExpanded`.
 * - The `nestedScrollOffset` modifier reports a Compose scroll container's scroll offset, read from
 *   Compose nested scrolling, so the @expo/ui shell can hide its `TopAppBar` while scrolling.
 */
class AppBarVisibilityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppBarVisibility")

    OnCreate {
      ModifierRegistry.register(NESTED_SCROLL_OFFSET, nestedScrollOffsetModifier)
    }

    OnDestroy {
      ModifierRegistry.unregister(NESTED_SCROLL_OFFSET)
    }

    /**
     * Collapses (`hidden`) or expands the app bar of the native stack screen that contains the view
     * with `viewTag`. Resolves to false when that screen has no app bar, e.g. `headerShown: false`.
     */
    AsyncFunction("setStackAppBarHidden") { viewTag: Int, hidden: Boolean, animated: Boolean ->
      val view = appContext.findView<View>(viewTag) ?: return@AsyncFunction false
      val appBar = StackAppBar.of(view) ?: return@AsyncFunction false
      appBar.setHidden(hidden, animated)
    }.runOnQueue(Queues.MAIN)
  }
}
