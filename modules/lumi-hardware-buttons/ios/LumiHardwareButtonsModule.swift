import AVKit
import ExpoModulesCore

/// Reports volume button presses while Lumi's camera is running, using Apple's
/// AVCaptureEventInteraction (iOS 17.2+). This is the App Store approved way for camera apps to use
/// the volume buttons as a shutter: the system volume does not change and no volume HUD appears.
/// On iOS 16.4 to 17.1 the module reports `isSupported() == false` and does nothing.
public class LumiHardwareButtonsModule: Module {
  private var interaction: UIInteraction?

  public func definition() -> ModuleDefinition {
    Name("LumiHardwareButtons")

    Events("onButtonPress")

    Function("isSupported") { () -> Bool in
      if #available(iOS 17.2, *) {
        return true
      }
      return false
    }

    AsyncFunction("setEnabled") { (enabled: Bool) in
      if enabled {
        self.attach()
      } else {
        self.detach()
      }
    }
    .runOnQueue(.main)

    OnDestroy {
      DispatchQueue.main.async { [weak self] in
        self?.detach()
      }
    }
  }

  private func attach() {
    guard interaction == nil else { return }
    guard #available(iOS 17.2, *) else { return }
    guard let view = appContext?.utilities?.currentViewController()?.view else { return }

    let captureInteraction = AVCaptureEventInteraction { [weak self] event in
      // One press = one event, reported when the button is released.
      guard event.phase == .ended else { return }
      self?.sendEvent("onButtonPress", ["button": "volume"])
    }
    captureInteraction.isEnabled = true
    view.addInteraction(captureInteraction)
    interaction = captureInteraction
  }

  private func detach() {
    guard let current = interaction else { return }
    current.view?.removeInteraction(current)
    interaction = nil
  }
}
