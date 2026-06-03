require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'FridgeWallSharedData'
  s.version        = package['version']
  s.summary        = package['description']
  s.author         = { 'Gianluca Petri' => '' }
  s.license        = { :type => 'MIT' }
  s.homepage       = 'https://github.com/gianpetrii/fridgewall-app'
  s.platform       = :ios, '13.0'
  s.source         = { git: 'https://github.com/gianpetrii/fridgewall-app.git', tag: s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift,cpp}'
end
