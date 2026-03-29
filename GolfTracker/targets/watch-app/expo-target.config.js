/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "watch",
  name: "DaddyCaddyWatch",
  bundleIdentifier: ".watch-app",
  frameworks: ["SwiftUI", "WatchConnectivity"],
  deploymentTarget: "10.0",
};
