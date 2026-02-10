import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const AnimatedChatButton = ({ onClick, isVisible = true }) => {
	const canvasRef = useRef();
	const worldRef = useRef();
	const buttonRef = useRef();
	const [isHovered, setIsHovered] = useState(false);
	const [eyePosition, setEyePosition] = useState({
		left: { x: 0, y: 0 },
		right: { x: 0, y: 0 },
	});
	const [isBlinking, setIsBlinking] = useState(false);
	const blinkTimeoutRef = useRef(null);

	useEffect(() => {
		if (!canvasRef.current || !isVisible) return;

		// Exact WebGL Noise Shader from reference index.html
		const noiseShader = `
      vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }

      vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }

      vec4 permute(vec4 x) {
        return mod289(((x*34.0)+10.0)*x);
      }

      vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
      }

      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 =   v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        //   x0 = x0 - 0.0 + 0.0 * C.xxx;
        //   x1 = x0 - i1  + 1.0 * C.xxx;
        //   x2 = x0 - i2  + 2.0 * C.xxx;
        //   x3 = x0 - 1.0 + 3.0 * C.xxx;
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

        // Permutations
        i = mod289(i);
        vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
        //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        //Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }
    `;

		// Function to get CSS variable colors - with hover support
		function getCSSColor(variable, isHover = false) {
			// Using dark red color with hover variants
			const colors = {
				"--primary-color": isHover ? "#8B0000" : "#8B0000", // Dark red
				"--secondary-color": "#8B0000",
			};
			const color = colors[variable] || (isHover ? "#8B0000" : "#8B0000");
			return parseInt(color.replace("#", "0x"));
		}

		class Molecule extends THREE.Object3D {
			material;
			geometry;
			mesh;
			radius = 1.5;
			detail = 20; // Reduced detail to make particles more sparse
			particleSizeMin = 0.005;
			particleSizeMax = 0.04;
			isTransitioning = false;
			transitionProgress = 0;
			targetColor = null;
			originalColor = null;

			constructor() {
				super();
				this.build();
			}

			build() {
				this.geometry = new THREE.IcosahedronGeometry(1, this.detail);

				this.material = new THREE.PointsMaterial({
					map: this.dot(),
					blending: THREE.NormalBlending,
					color: getCSSColor("--primary-color"),
					depthTest: false,
					depthWrite: false,
					transparent: true,
					alphaTest: 0.05,
					opacity: 0.9,
					vertexColors: false,
					sizeAttenuation: true,
				});

				this.setupShader(this.material);

				this.mesh = new THREE.Points(this.geometry, this.material);
				this.add(this.mesh);
			}

			dot(size = 32, color = "#FFFFFF") {
				const sizeH = size * 0.5;

				const canvas = document.createElement("canvas");
				canvas.width = canvas.height = size;

				const ctx = canvas.getContext("2d");

				// Clear canvas to completely transparent
				ctx.clearRect(0, 0, size, size);

				// Create a gradient that fades to transparent at edges
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

			setupShader(material) {
				material.onBeforeCompile = (shader) => {
					shader.uniforms.time = { value: 0 };
					shader.uniforms.radius = { value: this.radius };
					shader.uniforms.particleSizeMin = { value: this.particleSizeMin };
					shader.uniforms.particleSizeMax = { value: this.particleSizeMax };
					shader.vertexShader =
						"uniform float particleSizeMax;\n" + shader.vertexShader;
					shader.vertexShader =
						"uniform float particleSizeMin;\n" + shader.vertexShader;
					shader.vertexShader = "uniform float radius;\n" + shader.vertexShader;
					shader.vertexShader = "uniform float time;\n" + shader.vertexShader;
					shader.vertexShader = noiseShader + "\n" + shader.vertexShader;
					shader.vertexShader = shader.vertexShader.replace(
						"#include <begin_vertex>",
						`
                  vec3 p = position;
                  float n = snoise( vec3( p.x*.6 + time*0.2, p.y*0.4 + time*0.3, p.z*.2 + time*0.2) );
                  p += n *0.4;

                  // constrain to sphere radius
                  float l = radius / length(p);
                  p *= l;
                  float s = mix(particleSizeMin, particleSizeMax, n);
                  vec3 transformed = vec3( p.x, p.y, p.z );
                `
					);
					shader.vertexShader = shader.vertexShader.replace(
						"gl_PointSize = size;",
						"gl_PointSize = s;"
					);

					material.userData.shader = shader;
				};
			}

			// Method to start color transition
			transitionToColor(targetHex, duration = 0.5) {
				if (this.isTransitioning) return;

				this.originalColor = this.material.color.clone();
				this.targetColor = new THREE.Color(targetHex);
				this.isTransitioning = true;
				this.transitionProgress = 0;
				this.transitionDuration = duration;
				this.transitionStart = performance.now();
			}

			animate(time) {
				this.mesh.rotation.set(0, time * 0.2, 0);
				if (this.material.userData.shader)
					this.material.userData.shader.uniforms.time.value = time;

				// Handle color transition
				if (this.isTransitioning && this.originalColor && this.targetColor) {
					const elapsed = (performance.now() - this.transitionStart) / 1000;
					this.transitionProgress = Math.min(
						elapsed / this.transitionDuration,
						1
					);

					// Smooth easing function
					const easeProgress =
						this.transitionProgress * (2 - this.transitionProgress);

					// Interpolate between original and target color
					this.material.color.lerpColors(
						this.originalColor,
						this.targetColor,
						easeProgress
					);

					// End transition
					if (this.transitionProgress >= 1) {
						this.isTransitioning = false;
						this.originalColor = null;
						this.targetColor = null;
					}
				}
			}
		}

		class World {
			renderer;
			scene;
			camera;
			molecule;

			constructor(container) {
				this.container = container;
				this.build();
				this.animate = this.animate.bind(this);
				this.animate();
			}

			build() {
				const size = 80; // Button size

				this.scene = new THREE.Scene();
				// Make scene background completely transparent
				this.scene.background = null;

				this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
				this.camera.position.z = 3;

				this.renderer = new THREE.WebGLRenderer({
					alpha: true,
					antialias: true,
					premultipliedAlpha: false,
					preserveDrawingBuffer: false,
					powerPreference: "default",
				});
				// Set completely transparent clear color
				this.renderer.setClearColor(0x000000, 0);
				this.renderer.sortObjects = false;
				this.renderer.autoClear = true;
				this.renderer.setPixelRatio(window.devicePixelRatio);
				this.renderer.setSize(size, size);

				// Ensure canvas is completely transparent
				this.renderer.domElement.style.background = "none";
				this.renderer.domElement.style.backgroundColor = "transparent";
				this.renderer.domElement.style.border = "none";
				this.renderer.domElement.style.outline = "none";
				this.renderer.domElement.style.boxShadow = "none";

				this.container.appendChild(this.renderer.domElement);

				this.molecule = new Molecule();
				this.scene.add(this.molecule);
			}

			// Method to handle hover state change
			setHoverState(isHovered) {
				if (this.molecule) {
					const targetColorHex = isHovered ? "#6B0000" : "#8B0000"; // Dark red, darker on hover
					this.molecule.transitionToColor(targetColorHex, 0.3);
				}
			}

			animate() {
				if (!this.molecule) return;

				requestAnimationFrame(this.animate);

				const time = performance.now() * 0.001;

				this.molecule.animate(time);

				this.renderer.render(this.scene, this.camera);
			}

			destroy() {
				if (this.renderer) {
					this.container.removeChild(this.renderer.domElement);
					this.renderer.dispose();
				}
				if (this.molecule && this.molecule.geometry)
					this.molecule.geometry.dispose();
				if (this.molecule && this.molecule.material)
					this.molecule.material.dispose();
			}
		}

		// Create the animated sphere using exact same structure as reference
		worldRef.current = new World(canvasRef.current);

		// Cleanup function
		return () => {
			if (worldRef.current) {
				worldRef.current.destroy();
			}
		};
	}, [isVisible]);

	// Handle hover state changes
	useEffect(() => {
		if (worldRef.current) {
			worldRef.current.setHoverState(isHovered);
		}
	}, [isHovered]);

	// Mouse tracking for eyes
	useEffect(() => {
		if (!isVisible || !buttonRef.current) return;

		const handleMouseMove = (e) => {
			if (!buttonRef.current) return;

			const buttonRect = buttonRef.current.getBoundingClientRect();
			const buttonCenterX = buttonRect.left + buttonRect.width / 2;
			const buttonCenterY = buttonRect.top + buttonRect.height / 2;

			// Calculate distance and angle from button center to mouse
			const deltaX = e.clientX - buttonCenterX;
			const deltaY = e.clientY - buttonCenterY;
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			// Normalize and limit the movement (max 3px from center for each eye)
			const maxDistance = 3;
			const normalizedDistance = Math.min(distance / 150, 1); // Normalize by 150px
			
			// Calculate base movement direction
			const angle = Math.atan2(deltaY, deltaX);
			const moveX = Math.cos(angle) * maxDistance * normalizedDistance;
			const moveY = Math.sin(angle) * maxDistance * normalizedDistance;

			// Both eyes move together in the same direction
			setEyePosition({
				left: { x: moveX, y: moveY },
				right: { x: moveX, y: moveY },
			});
		};

		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [isVisible]);

	// Realistic eye blink animation with random timing
	useEffect(() => {
		if (!isVisible) return;

		const scheduleBlink = () => {
			// Random delay between blinks: 2-6 seconds
			const delay = 2000 + Math.random() * 4000;
			
			blinkTimeoutRef.current = setTimeout(() => {
				// Start blink (close eyes)
				setIsBlinking(true);
				
				// Open eyes after blink duration (100-150ms)
				setTimeout(() => {
					setIsBlinking(false);
					// Schedule next blink
					scheduleBlink();
				}, 100 + Math.random() * 50);
			}, delay);
		};

		// Start the blink cycle
		scheduleBlink();

		return () => {
			if (blinkTimeoutRef.current) {
				clearTimeout(blinkTimeoutRef.current);
			}
		};
	}, [isVisible]);

	if (!isVisible) return null;

	return (
		<div
			ref={buttonRef}
			onClick={onClick}
			style={{
				position: "fixed",
				bottom: "20px",
				right: "20px",
				width: "80px",
				height: "80px",
				cursor: "pointer",
				zIndex: 9998,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transition: "transform 0.3s ease",
				background: "none",
				backgroundColor: "transparent",
				border: "none",
				outline: "none",
			}}
			onMouseEnter={(e) => {
				e.target.style.transform = "scale(1.1)";
				setIsHovered(true);
			}}
			onMouseLeave={(e) => {
				e.target.style.transform = "scale(1)";
				setIsHovered(false);
				// Reset eyes to center when mouse leaves
				setEyePosition({ left: { x: 0, y: 0 }, right: { x: 0, y: 0 } });
			}}
		>
		<div
			ref={canvasRef}
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				pointerEvents: "none",
				background: "none",
				backgroundColor: "transparent",
				border: "none",
				outline: "none",
			}}
		/>
		{/* Eyes - Two white dots on top of the animation that follow mouse */}
		<div
			style={{
				position: "absolute",
				top: "35%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				display: "flex",
				gap: "8px",
				pointerEvents: "none",
				zIndex: 1,
			}}
		>
			<div
				style={{
					width: "6px",
					height: "6px",
					background: "white",
					borderRadius: "50%",
					boxShadow: "0 0 4px rgba(255, 255, 255, 0.8)",
					transform: `translate(${eyePosition.left?.x || 0}px, ${eyePosition.left?.y || 0}px) scaleY(${isBlinking ? 0 : 1})`,
					transition: "transform 0.15s ease-out",
					transformOrigin: "center",
				}}
			/>
			<div
				style={{
					width: "6px",
					height: "6px",
					background: "white",
					borderRadius: "50%",
					boxShadow: "0 0 4px rgba(255, 255, 255, 0.8)",
					transform: `translate(${eyePosition.right?.x || 0}px, ${eyePosition.right?.y || 0}px) scaleY(${isBlinking ? 0 : 1})`,
					transition: "transform 0.15s ease-out",
					transformOrigin: "center",
				}}
			/>
		</div>
		</div>
	);
};

export default AnimatedChatButton;
 