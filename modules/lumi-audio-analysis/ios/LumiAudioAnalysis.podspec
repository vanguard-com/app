Pod::Spec.new do |s|
  s.name = 'LumiAudioAnalysis'
  s.version = '1.0.0'
  s.summary = 'Local audio extraction for Lumi voice feedback'
  s.description = 'Decodes recorded video audio into temporary mono PCM chunks. No microphone capture or networking.'
  s.author = 'Lumi'
  s.homepage = 'https://github.com/vanguard-com/app'
  s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { git: 'https://github.com/vanguard-com/app.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = "**/*.{h,m,mm,swift}"
end
