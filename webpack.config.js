const path = require("path")

module.exports = {
  entry: "./src/index.js",
  devtool: 'source-map',
  output: {
    filename: "LibDeltaJS.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "var",
    library: "DeltaConnection"
  }
}