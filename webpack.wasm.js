const path = require('path');

module.exports = {
  entry: './tests/csvs-wasm.js',
  output: {
    path: path.resolve(__dirname, 'test'),
    filename: 'index.js',
    publicPath: "test/",
    library: {
      name: "csvs",
      type: "window",
    },
  },
  experiments: {
    asyncWebAssembly: true,
  },
  mode: "development"
};
