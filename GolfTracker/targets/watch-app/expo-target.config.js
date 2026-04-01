/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "watch",
  name: "Daddy Caddy",
  bundleIdentifier: ".watch-app",
  icon: "./Assets.xcassets/AppIcon.appiconset/AppIcon.png",
  frameworks: ["SwiftUI", "WatchConnectivity"],
  deploymentTarget: "10.0",
};
