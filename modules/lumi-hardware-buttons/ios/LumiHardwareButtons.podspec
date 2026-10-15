Pod::Spec.new do |s|
  s.name           = 'LumiHardwareButtons'
  s.version        = '1.0.0'
  s.summary        = 'Volume button presses as camera capture events for Lumi'
  s.description    = 'Uses AVCaptureEventInteraction (iOS 17.2+) to receive volume button presses while the camera runs.'
  s.author         = 'Lumi'
  s.homepage       = 'https://github.com/vanguard-com/app'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/vanguard-com/app.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
