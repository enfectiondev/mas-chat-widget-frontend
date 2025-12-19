const path = require("path");
const Dotenv = require("dotenv-webpack");
const webpack = require("webpack");
require("dotenv").config(); // Load .env file for DefinePlugin

module.exports = {
	entry: {
		"chat-widget": "./src/projects/mas/mas-widget-fullscreen.js", // 🎯 MAS Full-Screen Chat Widget
	},
	output: {
		filename: "[name].js", // outputs chat-widget.js
		path: path.resolve(__dirname, "dist"),
		clean: true,
	},
	mode: "production",
	plugins: [
		new Dotenv({
			path: "./.env", // Path to .env file
			safe: false, // Don't require .env.example
			systemvars: true, // Load system environment variables
			defaults: false, // Don't create .env if it doesn't exist
		}),
		// Inject environment variables into the bundle
		new webpack.DefinePlugin({
			"process.env.OPENAI_API_KEY": JSON.stringify(
				process.env.OPENAI_API_KEY || ""
			),
			"process.env.API_BASE_URL": JSON.stringify(
				process.env.API_BASE_URL || ""
			),
		}),
	],
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@babel/preset-env", "@babel/preset-react"],
					},
				},
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
			{
				test: /\.s[ac]ss$/i,
				use: ["style-loader", "css-loader", "sass-loader"],
			},
			{
				test: /\.(png|jpe?g|gif|svg|webp)$/i,
				type: "asset/resource",
				generator: {
					filename: "assets/[name][ext]",
				},
			},
		],
	},
	resolve: {
		extensions: [".js", ".jsx"],
	},
};
