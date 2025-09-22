#!/usr/bin/env ruby

# Fix for iOS 18 crash with setSheetLargestUndimmedDetent
# This script patches react-native-screens to comment out the problematic code

require 'fileutils'

def patch_rn_screens
  file_path = "../node_modules/react-native-screens/ios/RNSScreen.mm"
  
  if File.exist?(file_path)
    content = File.read(file_path)
    
    # Check if already patched
    if content.include?("// Commented out due to iOS 18 compatibility issue")
      puts "✅ RNSScreen.mm already patched for iOS 18"
      return
    end
    
    # Find and comment out the problematic block
    original = <<~ORIGINAL
  if (newScreenProps.sheetLargestUndimmedDetent != oldScreenProps.sheetLargestUndimmedDetent) {
    [self setSheetLargestUndimmedDetent:
              [RNSConvert RNSScreenDetentTypeFromLargestUndimmedDetent:newScreenProps.sheetLargestUndimmedDetent]];
  }
    ORIGINAL
    
    patched = <<~PATCHED
  // Commented out due to iOS 18 compatibility issue - causes crash
  // if (newScreenProps.sheetLargestUndimmedDetent != oldScreenProps.sheetLargestUndimmedDetent) {
  //   [self setSheetLargestUndimmedDetent:
  //             [RNSConvert RNSScreenDetentTypeFromLargestUndimmedDetent:newScreenProps.sheetLargestUndimmedDetent]];
  // }
    PATCHED
    
    if content.include?(original.strip)
      content.gsub!(original.strip, patched.strip)
      File.write(file_path, content)
      puts "✅ Patched RNSScreen.mm for iOS 18 compatibility"
    else
      puts "⚠️  Could not find exact match to patch in RNSScreen.mm"
      puts "    Attempting alternative patch..."
      
      # Try to find and comment out any line with setSheetLargestUndimmedDetent
      if content =~ /^(\s*if\s*\(.*sheetLargestUndimmedDetent.*\)\s*\{[\s\S]*?setSheetLargestUndimmedDetent:[\s\S]*?\})/m
        full_match = $1
        commented = full_match.lines.map { |line| "  // #{line}" }.join
        content.gsub!(full_match, "  // Commented out due to iOS 18 compatibility issue\n#{commented}")
        File.write(file_path, content)
        puts "✅ Applied alternative patch to RNSScreen.mm"
      else
        puts "❌ Could not patch RNSScreen.mm - manual intervention needed"
      end
    end
  else
    puts "❌ RNSScreen.mm not found at #{file_path}"
  end
end

patch_rn_screens
