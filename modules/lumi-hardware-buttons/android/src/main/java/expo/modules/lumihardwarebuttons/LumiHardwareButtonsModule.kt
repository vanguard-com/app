package expo.modules.lumihardwarebuttons

import android.view.KeyEvent
import android.view.Window
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reports volume key presses while enabled (camera and review screens) and consumes them, so the
 * system volume does not change. Wraps the activity's Window.Callback, which sees key events
 * regardless of which view has focus.
 */
class LumiHardwareButtonsModule : Module() {
  @Volatile
  private var enabled = false

  override fun definition() = ModuleDefinition {
    Name("LumiHardwareButtons")

    Events("onButtonPress")

    Function("isSupported") { true }

    Function("setEnabled") { value: Boolean ->
      enabled = value
      if (value) attach()
    }

    OnActivityEntersForeground {
      if (enabled) attach()
    }

    OnDestroy {
      enabled = false
      detach()
    }
  }

  private fun attach() {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      val window = activity.window ?: return@runOnUiThread
      val current = window.callback ?: return@runOnUiThread
      if (current is VolumeKeyCallback) return@runOnUiThread
      window.callback = VolumeKeyCallback(current, { enabled }) { button ->
        sendEvent("onButtonPress", mapOf("button" to button))
      }
    }
  }

  private fun detach() {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      val window = activity.window ?: return@runOnUiThread
      val current = window.callback
      if (current is VolumeKeyCallback) window.callback = current.wrapped
    }
  }
}

internal class VolumeKeyCallback(
  val wrapped: Window.Callback,
  private val isEnabled: () -> Boolean,
  private val onPress: (String) -> Unit,
) : Window.Callback by wrapped {
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val button = when (event.keyCode) {
      KeyEvent.KEYCODE_VOLUME_UP -> "volumeUp"
      KeyEvent.KEYCODE_VOLUME_DOWN -> "volumeDown"
      else -> null
    }
    if (button == null || !isEnabled()) return wrapped.dispatchKeyEvent(event)
    // Consume both key down and key up; report one press when the key is released.
    if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) onPress(button)
    return true
  }
}
