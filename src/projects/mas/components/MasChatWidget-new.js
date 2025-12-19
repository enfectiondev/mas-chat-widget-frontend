import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
	IoChatbubbleEllipsesOutline,
	IoClose,
	IoSend,
	IoRemove,
	IoExpand,
	IoAdd,
} from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import AnimatedChatButton from "./AnimatedChatButton";
import * as THREE from "three";
import "../../../styles/mas-chat-widget.scss";

const CHAT_STORAGE_KEY = "mas_chat_messages";
const DISPLAY_MODE_STORAGE_KEY = "mas_display_mode";
const DEFAULT_SESSION_ID = Date.now();
// Replace with your MAS API endpoint
const MAS_API = "https://api.mas.com/chatbot"; // Update this with your actual MAS API

// Particle Animation Component for Header
const HeaderParticleAnimation = ({ hasStartedChat = false }) => {
	const canvasRef = useRef();
	const worldRef = useRef();

	useEffect(() => {
		if (!canvasRef.current) return;

		// Noise shader from the original animation
		const noiseShader = `
      vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec4 permute(vec4 x) {
        return mod289(((x*34.0)+1.0)*x);
      }
      
      vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
      }
      
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 =   v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                      dot(p2,x2), dot(p3,x3) ) );
      }
    `;

		class Molecule extends THREE.Object3D {
			constructor() {
				super();
				this.radius = 1.2;
				this.detail = 15;
				this.particleSizeMin = 0.008;
				this.particleSizeMax = 0.06;
				this.build();
			}

			build() {
				this.geometry = new THREE.IcosahedronGeometry(1, this.detail);

				this.material = new THREE.PointsMaterial({
					map: this.dot(),
					blending: THREE.AdditiveBlending,
					color: 0xb30f59, // Pink color for header particles
					depthTest: false,
					depthWrite: false,
					transparent: true,
					alphaTest: 0.05,
					opacity: 0.8,
					vertexColors: false,
					sizeAttenuation: true,
				});

				const shaderMaterial = new THREE.ShaderMaterial({
					uniforms: {
						time: { value: 1.0 },
						pointTexture: { value: this.dot() },
						color: { value: new THREE.Color(0xb30f59) },
					},
					vertexShader: `
            uniform float time;
            attribute float size;
            varying vec3 vColor;
            ${noiseShader}
            void main() {
              vColor = color;
              vec3 pos = position;
              float noise = snoise(pos * 0.5 + time * 0.1);
              pos += normal * noise * 0.1;
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
					fragmentShader: `
            uniform vec3 color;
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            void main() {
              gl_FragColor = vec4(color * vColor, 1.0);
              gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
              if (gl_FragColor.a < 0.05) discard;
            }
          `,
					blending: THREE.AdditiveBlending,
					depthTest: false,
					transparent: true,
					vertexColors: true,
				});

				const mesh = new THREE.Points(this.geometry, this.material);
				this.add(mesh);
			}

			dot(size = 32, color = "#FFFFFF") {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				canvas.width = canvas.height = size;
				const sizeH = size / 2;

				ctx.clearRect(0, 0, size, size);
				const gradient = ctx.createRadialGradient(
					sizeH,
					sizeH,
					0,
					sizeH,
					sizeH,
					sizeH
				);
				gradient.addColorStop(0, color);
				gradient.addColorStop(0.7, color);
				gradient.addColorStop(1, "transparent");

				const circle = new Path2D();
				circle.arc(sizeH, sizeH, sizeH * 0.8, 0, 2 * Math.PI);
				ctx.fillStyle = gradient;
				ctx.fill(circle);

				const texture = new THREE.CanvasTexture(canvas);
				texture.premultiplyAlpha = false;
				texture.flipY = false;
				return texture;
			}
		}

		class World {
			constructor(container) {
				this.container = container;
				this.scene = null;
				this.camera = null;
				this.renderer = null;
				this.molecule = null;
				this.clock = new THREE.Clock();
				this.build();
				this.animate();
			}

			build() {
				this.scene = new THREE.Scene();
				this.scene.background = null;

				this.camera = new THREE.PerspectiveCamera(
					75,
					this.container.clientWidth / this.container.clientHeight,
					0.1,
					1000
				);
				this.camera.position.z = 3;

				this.renderer = new THREE.WebGLRenderer({
					alpha: true,
					antialias: true,
					premultipliedAlpha: false,
					preserveDrawingBuffer: false,
					powerPreference: "default",
				});
				this.renderer.setClearColor(0x000000, 0);
				this.renderer.sortObjects = false;
				this.renderer.autoClear = true;

				this.renderer.setSize(80, 80);
				this.renderer.domElement.style.background = "none";
				this.renderer.domElement.style.backgroundColor = "transparent";
				this.renderer.domElement.style.border = "none";
				this.renderer.domElement.style.outline = "none";
				this.renderer.domElement.style.boxShadow = "none";

				this.container.appendChild(this.renderer.domElement);

				this.molecule = new Molecule();
				this.scene.add(this.molecule);
			}

			animate() {
				const elapsedTime = this.clock.getElapsedTime();
				if (this.molecule) {
					this.molecule.rotation.x = elapsedTime * 0.1;
					this.molecule.rotation.y = elapsedTime * 0.15;
				}
				this.renderer.render(this.scene, this.camera);
				requestAnimationFrame(() => this.animate());
			}

			destroy() {
				if (this.renderer) {
					this.renderer.dispose();
					if (this.container && this.renderer.domElement) {
						this.container.removeChild(this.renderer.domElement);
					}
				}
				if (this.molecule && this.molecule.material) {
					this.molecule.material.dispose();
				}
			}
		}

		worldRef.current = new World(canvasRef.current);

		return () => {
			if (worldRef.current) {
				worldRef.current.destroy();
			}
		};
	}, []);

	const size = hasStartedChat ? 60 : 100;

	return (
		<div
			ref={canvasRef}
			style={{
				width: `${size}px`,
				height: `${size}px`,
				margin: hasStartedChat ? "0 auto 5px" : "0 auto 15px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
			}}
		/>
	);
};

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
	const sessionId = useRef(DEFAULT_SESSION_ID);
	const messagesEndRef = useRef(null);

	// Debug log
	useEffect(() => {
		console.log("🎯 MAS Widget Display Mode:", currentMode);
	}, [currentMode]);

	useEffect(() => {
		const savedData = localStorage.getItem(CHAT_STORAGE_KEY);
		if (savedData) {
			const { chatHistory } = JSON.parse(savedData);
			setMessages(chatHistory);
			if (chatHistory && chatHistory.length > 0) {
				setHasStartedChat(true);
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
		localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ chatHistory }));
	};

	const toggleChat = () => {
		setIsOpen(!isOpen);
		setIsMinimized(false);
		setTimeout(scrollToBottom, 100);
	};

	const toggleMinimize = () => {
		setIsMinimized(!isMinimized);
	};

	const toggleFullScreen = () => {
		const newMode = currentMode === "popup" ? "full-screen" : "popup";
		localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, newMode);
		setCurrentMode(newMode);
		if (isMinimized) {
			setIsMinimized(false);
		}
	};

	const closeChat = () => {
		// Clear all chat data when closing
		setMessages([]);
		setHasStartedChat(false);
		setInput("");
		localStorage.removeItem(CHAT_STORAGE_KEY);

		// Close and reset states
		setIsOpen(false);
		setIsMinimized(false);
	};

	const sendMessage = async () => {
		if (!input.trim()) return;

		// Mark that chat has started for layout transition
		if (!hasStartedChat) {
			setHasStartedChat(true);
		}

		const userMessage = { text: input, sender: "user" };
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);
		setInput("");
		setLoading(true);

		saveMessages(updatedMessages);

		try {
			// Simulate API call - replace with your actual API
			setTimeout(() => {
				const botResponse = {
					text: `Thank you for your message: "${userMessage.text}". This is a demo response from MAS Bot.`,
					sender: "bot",
				};
				const newMessages = [...updatedMessages, botResponse];
				setMessages(newMessages);
				saveMessages(newMessages);
				setLoading(false);
			}, 1500);
		} catch (error) {
			console.error("Error sending message:", error);
			const errorMsg = {
				text: `Thank you for your message. We're experiencing technical difficulties, but your message "${userMessage.text}" has been received. Our team will get back to you soon.`,
				sender: "bot",
			};
			const newMessages = [...updatedMessages, errorMsg];
			setMessages(newMessages);
			saveMessages(newMessages);
			setLoading(false);
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === "Enter") {
			sendMessage();
		}
	};

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

			{/* Chat Box */}
			{isOpen && (
				<motion.div
					className={getChatBoxClasses()}
					initial={
						currentMode === "full-screen"
							? { opacity: 0 }
							: { opacity: 0, scale: 0.8, y: 20 }
					}
					animate={
						currentMode === "full-screen"
							? { opacity: 1 }
							: { opacity: 1, scale: 1, y: 0 }
					}
					exit={
						currentMode === "full-screen"
							? { opacity: 0 }
							: { opacity: 0, scale: 0.8, y: 20 }
					}
					transition={{
						duration: 0.3,
						ease: [0.4, 0, 0.2, 1],
					}}
				>
					{/* Top Bar with Title and Controls */}
					<div className="mas-chat-top-bar">
						<div className="mas-chat-title">
							<IoChatbubbleEllipsesOutline size={18} />
							Chat with MAS
						</div>
						<div className="mas-chat-controls">
							<button
								className="mas-chat-control-btn minimize"
								onClick={toggleMinimize}
								title={isMinimized ? "Maximize" : "Minimize"}
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
									<HeaderParticleAnimation hasStartedChat={hasStartedChat} />
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
									{messages.map((msg, index) => (
										<div
											key={index}
											className={`mas-chat-message ${msg.sender}`}
										>
											{msg.sender === "bot" ? (
												<ReactMarkdown>{msg.text}</ReactMarkdown>
											) : (
												msg.text
											)}
										</div>
									))}
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
													color: "rgba(255,255,255,0.7)",
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
								<div className="mas-chat-input-container">
									<input
										className="mas-chat-input"
										type="text"
										value={input}
										onChange={(e) => setInput(e.target.value)}
										onKeyPress={handleKeyPress}
										placeholder="What's on your mind ?"
										disabled={loading}
									/>
									<button
										className="mas-chat-send-button"
										onClick={sendMessage}
										disabled={loading || !input.trim()}
									>
										<IoSend size={16} />
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
