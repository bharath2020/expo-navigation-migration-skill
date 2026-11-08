package expo.modules.appbarvisibility

import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import expo.modules.ui.ModifierFactory

internal const val NESTED_SCROLL_OFFSET = "nestedScrollOffset"

/**
 * `Modifier.nestedScroll` on a parent of a scroll container (a `Box` around a `LazyColumn`), the
 * hook Material 3's `TopAppBarScrollBehavior` uses. It consumes nothing; it adds up the scroll the
 * container itself consumed, drags and flings alike, and sends that offset in dp (0 = top) to JS
 * on every change. It goes on a parent because @expo/ui registers `LazyColumn` without view events,
 * so an event from a modifier on the list itself never reaches JS.
 */
internal val nestedScrollOffsetModifier: ModifierFactory = { _, _, _, eventDispatcher ->
  val density by rememberUpdatedState(LocalDensity.current.density)
  val dispatch by rememberUpdatedState(eventDispatcher)
  val connection = remember {
    object : NestedScrollConnection {
      private var offset = 0f

      override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
        val next = when {
          // Content moving up (scrolling down) is a negative delta.
          consumed.y != 0f -> (offset - consumed.y).coerceAtLeast(0f)
          // Pulling down with nothing left to scroll: the list is at its top. This also corrects
          // the sum when the list re-measures without scrolling (it grows as the bar hides).
          available.y > 0f -> 0f
          else -> offset
        }
        if (next != offset) {
          offset = next
          dispatch(NESTED_SCROLL_OFFSET, mapOf("offset" to offset / density))
        }
        return Offset.Zero
      }
    }
  }
  Modifier.nestedScroll(connection)
}
