const path = require('path');
const webpack = require('webpack');

// Configuration for browser build
const browserConfig = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ooxml-templater.min.js',
    library: {
      name: 'OOXMLTemplater',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    browsers: ['> 1%', 'last 2 versions', 'not dead'],
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  externals: {
    // zip.js should be provided by the user in browser environments
    '@zip.js/zip.js': {
      commonjs: '@zip.js/zip.js',
      commonjs2: '@zip.js/zip.js',
      amd: '@zip.js/zip.js',
      root: 'zip',
    },
  },
  resolve: {
    extensions: ['.js'],
    fallback: {
      fs: false,
      path: false,
      crypto: false,
      zlib: false,
      buffer: require.resolve('buffer'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};

// Configuration for Node.js build
const nodeConfig = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ooxml-templater.node.js',
    library: {
      type: 'commonjs2',
    },
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    node: '14',
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
};

module.exports = [browserConfig, nodeConfig];
