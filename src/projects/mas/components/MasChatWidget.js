import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
	IoChatbubbleEllipsesOutline,
	IoClose,
	IoSend,
	IoRemove,
	IoExpand,
	IoAdd,
	IoMic,
	IoVolumeHigh,
	IoPlay,
	IoPause,
	IoAddCircleOutline,
	IoCopy,
	IoCheckmark,
} from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import AnimatedChatButton from "./AnimatedChatButton";
import AnimatedHeaderIcon from "./AnimatedHeaderIcon";
import VoiceInput from "./VoiceInput";
import { getApiKey, getApiBaseUrl } from "../../../utils/apiKeyEncryption";
import widgetBg from "../../../assets/widget-bg.webp";
import "../../../styles/mas-chat-widget.scss";

const CHAT_STORAGE_KEY = "mas_chat_messages";
const DISPLAY_MODE_STORAGE_KEY = "mas_display_mode";
const DEFAULT_SESSION_ID = Date.now();
// Replace with your MAS API endpoint
const MAS_API = "https://api.mas.com/chatbot"; // Update this with your actual MAS API

const MasChatWidget = ({ displayMode = "popup" }) => {
	// Load saved display mode from localStorage or use default
	const getSavedDisplayMode = () => {
		const saved = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
		return saved || displayMode;
	};

	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [hasStartedChat, setHasStartedChat] = useState(false);
	const [isMinimized, setIsMinimized] = useState(false);
	const [currentMode, setCurrentMode] = useState(getSavedDisplayMode());
	const [isClosing, setIsClosing] = useState(false);
	const [showFloatingOverlay, setShowFloatingOverlay] = useState(true);
	const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
	const [playingAudioId, setPlayingAudioId] = useState(null); // Track which message is playing audio
	const [generatingAudioId, setGeneratingAudioId] = useState(null); // Track which message is generating audio
	const [copiedMessageId, setCopiedMessageId] = useState(null); // Track which message was copied
	const sessionId = useRef(DEFAULT_SESSION_ID);
	const messagesEndRef = useRef(null);
	const textareaRef = useRef(null);
	const audioRefs = useRef({}); // Store audio elements for each message

	// Format timestamp
	const formatTime = (date = new Date()) => {
		const hours = date.getHours();
		const minutes = date.getMinutes();
		const ampm = hours >= 12 ? "P.M" : "A.M";
		const displayHours = hours % 12 || 12;
		const displayMinutes = minutes.toString().padStart(2, "0");
		return `${displayHours}.${displayMinutes} ${ampm}`;
	};

	// Debug log
	useEffect(() => {
		console.log("🎯 MAS Widget Display Mode:", currentMode);
	}, [currentMode]);

	useEffect(() => {
		const savedData = localStorage.getItem(CHAT_STORAGE_KEY);
		if (savedData) {
			try {
				const { chatHistory } = JSON.parse(savedData);
				if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
					// Only load the latest 25 messages (in case there are more stored)
					const MAX_MESSAGES = 25;
					const recentMessages = chatHistory.slice(-MAX_MESSAGES);
					
					// Add timestamps to old messages if they don't have them
					const messagesWithTimestamps = recentMessages.map((msg) => ({
						...msg,
						timestamp: msg.timestamp || formatTime(),
					}));
					
					setMessages(messagesWithTimestamps);
					if (messagesWithTimestamps.length > 0) {
						setHasStartedChat(true);
					}
					
					// Update localStorage with only the latest 25 messages if there were more
					if (chatHistory.length > MAX_MESSAGES) {
						localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ chatHistory: messagesWithTimestamps }));
					}
				}
			} catch (error) {
				console.error("Error loading saved messages:", error);
				// Clear corrupted data
				localStorage.removeItem(CHAT_STORAGE_KEY);
			}
		}
	}, []);

	useEffect(() => {
		if (isOpen && hasStartedChat) scrollToBottom();
	}, [messages, isOpen, hasStartedChat]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const saveMessages = (chatHistory) => {
		// Only save the latest 25 messages for performance
		const MAX_MESSAGES = 25;
		const messagesToSave = chatHistory.slice(-MAX_MESSAGES);
		localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ chatHistory: messagesToSave }));
	};

	const toggleChat = () => {
		setIsOpen(!isOpen);
		setIsMinimized(false);
		setShowFloatingOverlay(false); // Hide floating overlay when opening chat
		setTimeout(scrollToBottom, 100);
	};

	const handleFloatingAction = (action) => {
		if (action === "ask-question") {
			toggleChat(); // Open the chat widget
		} else if (action === "close") {
			setShowFloatingOverlay(false); // Hide floating overlay smoothly
		} else if (action === "disclaimer") {
			// Could show disclaimer modal or open chat
			toggleChat();
		}
	};

	const toggleMinimize = () => {
		// In full-screen mode, minimize should switch to popup mode first
		if (currentMode === "full-screen" && !isMinimized) {
			setCurrentMode("popup");
			localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, "popup");
			setTimeout(() => {
				setIsMinimized(true);
			}, 300); // Wait for mode transition
		} else {
			setIsMinimized(!isMinimized);
		}
	};

	const toggleFullScreen = () => {
		const newMode = currentMode === "popup" ? "full-screen" : "popup";
		localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, newMode);
		setCurrentMode(newMode);
		if (isMinimized) {
			setIsMinimized(false);
		}
	};

	// Start a new chat conversation
	const startNewChat = () => {
		// Pause any playing audio
		if (playingAudioId) {
			const audio = audioRefs.current[playingAudioId];
			if (audio) {
				audio.pause();
				audio.currentTime = 0;
			}
			setPlayingAudioId(null);
		}

		// Clear generating audio state
		if (generatingAudioId) {
			setGeneratingAudioId(null);
		}

		// Clear all audio references
		Object.values(audioRefs.current).forEach((audio) => {
			if (audio) {
				audio.pause();
				audio.src = "";
			}
		});
		audioRefs.current = {};

		// Clear messages and reset chat
		setMessages([]);
		setHasStartedChat(false);
		setInput("");
		localStorage.removeItem(CHAT_STORAGE_KEY);
		
		// Reset session ID
		sessionId.current = Date.now();
	};

	const closeChat = () => {
		// Pause any playing audio
		if (playingAudioId) {
			const audio = audioRefs.current[playingAudioId];
			if (audio) {
				audio.pause();
				audio.currentTime = 0;
			}
			setPlayingAudioId(null);
		}

		// Clear generating audio state
		if (generatingAudioId) {
			setGeneratingAudioId(null);
		}

		// Start closing animation
		setIsClosing(true);

		// Wait for animation to complete, then close
		setTimeout(() => {
			// Don't clear messages - keep them for when widget reopens
			// Only clear input and UI states
			setInput("");
			
			// Close and reset states
			setIsOpen(false);
			setIsMinimized(false);
			setIsClosing(false);

			// Show floating overlay again after a short delay
			setTimeout(() => {
				setShowFloatingOverlay(true);
			}, 200);
		}, 300); // Match animation duration
	};

	const sendMessage = async () => {
		if (!input.trim()) return;

		// Mark that chat has started for layout transition
		if (!hasStartedChat) {
			setHasStartedChat(true);
		}

		const userMessage = {
			text: input,
			sender: "user",
			timestamp: formatTime(),
		};
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);
		const messageText = input;
		setInput("");
		setLoading(true);

		saveMessages(updatedMessages);

		try {
			// Get API base URL
			const apiBaseUrl = getApiBaseUrl();
			console.log("🔍 API Base URL:", apiBaseUrl);
			
			if (!apiBaseUrl || apiBaseUrl.trim() === "") {
				throw new Error("API base URL not configured. Please check your .env file and rebuild the project.");
			}

			// Build chat history from previous messages
			// Convert messages to chat_history format for the API
			const chatHistory = messages
				.filter(msg => msg.sender === "user" || msg.sender === "bot")
				.map(msg => ({
					role: msg.sender === "user" ? "user" : "assistant",
					content: msg.text
				}));

			const requestBody = {
				query: messageText,
				chat_history: chatHistory,
			};

			console.log("📤 Sending request to:", `${apiBaseUrl}/chat`);
			console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));

			// Make API call to chatbot endpoint
			const response = await fetch(`${apiBaseUrl}/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			console.log("📥 Response status:", response.status, response.statusText);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ API Error Response:", errorText);
				throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorText}`);
			}

			const data = await response.json();
			console.log("✅ API Response:", data);

			// Parse API response format
			// Try multiple possible response fields (response, message, content, answer)
			const botResponse = {
				text: data.response || data.message || data.content || data.answer || "I'm sorry, I couldn't process that request.",
				sender: "bot",
				timestamp: data.timestamp ? formatTime(new Date(data.timestamp)) : formatTime(),
				agentUsed: data.agent_used || data.agent || "general",
				id: `msg-${Date.now()}-${Math.random()}`, // Unique ID for audio playback
			};

			const newMessages = [...updatedMessages, botResponse];
			setMessages(newMessages);
			saveMessages(newMessages);
			setLoading(false);
		} catch (error) {
			console.error("❌ Error sending message:", error);
			console.error("❌ Error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name
			});
			
			// Show more helpful error message
			let errorText = `Thank you for your message. We're experiencing technical difficulties, but your message "${messageText}" has been received. Our team will get back to you soon.`;
			
			if (error.message.includes("API base URL not configured")) {
				errorText = "API configuration error: Please check your .env file and rebuild the project.";
			} else if (error.message.includes("CORS") || error.message.includes("Failed to fetch")) {
				errorText = "Network error: Unable to connect to the chatbot API. This might be a CORS issue. Please check the browser console for details.";
			} else if (error.message.includes("API request failed")) {
				errorText = `API Error: ${error.message}`;
			}
			
			const errorMsg = {
				text: errorText,
				sender: "bot",
				timestamp: formatTime(),
				id: `msg-${Date.now()}-${Math.random()}`,
			};
			const newMessages = [...updatedMessages, errorMsg];
			setMessages(newMessages);
			saveMessages(newMessages);
			setLoading(false);
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	// Handle voice transcript from VoiceInput component
	const handleVoiceTranscript = (transcript) => {
		if (transcript && transcript.trim()) {
			setInput(transcript);
			// Auto-adjust textarea height
			setTimeout(() => {
				if (textareaRef.current) {
					adjustTextareaHeight();
				}
			}, 10);
		}
	};

	// Auto-expand textarea based on content (max 5 lines)
	const adjustTextareaHeight = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "44px"; // Reset to single line first
			const scrollHeight = textareaRef.current.scrollHeight;
			const lineHeight = 24; // Approximate line height in pixels
			const singleLineHeight = 44; // Single line height
			const maxHeight = lineHeight * 5; // Max 5 lines
			
			// Only expand if content exceeds single line
			if (scrollHeight > singleLineHeight) {
				const newHeight = Math.min(scrollHeight, maxHeight);
				textareaRef.current.style.height = `${newHeight}px`;
			} else {
				textareaRef.current.style.height = `${singleLineHeight}px`;
        }
		}
	};

	// Handle input change with auto-expand
	const handleInputChange = (e) => {
		setInput(e.target.value);
		setTimeout(() => adjustTextareaHeight(), 10);
	};

	// Handle voice input errors
	const handleVoiceError = (error) => {
		console.error("Voice input error:", error);
		// You could show a toast notification here
		alert(error); // Simple alert for now - can be replaced with a toast component
	};

	// Generate audio using OpenAI Text-to-Speech API
	const generateAudio = async (text, messageId) => {
		try {
			const apiKey = getApiKey();
			if (!apiKey || apiKey.trim() === "") {
				throw new Error("OpenAI API key not configured. Please check your .env file.");
			}

			// Call OpenAI TTS API
			const response = await fetch("https://api.openai.com/v1/audio/speech", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: "tts-1",
					input: text,
					voice: "alloy", // Options: alloy, echo, fable, onyx, nova, shimmer
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error?.message || `TTS API error: ${response.status}`);
			}

			// Get audio blob
			const audioBlob = await response.blob();
			const audioUrl = URL.createObjectURL(audioBlob);

			// Create audio element
			const audio = new Audio(audioUrl);
			audioRefs.current[messageId] = audio;

			// Handle audio end
			audio.addEventListener("ended", () => {
				setPlayingAudioId(null);
			});

			// Handle audio errors
			audio.addEventListener("error", (e) => {
				console.error("Audio playback error:", e);
				setPlayingAudioId(null);
			});

			return audio;
		} catch (error) {
			console.error("Error generating audio:", error);
			throw error;
		}
	};

	// Handle play/pause audio
	const handlePlayAudio = async (messageId, text) => {
		try {
			// If this message is already playing, pause it
			if (playingAudioId === messageId) {
				const audio = audioRefs.current[messageId];
				if (audio) {
					audio.pause();
					setPlayingAudioId(null);
				}
				return;
			}

			// Stop any currently playing audio
			if (playingAudioId) {
				const currentAudio = audioRefs.current[playingAudioId];
				if (currentAudio) {
					currentAudio.pause();
					currentAudio.currentTime = 0;
				}
			}

			// Get or create audio for this message
			let audio = audioRefs.current[messageId];
			if (!audio) {
				// Show loading state while generating audio
				setGeneratingAudioId(messageId);
				try {
					// Generate audio if it doesn't exist
					audio = await generateAudio(text, messageId);
				} finally {
					// Clear loading state
					setGeneratingAudioId(null);
				}
			}

			// Play audio
			audio.currentTime = 0; // Reset to start
			await audio.play();
			setPlayingAudioId(messageId);
		} catch (error) {
			console.error("Error playing audio:", error);
			setGeneratingAudioId(null); // Clear loading state on error
			alert(`Failed to play audio: ${error.message}`);
		}
	};

	// Handle copy message text
	const handleCopyMessage = async (messageId, text) => {
		try {
			// Copy text to clipboard (handle both plain text and markdown)
			// Remove markdown formatting for plain text copy
			const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1') // Bold
				.replace(/\*(.*?)\*/g, '$1') // Italic
				.replace(/`(.*?)`/g, '$1') // Inline code
				.replace(/#{1,6}\s/g, '') // Headers
				.replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
				.trim();

			await navigator.clipboard.writeText(plainText);
			
			// Show success tooltip
			setCopiedMessageId(messageId);
			
			// Hide tooltip after 2 seconds
			setTimeout(() => {
				setCopiedMessageId(null);
			}, 2000);
		} catch (error) {
			console.error("Failed to copy text:", error);
			// Fallback for older browsers
			try {
				const textArea = document.createElement("textarea");
				textArea.value = text.replace(/\*\*(.*?)\*\*/g, '$1')
					.replace(/\*(.*?)\*/g, '$1')
					.replace(/`(.*?)`/g, '$1')
					.replace(/#{1,6}\s/g, '')
					.replace(/\[(.*?)\]\(.*?\)/g, '$1')
					.trim();
				textArea.style.position = "fixed";
				textArea.style.opacity = "0";
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand("copy");
				document.body.removeChild(textArea);
				
				setCopiedMessageId(messageId);
				setTimeout(() => {
					setCopiedMessageId(null);
				}, 2000);
			} catch (fallbackError) {
				console.error("Fallback copy failed:", fallbackError);
			}
		}
	};

	// Cleanup audio on unmount
	useEffect(() => {
		return () => {
			// Cleanup all audio elements
			Object.values(audioRefs.current).forEach((audio) => {
				if (audio) {
					audio.pause();
					audio.src = "";
				}
			});
		};
	}, []);

	const quickActions = [
		"Are there any job openings at MAS Holdings?",
		"What are MAS's innovation capabilities?",
		"Can you tell me about MAS's global presence?",
	];

	const handleQuickAction = (action) => {
		setInput(action);
		setTimeout(() => {
			if (!hasStartedChat) {
				setHasStartedChat(true);
			}
		}, 100);
	};

	// Helper function to get CSS classes
	const getChatBoxClasses = () => {
		let classes = ["mas-chat-box"];
		if (currentMode === "full-screen") {
			classes.push("fullscreen");
		} else {
			classes.push("popup");
        }
		if (isMinimized) {
			classes.push("minimized");
		}
		return classes.join(" ");
	};

	return (
		<div className={`mas-chat-container ${currentMode}`}>
			{/* Animated Chat Toggle Button */}
			{!isOpen && (
				<AnimatedChatButton onClick={toggleChat} isVisible={!isOpen} />
			)}

			{/* Floating Overlay with Additional Components */}
			{!isOpen && showFloatingOverlay && (
				<motion.div
					className="mas-floating-overlay"
					initial={{ opacity: 0, scale: 0.9, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 20 }}
					transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
				>
					<div className="mas-floating-content">
						<div className="mas-floating-title">I'm Your Virtual Assistant</div>
						<div className="mas-floating-subtitle">
							How Can I Help You Today ?
						</div>

						<div className="mas-floating-actions">
							<button
								className="mas-floating-btn primary"
								onClick={() => handleFloatingAction("ask-question")}
							>
								Ask a question
							</button>
							<button
								className="mas-floating-btn secondary"
								onClick={() => handleFloatingAction("disclaimer")}
							>
								Disclaimer
							</button>
							<button
								className="mas-floating-btn secondary"
								onClick={() => handleFloatingAction("close")}
							>
								Close
							</button>
						</div>
					</div>
				</motion.div>
			)}

			{/* Chat Box */}
			{isOpen && (
				<motion.div
					className={getChatBoxClasses()}
					style={{
						backgroundImage: `url(${widgetBg})`,
						backgroundSize: "cover",
						backgroundPosition: "center",
						backgroundRepeat: "no-repeat",
					}}
					initial={
						currentMode === "full-screen"
							? { opacity: 0, scale: 0.95 }
							: { opacity: 0, scale: 0.8, y: 20 }
					}
					animate={
						isClosing
							? currentMode === "full-screen"
								? { opacity: 0, scale: 0.95 }
								: { opacity: 0, scale: 0.8, y: 20 }
							: currentMode === "full-screen"
							? { opacity: 1, scale: 1 }
							: { opacity: 1, scale: 1, y: 0 }
					}
					transition={{
						duration: 0.3,
						ease:
							currentMode === "full-screen"
								? [0.25, 0.46, 0.45, 0.94]
								: [0.4, 0, 0.2, 1],
					}}
				>
					{/* Top Bar with Title and Controls */}
					<div className="mas-chat-top-bar">
						<div className="mas-chat-title">
							<AnimatedHeaderIcon size={32} />
							Chat with MAS
							</div>
						<div className="mas-chat-controls">
							{hasStartedChat && (
								<button
									className="mas-chat-control-btn new-chat"
									onClick={startNewChat}
									title="Start New Chat"
								>
									<IoAddCircleOutline size={14} />
								</button>
							)}
							<button
								className="mas-chat-control-btn minimize"
								onClick={toggleMinimize}
								title={
									currentMode === "full-screen"
										? "Switch to Popup"
										: isMinimized
										? "Maximize"
										: "Minimize"
								}
							>
								{isMinimized ? <IoAdd size={14} /> : <IoRemove size={14} />}
							</button>
							<button
								className="mas-chat-control-btn expand"
								onClick={toggleFullScreen}
								title={
									currentMode === "full-screen"
										? "Exit Full Screen"
										: "Full Screen"
								}
							>
								<IoExpand size={14} />
							</button>
							<button
								className="mas-chat-control-btn close"
								onClick={closeChat}
								title="Close"
							>
								<IoClose size={14} />
							</button>
						</div>
					</div>

					{/* Chat Body */}
					{!isMinimized && (
						<div className="mas-chat-body">
							{/* Welcome Section */}
							{!hasStartedChat && (
								<div className="mas-chat-welcome">
									<div className="mas-chat-welcome-title">HELLO!</div>
									<div className="mas-chat-welcome-subtitle">
										I'm here to help you explore MAS.
									</div>
									<div className="mas-chat-welcome-message">
										Is there something you're looking for?
									</div>

									{/* Quick Action Buttons */}
									<div className="mas-chat-quick-actions">
										{quickActions.map((action, index) => (
											<button
												key={index}
												className="mas-chat-quick-action"
												onClick={() => handleQuickAction(action)}
											>
												{action}
											</button>
										))}
									</div>
							</div>
						)}

							{/* Chat Messages Area (always scrollable) */}
							{hasStartedChat && (
								<div className="mas-chat-messages">
						{messages.map((msg, index) => {
							const messageId = msg.id || `msg-${index}`;
							const isPlaying = playingAudioId === messageId;
							return (
										<div key={index} className="mas-chat-message-wrapper">
											<div className={`mas-chat-message ${msg.sender}`}>
								{msg.sender === "bot" ? (
									<ReactMarkdown
										components={{
											p: ({node, ...props}) => <p className="mas-markdown-paragraph" {...props} />,
											strong: ({node, ...props}) => <strong className="mas-markdown-strong" {...props} />,
											em: ({node, ...props}) => <em className="mas-markdown-em" {...props} />,
											ul: ({node, ...props}) => <ul className="mas-markdown-ul" {...props} />,
											ol: ({node, ...props}) => <ol className="mas-markdown-ol" {...props} />,
											li: ({node, ...props}) => <li className="mas-markdown-li" {...props} />,
											br: () => <br className="mas-markdown-br" />,
										}}
									>
										{msg.text
											.replace(/\n\n+/g, '\n\n') // Normalize multiple newlines to double
											.replace(/\n(?!\n)/g, '  \n') // Single newline becomes markdown line break (two spaces + newline)
										}
									</ReactMarkdown>
								) : (
									msg.text
								)}
											</div>
											<div className={`mas-chat-message-meta ${msg.sender}`}>
												<span className="mas-chat-timestamp">
													{msg.timestamp || formatTime()}
												</span>
												{msg.sender === "bot" && (
													<div className="mas-chat-audio-controls">
														<button
															className={`mas-chat-audio-btn ${isPlaying ? "playing" : ""} ${generatingAudioId === messageId ? "generating" : ""}`}
															onClick={() => handlePlayAudio(messageId, msg.text)}
															title={
																generatingAudioId === messageId
																	? "Generating audio..."
																	: isPlaying
																	? "Pause audio"
																	: "Play audio"
															}
															disabled={loading || generatingAudioId === messageId}
														>
															{generatingAudioId === messageId ? (
																<div className="mas-audio-loading">
																	<div className="mas-audio-loading-dot"></div>
																	<div className="mas-audio-loading-dot"></div>
																	<div className="mas-audio-loading-dot"></div>
																</div>
															) : isPlaying ? (
																<IoPause size={14} />
															) : (
																<IoVolumeHigh size={14} />
															)}
														</button>
														<button
															className={`mas-chat-copy-btn ${copiedMessageId === messageId ? "copied" : ""}`}
															onClick={() => handleCopyMessage(messageId, msg.text)}
															title="Copy message"
															disabled={loading}
														>
															{copiedMessageId === messageId ? (
																<>
																	<IoCheckmark size={14} />
																	<span className="mas-copy-tooltip">Copied!</span>
																</>
															) : (
																<IoCopy size={14} />
															)}
														</button>
													</div>
												)}
											</div>
							</div>
							);
						})}
						{loading && (
							<div className="mas-chat-loading">
								<div className="mas-chat-loading-dots">
									<div className="mas-chat-loading-dot"></div>
									<div className="mas-chat-loading-dot"></div>
									<div className="mas-chat-loading-dot"></div>
								</div>
											<span
												style={{
													fontSize: "12px",
													color: "#666",
												}}
											>
									MAS is typing...
								</span>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>
							)}

							{/* Input Section */}
							<div className="mas-chat-input-section">
								<div className={`mas-chat-input-container ${isVoiceInputActive ? "voice-active" : ""}`}>
									<textarea
										ref={textareaRef}
										className="mas-chat-input"
							value={input}
										onChange={handleInputChange}
							onKeyPress={handleKeyPress}
										placeholder="What's on your mind ?"
										disabled={loading}
										rows={1}
									/>
									<VoiceInput
										onTranscript={handleVoiceTranscript}
										onError={handleVoiceError}
							disabled={loading}
										onStateChange={setIsVoiceInputActive}
						/>
									<button
										className="mas-chat-send-button"
										onClick={sendMessage}
										disabled={loading || !input.trim()}
									>
										<IoSend size={18} />
									</button>
								</div>
							</div>

							{/* Disclaimer */}
							{hasStartedChat && (
								<div className="mas-chat-disclaimer">
									<button className="mas-chat-disclaimer-button">
										Disclaimer
						</button>
					</div>
							)}
						</div>
					)}
				</motion.div>
			)}
		</div>
	);
};

export default MasChatWidget;
