/* eslint no-console: 0 */

'use strict';
const fs = require('fs');
const path = require('path');
const pkgInfo = require('./package.json');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AutoPrefixer = require('autoprefixer');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const DEV_PORT = 2020;
const { name, version, description, repository } = pkgInfo;
const { url } = repository;

fs.writeFileSync('version.json', JSON.stringify({ name, version, description, url }));

const config = {
  name: 'Rasterize',
  target: 'web',
  devServer: {
    disableHostCheck: true,
    host: '0.0.0.0',
    port: DEV_PORT,
    historyApiFallback: true
  },
  output: {
    path: path.join(__dirname, 'dist/'),
    filename: '[name].js',
    chunkFilename: '[id].js',
    libraryTarget: 'umd'
  },
  entry: {
    main: './src/index.js',
    vendor: [
      'babel-polyfill'
    ]
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [
          /src/, /resources/
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                modules: true,
                importLoaders: 1,
                localIdentName: '[name]__[local]___[hash:base64:5]'
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [AutoPrefixer]
              }
            },
            'less-loader'
          ],
          publicPath: '../'
        })
      },
      {
        test: /\.(png|gif|cur|jpg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'images/[name]__[hash:base64:5].[ext]'
            }
          },
          {
            loader: 'image-webpack-loader',
            options: {
              bypassOnDebug: true,
              optipng: {
                optimizationLevel: 7
              },
              gifsicle: {
                interlaced: false
              }
            }
          }
        ]
      },
      {
        test: /\.(woff2|woff|eot|ttf|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'fonts/[name]_[hash:base64:5].[ext]'
            }
          }
        ]
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: [
          {
            loader: 'eslint-loader',
            options: {
              failOnError: true
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin({
      filename: 'styles/[name].[contenthash].css',
      allChunks: true
    }),
    new CopyWebpackPlugin([
      {
        from: './resources/images/splash.png',
        to: './splash.png'
      }
    ]),
    new HtmlWebpackPlugin({
      css: 'styles/styles.css',
      title: 'Rasterize',
      favicon: './resources/images/favicon.png',
      template: './resources/templates/template.ejs',
      inject: 'body',
      hash: true
    })
  ]
};

module.exports = config;
