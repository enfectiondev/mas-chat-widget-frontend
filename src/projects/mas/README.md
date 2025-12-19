# MAS Chat Widget

Modern, responsive chat widget with dual display modes for enhanced user experience.

## 🎯 Features

- **🔸 Basic Mode**: Traditional popup widget (320px)
- **🔹 Full-Screen Mode**: Immersive full-screen experience
- **📱 Responsive Design**: Optimized for all devices
- **⚡ Fast Performance**: Optimized bundle size (415KB)
- **🎨 Modern UI**: Blue gradient theme with smooth animations

## 🖥️ Display Modes

### Basic Mode

- **Size**: 320px width popup
- **Position**: Bottom-right corner
- **Use Case**: Standard websites, traditional chat experience
- **Mobile**: Responsive width (90vw on mobile)

### Full-Screen Mode

- **Size**: Full browser window (100vw x 100vh)
- **Position**: Covers entire screen
- **Use Case**: Mobile apps, immersive chat experience
- **Benefits**: More space for messages, better readability

## ⚙️ Configuration

### Option 1: Change Default Mode in Component

```javascript
// In MasChatWidget.js
const MasChatWidget = ({ displayMode = "full-screen" }) => {
	// Component code...
};
```

### Option 2: Configure in Entry File

```javascript
// In mas-widget.js or mas-widget-fullscreen.js
const WIDGET_CONFIG = {
	displayMode: "basic", // or "full-screen"
};

<MasChatWidget displayMode={WIDGET_CONFIG.displayMode} />;
```

## 🚀 Usage

### Basic Mode

```html
<script src="https://your-domain.com/dist/mas-widget.js"></script>
```

### Full-Screen Mode

```html
<script src="https://your-domain.com/dist/mas-widget-fullscreen.js"></script>
```

## 🔧 Development

### Build

```bash
npx webpack
```

### File Structure

```
src/projects/mas/
├── components/
│   └── MasChatWidget.js      # Main component
├── mas-widget.js             # Basic mode entry
├── mas-widget-fullscreen.js  # Full-screen mode entry
└── README.md                 # This file
```

### Output

```
dist/
├── mas-widget.js             # Basic mode (415KB)
└── mas-widget-fullscreen.js  # Full-screen mode (415KB)
```

## 🎨 Customization

### API Endpoint

```javascript
const MAS_API = "https://api.mas.com/chatbot";
```

### Theme Colors

- Primary: Blue gradient (`#1e3a8a` to `#3b82f6`)
- Background: Light gray (`#f8fafc`)
- Messages: White with subtle borders

### Chat Storage

- **Key**: `mas_chat_messages`
- **Persistence**: localStorage
- **Session ID**: Timestamp-based

## 🧪 Testing

1. Build the project: `npx webpack`
2. Open `test/index.html` in a local server
3. Test both display modes using the toggle buttons
4. Check console for debug logs

## 📱 Mobile Support

- **Basic Mode**: Responsive width, maintains functionality
- **Full-Screen Mode**: Optimal mobile experience
- **Touch-Friendly**: Large buttons and input areas
- **Smooth Animations**: Optimized for mobile performance

## 🎯 Key Improvements

- ✅ **Removed Slick Carousel**: Reduced bundle size by 10KB
- ✅ **Optimized Full-Screen**: Better z-index and positioning
- ✅ **Debug Logging**: Easy troubleshooting
- ✅ **Responsive CSS**: Mobile-first approach
- ✅ **Clean Architecture**: Separated concerns
