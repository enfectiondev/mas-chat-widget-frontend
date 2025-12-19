/**
 * Simple API Key Encryption Utility
 * 
 * WARNING: This is NOT true encryption - it's obfuscation.
 * In a frontend application, any "encryption" can be reversed.
 * For production, use a backend proxy to protect your API keys.
 * 
 * This utility provides basic obfuscation to prevent casual inspection.
 */

// Simple XOR cipher with a key
const XOR_KEY = "MAS_CHAT_WIDGET_2024";

/**
 * Encrypts (obfuscates) an API key
 * @param {string} apiKey - The API key to encrypt
 * @returns {string} - Encrypted (obfuscated) string
 */
export const encryptApiKey = (apiKey) => {
	if (!apiKey) return "";
	
	// Convert to base64 first
	const base64 = btoa(apiKey);
	
	// Apply XOR cipher
	let encrypted = "";
	for (let i = 0; i < base64.length; i++) {
		const keyChar = XOR_KEY[i % XOR_KEY.length];
		encrypted += String.fromCharCode(
			base64.charCodeAt(i) ^ keyChar.charCodeAt(0)
		);
	}
	
	// Convert to base64 again for safe storage
	return btoa(encrypted);
};

/**
 * Decrypts (deobfuscates) an API key
 * @param {string} encryptedKey - The encrypted API key
 * @returns {string} - Decrypted API key
 */
export const decryptApiKey = (encryptedKey) => {
	if (!encryptedKey) return "";
	
	try {
		// Decode from base64
		const encrypted = atob(encryptedKey);
		
		// Reverse XOR cipher
		let decrypted = "";
		for (let i = 0; i < encrypted.length; i++) {
			const keyChar = XOR_KEY[i % XOR_KEY.length];
			decrypted += String.fromCharCode(
				encrypted.charCodeAt(i) ^ keyChar.charCodeAt(0)
			);
		}
		
		// Decode from base64
		return atob(decrypted);
	} catch (error) {
		console.error("Failed to decrypt API key:", error);
		return "";
	}
};

/**
 * Gets the API key from environment or encrypted config
 * @returns {string} - The decrypted API key
 */
export const getApiKey = () => {
	// webpack.DefinePlugin replaces process.env.OPENAI_API_KEY with the actual string value at build time
	// The replacement is a direct text replacement, so process.env.OPENAI_API_KEY becomes "sk-proj-..."
	// We access it directly - webpack will replace this with the actual string value
	
	// Direct access - webpack DefinePlugin will replace this with the actual string
	// eslint-disable-next-line no-undef
	const apiKey = process.env.OPENAI_API_KEY;
	
	// Check if we got a valid key (not empty string, not undefined, not null)
	// After webpack replacement, this will be the actual API key string
	if (apiKey && typeof apiKey === "string" && apiKey.trim() !== "" && apiKey !== "undefined") {
		return apiKey.trim();
	}
	
	// Try window.env (if set via DefinePlugin or similar)
	if (typeof window !== "undefined" && window.ENV && window.ENV.OPENAI_API_KEY) {
		return window.ENV.OPENAI_API_KEY;
	}
	
	// Try encrypted config (for production builds)
	// This would be set at build time
	if (typeof window !== "undefined" && window.MAS_CONFIG) {
		return decryptApiKey(window.MAS_CONFIG.OPENAI_API_KEY);
	}
	
	// Fallback: return empty string
	console.warn("OpenAI API key not found. Please configure it in .env file and rebuild.");
	return "";
};

/**
 * Gets the API base URL from environment
 * @returns {string} - The API base URL
 */
export const getApiBaseUrl = () => {
	// webpack.DefinePlugin replaces process.env.API_BASE_URL with the actual string value at build time
	// eslint-disable-next-line no-undef
	const apiBaseUrl = process.env.API_BASE_URL;
	
	// Check if we got a valid URL (not empty string, not undefined, not null)
	if (apiBaseUrl && typeof apiBaseUrl === "string" && apiBaseUrl.trim() !== "" && apiBaseUrl !== "undefined") {
		return apiBaseUrl.trim();
	}
	
	// Try window.env (if set via DefinePlugin or similar)
	if (typeof window !== "undefined" && window.ENV && window.ENV.API_BASE_URL) {
		return window.ENV.API_BASE_URL;
	}
	
	// Fallback: return empty string
	console.warn("API base URL not found. Please configure it in .env file and rebuild.");
	return "";
};

