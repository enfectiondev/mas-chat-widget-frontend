import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const AnimatedHeaderIcon = ({ size = 32, eyeSize = 4, eyeGap = 4, opacity = 0.9, particleSizeMin = 0.005, particleSizeMax = 0.04 }) => {
	const canvasRef = useRef();
	const containerRef = useRef();
	const worldRef = useRef();
	const [eyePosition, setEyePosition] = useState({
		left: { x: 0, y: 0 },
		right: { x: 0, y: 0 },
	});
	const [isBlinking, setIsBlinking] = useState(false);
	const blinkTimeoutRef = useRef(null);

	useEffect(() => {
		if (!canvasRef.current) return;

		// Exact WebGL Noise Shader from reference
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

        vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }
    `;

		function getCSSColor() {
			// Use a brighter, more saturated red for better visibility
			return parseInt("#FF1D24".replace("#", "0x")); // Brighter red
		}

		class Molecule extends THREE.Object3D {
			material;
			geometry;
			mesh;
			radius = 1.5;
			detail = 20;
			particleSizeMin;
			particleSizeMax;
			opacity;
			dpr;

			constructor(particleSizeMin, particleSizeMax, opacity, dpr) {
				super();
				this.particleSizeMin = particleSizeMin;
				this.particleSizeMax = particleSizeMax;
				this.opacity = opacity;
				this.dpr = dpr;
				this.build();
			}

			build() {
				this.geometry = new THREE.IcosahedronGeometry(1, this.detail);

				this.material = new THREE.PointsMaterial({
					map: this.dot(),
					blending: THREE.NormalBlending, // Keep NormalBlending for accurate color
					color: getCSSColor(),
					depthTest: false,
					depthWrite: false,
					transparent: true,
					alphaTest: 0.01, // Lower threshold for better particle visibility
					opacity: Math.min(this.opacity * 1.2, 1.0), // Slightly increase opacity for brightness
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

				ctx.clearRect(0, 0, size, size);

				const gradient = ctx.createRadialGradient(
					sizeH,
					sizeH,
					0,
					sizeH,
					sizeH,
					sizeH
				);
				// Make the gradient brighter and more opaque for better visibility
				gradient.addColorStop(0, color);
				gradient.addColorStop(0.5, color);
				gradient.addColorStop(0.8, color);
				gradient.addColorStop(1, "transparent");

				const circle = new Path2D();
				circle.arc(sizeH, sizeH, sizeH * 0.9, 0, 2 * Math.PI); // Slightly larger radius

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
					shader.uniforms.dpr = { value: this.dpr };
					shader.vertexShader =
						"uniform float particleSizeMax;\n" + shader.vertexShader;
					shader.vertexShader =
						"uniform float particleSizeMin;\n" + shader.vertexShader;
					shader.vertexShader = "uniform float radius;\n" + shader.vertexShader;
					shader.vertexShader = "uniform float time;\n" + shader.vertexShader;
					shader.vertexShader = "uniform float dpr;\n" + shader.vertexShader;
					shader.vertexShader = noiseShader + "\n" + shader.vertexShader;
					shader.vertexShader = shader.vertexShader.replace(
						"#include <begin_vertex>",
						`
                  vec3 p = position;
                  float n = snoise( vec3( p.x*.6 + time*0.2, p.y*0.4 + time*0.3, p.z*.2 + time*0.2) );
                  p += n *0.4;

                  float l = radius / length(p);
                  p *= l;
                  float s = mix(particleSizeMin, particleSizeMax, n);
                  vec3 transformed = vec3( p.x, p.y, p.z );
                `
					);
					shader.vertexShader = shader.vertexShader.replace(
						"gl_PointSize = size;",
						"gl_PointSize = s * dpr;"
					);

					material.userData.shader = shader;
				};
			}

			animate(time) {
				this.mesh.rotation.set(0, time * 0.2, 0);
				if (this.material.userData.shader)
					this.material.userData.shader.uniforms.time.value = time;
			}
		}

		class World {
			renderer;
			scene;
			camera;
			molecule;
			opacity;
			particleSizeMin;
			particleSizeMax;

			constructor(container, iconSize, opacity, particleSizeMin, particleSizeMax) {
				this.container = container;
				this.iconSize = iconSize;
				this.opacity = opacity;
				this.particleSizeMin = particleSizeMin;
				this.particleSizeMax = particleSizeMax;
				this.build();
				this.animate = this.animate.bind(this);
				this.animate();
			}

			build() {
				this.scene = new THREE.Scene();
				this.scene.background = null;

				this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
				this.camera.position.z = 3;

				// Use full DPR but apply scaling factor for better mobile visibility
				const rawDpr = window.devicePixelRatio || 1;
				// Detect mobile devices and apply additional scaling
				const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
				                 (window.innerWidth <= 768);
				// Scale factor: 1.5x for mobile to compensate for smaller perceived size
				const scaleFactor = isMobile ? 1.5 : 1.0;
				const dpr = rawDpr * scaleFactor;

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
				// Use raw DPR for renderer, but pass scaled DPR to shader
				this.renderer.setPixelRatio(rawDpr);
				this.renderer.setSize(this.iconSize, this.iconSize);

				// Ensure canvas display size matches the icon size exactly
				const canvas = this.renderer.domElement;
				canvas.style.width = `${this.iconSize}px`;
				canvas.style.height = `${this.iconSize}px`;
				canvas.style.background = "none";
				canvas.style.backgroundColor = "transparent";
				canvas.style.border = "none";
				canvas.style.outline = "none";
				canvas.style.boxShadow = "none";
				// Prevent any CSS filters that might darken the canvas
				canvas.style.filter = "none";
				canvas.style.imageRendering = "auto";

				this.container.appendChild(canvas);

				this.molecule = new Molecule(this.particleSizeMin, this.particleSizeMax, this.opacity, dpr);
				this.scene.add(this.molecule);
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

		worldRef.current = new World(canvasRef.current, size, opacity, particleSizeMin, particleSizeMax);

		return () => {
			if (worldRef.current) {
				worldRef.current.destroy();
			}
		};
	}, [size]);

	// Mouse tracking for eyes
	useEffect(() => {
		if (!containerRef.current) return;

		const handleMouseMove = (e) => {
			if (!containerRef.current) return;

			const containerRect = containerRef.current.getBoundingClientRect();
			const centerX = containerRect.left + containerRect.width / 2;
			const centerY = containerRect.top + containerRect.height / 2;

			// Calculate distance and angle from icon center to mouse
			const deltaX = e.clientX - centerX;
			const deltaY = e.clientY - centerY;
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			// Normalize and limit the movement (max 2px from center for smaller icon)
			const maxDistance = 2;
			const normalizedDistance = Math.min(distance / 150, 1);
			
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
	}, []);

	// Realistic eye blink animation with random timing
	useEffect(() => {
		if (!containerRef.current) return;

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
	}, []);

	return (
		<div
			ref={containerRef}
			style={{
				width: `${size}px`,
				height: `${size}px`,
				position: "relative",
				pointerEvents: "none",
			}}
			onMouseLeave={() => {
				// Reset eyes to center when mouse leaves
				setEyePosition({ left: { x: 0, y: 0 }, right: { x: 0, y: 0 } });
			}}
		>
			<div
				ref={canvasRef}
				style={{
					width: "100%",
					height: "100%",
					position: "absolute",
					top: 0,
					left: 0,
					pointerEvents: "none",
				}}
			/>
			{/* Eyes - Two white dots that follow mouse */}
			<div
				style={{
					position: "absolute",
					top: "35%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					display: "flex",
					gap: `${eyeGap}px`,
					pointerEvents: "none",
					zIndex: 1,
				}}
			>
				<div
					style={{
						width: `${eyeSize}px`,
						height: `${eyeSize}px`,
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
						width: `${eyeSize}px`,
						height: `${eyeSize}px`,
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

export default AnimatedHeaderIcon;

