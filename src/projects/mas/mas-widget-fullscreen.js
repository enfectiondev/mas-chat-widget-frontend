// src/mas-widget-fullscreen.js
import React from "react";
import ReactDOM from "react-dom/client";
import MasChatWidget from "./components/MasChatWidget";

(async function () {
	console.log("✅ MAS Chat Widget (Full-Screen) script loaded");

	// Widget Configuration for Popup Mode (with full-screen toggle)
	const WIDGET_CONFIG = {
		displayMode: "popup", // Popup mode with full-screen toggle
	};

	// Prevent multiple instances
	if (document.getElementById("mas-widget-fullscreen-container")) {
		console.warn("⚠️ MAS Chat Widget (Full-Screen) is already initialized.");
		return;
	}

	// Create container div
	const container = document.createElement("div");
	container.id = "mas-widget-fullscreen-container";
	document.body.appendChild(container);

	// Initialize React component with full-screen configuration
	const root = ReactDOM.createRoot(container);
	root.render(<MasChatWidget displayMode={WIDGET_CONFIG.displayMode} />);

	console.log(
		`🚀 MAS Chat Widget initialized successfully in ${WIDGET_CONFIG.displayMode} mode`
	);
})();
 