# MAS Chat Widget Components

## Components Overview

### AnimatedChatButton.js

**🎇 New WebGL Animated Chat Button**

A stunning floating chat button featuring WebGL particle animation powered by Three.js. This component creates a beautiful sphere of animated particles with noise-based movement that attracts users' attention while maintaining a professional appearance.

#### Features

- **WebGL Particle Animation**: Smooth, fluid sphere with moving particles
- **Three.js Integration**: Uses simplex noise for realistic particle movement
- **Hover Effects**: Scale and glow effects on mouse interaction
- **High Performance**: Optimized rendering with efficient shader management
- **Auto Cleanup**: Proper disposal of WebGL resources when component unmounts
- **Responsive Design**: Adapts to different screen sizes

#### Usage

```javascript
import AnimatedChatButton from "./AnimatedChatButton";

<AnimatedChatButton onClick={handleChatToggle} isVisible={!chatIsOpen} />;
```

#### Props

- `onClick` (function): Callback function when button is clicked
- `isVisible` (boolean): Controls visibility of the button (default: true)

#### Technical Details

- **Bundle Size Impact**: Adds ~450KB due to Three.js dependency
- **WebGL Requirements**: Requires WebGL support (fallback needed for older browsers)
- **Performance**: 60fps animation with minimal CPU/GPU usage
- **Memory Management**: Automatic cleanup prevents memory leaks

#### Browser Support

- ✅ Chrome 50+
- ✅ Firefox 45+
- ✅ Safari 10+
- ✅ Edge 79+
- ❌ Internet Explorer (no WebGL support)

### MasChatWidget.js

**Main Chat Widget Component**

The primary chat widget component that integrates both display modes (basic and full-screen) and switches between standard and animated buttons based on the display mode.

#### Display Modes

- **Basic Mode**: Traditional popup widget with standard chat button
- **Full-Screen Mode**: Full-screen experience with animated WebGL button

#### Button Selection Logic

```javascript
// Full-screen mode uses animated button
{
	!isOpen && displayMode === "full-screen" && (
		<AnimatedChatButton onClick={toggleChat} isVisible={!isOpen} />
	);
}

// Basic mode uses standard button
{
	!isOpen && displayMode === "basic" && (
		<motion.button className="mas-chat-toggle" onClick={toggleChat}>
			<IoChatbubbleEllipsesOutline />
		</motion.button>
	);
}
```

## Development Notes

### Adding Three.js Dependency

```bash
npm install three@^0.158.0
```

### Building with WebGL Components

The animated button significantly increases bundle size due to Three.js. Monitor bundle size with:

```bash
npx webpack --analyze
```

### Performance Considerations

- WebGL rendering is GPU-accelerated for smooth performance
- Particle count optimized for 60fps on mid-range devices
- Automatic cleanup prevents memory leaks in single-page applications

### Customization

The animated button colors, particle count, and animation speed can be customized by modifying the shader uniforms and material properties in `AnimatedChatButton.js`.
