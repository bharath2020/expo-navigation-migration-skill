package expo.modules.appbarvisibility

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.view.View
import android.view.ViewGroup
import androidx.coordinatorlayout.widget.CoordinatorLayout
import com.google.android.material.appbar.AppBarLayout

/**
 * The top app bar of one react-native-screens native stack screen.
 *
 * react-native-screens lays each stack screen out in a `CoordinatorLayout`: an `AppBarLayout` that
 * holds the header `Toolbar`, and the screen below it with `AppBarLayout.ScrollingViewBehavior`.
 * It gives the toolbar no scroll flags, so the bar cannot collapse. To hide it, this gives the
 * toolbar `SCROLL | EXIT_UNTIL_COLLAPSED` (a Material collapsing app bar) and collapses it with
 * `AppBarLayout.setExpanded(false, animate)`: Material animates the bar's offset and
 * `ScrollingViewBehavior` moves the screen with it, so the content follows the bar up and back
 * down. Once the bar is fully expanded again the flags go back to none, so the screen is laid out
 * exactly as react-native-screens left it (a scrollable bar makes the screen taller by the bar's
 * height, which would push the bottom of the content off screen while the bar shows).
 *
 * Edge to edge, react-native-screens puts the status bar inset in the toolbar's top padding. The
 * toolbar's minimum height is set to that padding while it collapses, so the bar stops at the
 * status bar and the content never slides under it; a status bar scrim in the bar's own background
 * covers the part of the toolbar left under the status bar, as `AppBarLayout.statusBarForeground`
 * does for a `fitsSystemWindows` app bar (that needs the app bar to own the inset, which here the
 * toolbar does). Fully collapsed, that part is made invisible so it takes no taps.
 */
internal class StackAppBar private constructor(private val appBar: AppBarLayout) :
  AppBarLayout.OnOffsetChangedListener {

  private var hidden = false
  private var collapsible = false
  private var minimumHeight = 0
  private var scrim: Drawable? = null

  init {
    appBar.addOnOffsetChangedListener(this)
  }

  fun setHidden(hidden: Boolean, animated: Boolean): Boolean {
    val toolbar = appBar.getChildAt(0) ?: return false
    this.hidden = hidden
    if (hidden) {
      makeCollapsible(toolbar)
      appBar.setExpanded(false, animated)
    } else {
      appBar.setExpanded(true, animated)
    }
    return true
  }

  override fun onOffsetChanged(appBarLayout: AppBarLayout, verticalOffset: Int) {
    val toolbar = appBar.getChildAt(0) ?: return
    if (!hidden && verticalOffset == 0) {
      restore(toolbar)
      return
    }
    scrim?.setBounds(0, 0, (appBar.parent as? View)?.width ?: 0, toolbar.paddingTop)
    // Fully collapsed, what is left of the toolbar sits under the scrim: make it invisible so its
    // buttons cannot be tapped or reached by TalkBack. It keeps its size, so the layout is unchanged.
    val collapsed = collapsible && verticalOffset == -appBar.totalScrollRange
    toolbar.visibility = if (collapsed) View.INVISIBLE else View.VISIBLE
  }

  private fun makeCollapsible(toolbar: View) {
    if (collapsible) return
    val params = toolbar.layoutParams as? AppBarLayout.LayoutParams ?: return
    val coordinator = appBar.parent as? CoordinatorLayout ?: return
    collapsible = true
    minimumHeight = toolbar.minimumHeight
    toolbar.minimumHeight = toolbar.paddingTop
    params.scrollFlags = COLLAPSE_FLAGS
    toolbar.layoutParams = params

    if (toolbar.paddingTop > 0) {
      scrim = (toolbar.background?.constantState?.newDrawable(toolbar.resources)?.mutate()
        ?: ColorDrawable(Color.TRANSPARENT)).also {
        it.setBounds(0, 0, coordinator.width, toolbar.paddingTop)
        coordinator.overlay.add(it)
      }
    }
  }

  private fun restore(toolbar: View) {
    if (!collapsible) return
    collapsible = false
    val params = toolbar.layoutParams as? AppBarLayout.LayoutParams
    toolbar.minimumHeight = minimumHeight
    toolbar.visibility = View.VISIBLE
    if (params != null) {
      params.scrollFlags = NO_FLAGS
      toolbar.layoutParams = params
    }
    scrim?.let { (appBar.parent as? ViewGroup)?.overlay?.remove(it) }
    scrim = null
  }

  companion object {
    private const val NO_FLAGS = 0
    private const val COLLAPSE_FLAGS =
      AppBarLayout.LayoutParams.SCROLL_FLAG_SCROLL or
        AppBarLayout.LayoutParams.SCROLL_FLAG_EXIT_UNTIL_COLLAPSED

    /** The app bar of the native stack screen that contains `view`, if it has one. */
    fun of(view: View): StackAppBar? {
      var parent = view.parent
      while (parent is ViewGroup) {
        if (parent is CoordinatorLayout) {
          val appBar = (0 until parent.childCount)
            .map(parent::getChildAt)
            .firstOrNull { it is AppBarLayout } as AppBarLayout?
          // Kept on the bar itself, so it lives and dies with the screen.
          if (appBar != null) {
            return appBar.getTag(R.id.app_bar_visibility_stack_app_bar) as? StackAppBar
              ?: StackAppBar(appBar).also { appBar.setTag(R.id.app_bar_visibility_stack_app_bar, it) }
          }
        }
        parent = parent.parent
      }
      return null
    }
  }
}
