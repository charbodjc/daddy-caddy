#!/usr/bin/env ruby

require 'xcodeproj'

# Open the project
project_path = 'ios/GolfTracker.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Font file names to remove
font_files = [
  'AntDesign.ttf',
  'Entypo.ttf',
  'EvilIcons.ttf',
  'Feather.ttf',
  'FontAwesome.ttf',
  'FontAwesome5_Brands.ttf',
  'FontAwesome5_Regular.ttf',
  'FontAwesome5_Solid.ttf',
  'FontAwesome6_Brands.ttf',
  'FontAwesome6_Regular.ttf',
  'FontAwesome6_Solid.ttf',
  'Fontisto.ttf',
  'Foundation.ttf',
  'Ionicons.ttf',
  'MaterialCommunityIcons.ttf',
  'MaterialIcons.ttf',
  'Octicons.ttf',
  'SimpleLineIcons.ttf',
  'Zocial.ttf'
]

# Remove font files from all targets
project.targets.each do |target|
  if target.name == 'GolfTracker'
    # Remove from resources build phase
    target.resources_build_phase.files.delete_if do |file|
      if file.file_ref
        font_files.include?(File.basename(file.file_ref.path))
      end
    end
    
    # Remove from copy files build phases
    target.copy_files_build_phases.each do |phase|
      phase.files.delete_if do |file|
        if file.file_ref
          font_files.include?(File.basename(file.file_ref.path))
        end
      end
    end
  end
end

# Remove font file references from the project
project.main_group.recursive_children.delete_if do |child|
  if child.is_a?(Xcodeproj::Project::Object::PBXFileReference)
    font_files.include?(File.basename(child.path))
  end
end

# Save the project
project.save

puts "Successfully removed font file references from Xcode project"

