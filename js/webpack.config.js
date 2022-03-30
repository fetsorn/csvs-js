const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'csvs.js',
    library: {
      name: "csvs",
      type: "umd",
    },
  },
  mode: "production",
  experiments: {
    asyncWebAssembly: true,
  }
};
