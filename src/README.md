# ⚡ PDF Workspace - Cyberpunk Edition ⚡

This branch is made with Figma Make using their AI(Guessing GPT-5) and then issues fixed by Qwen-Cli. it is still in developement; feel free to take a look!

## 🌟 Features

### 📄 Core PDF Management
- **Multi-PDF Support** - Open and manage multiple PDF files simultaneously
- **Advanced Snippet Capture** - Select and capture rectangular regions from PDF pages
- **Workspace Organization** - Organize snippets into workspaces and spaces
- **Real PDF Export** - Generate actual PDF documents with custom layouts
-   **Upscaling Backend Selection**: Choose between WebGPU (recommended) and WebGL backends for the upscaling process via a dedicated settings menu.

### 🤖 AI-Powered Enhancements
- **TensorFlow.js Integration** - Client-side AI processing with multiple backends
- **5 Upscaling Models** - Real-ESRGAN, Anime, and General Purpose models
- **Context Menu Integration** - Right-click any PDF page or snippet to upscale
- **Progressive Enhancement** - Works without AI features, enhanced with them

### 🎨 Advanced Layout Editor
- **Full-Screen Editor** - Immersive layout editing experience
- **Multi-Page Support** - Create complex documents with multiple pages
- **Layer Management** - Z-index controls for snippet ordering
- **Rotation & Positioning** - 360° rotation and precise positioning
- **Grid Snapping** - Optional grid alignment for perfect layouts

### 💾 Data Management
- **Local Storage Caching** - Persistent workspace data across sessions
- **Export/Import** - Full workspace backup and restore functionality
- **Memory Optimization** - Efficient handling of large PDF files and images

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Modern Browser** with WebGL/WebGPU support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pdf-workspace-cyberpunk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

### Build for Production

```bash
npm run build
npm run preview
```

## 🛠️ Development

### Project Structure

```
├── src/
│   ├── App.tsx                 # Main application component
│   └── main.tsx               # React app bootstrap
├── components/
│   ├── PDFViewer.tsx          # PDF viewing and capture
│   ├── WorkspaceManager.tsx   # Workspace organization
│   ├── CustomLayoutEditor.tsx # Advanced layout editor
│   ├── UpscalingDialog.tsx    # AI upscaling interface
│   ├── UpscalingService.tsx   # TensorFlow.js service
│   └── ui/                    # Shadcn/ui components
├── public/
│   ├── models      # Upsclaer Models Directory(64 batch sizes variants)
│   └── manifest.json         # PWA configuration
└── styles/
    └── globals.css           # TailwindCSS v4 configuration
```

### Key Technologies

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Full type safety and developer experience
- **TailwindCSS v4** - Latest Tailwind with improved performance
- **Vite** - Fast build tool with HMR
- **TensorFlow.js** - Client-side machine learning
- **PDF-lib** - PDF generation and manipulation
- **Radix UI** - Accessible component primitives

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎯 Usage Guide

### 1. PDF Management
- Click **"Add PDF"** to upload PDF files
- Navigate between pages using the page controls
- Close PDFs using the **X** button on each tab

### 2. Workspace Organization
- Create **Workspaces** for different projects
- Add **Spaces** within workspaces for categorization
- Use context menus (right-click) to delete items

### 3. Snippet Capture
- Select a space in the workspace tab
- Switch to PDF Viewer and enable **Capture Mode**
- Click and drag to select areas on PDF pages
- Captured snippets are automatically saved to the selected space

### 4. AI Image Upscaling
- **PDF Pages**: Right-click any PDF page → "Upscale Page with AI"
- **Snippets**: Right-click any snippet → "Upscale with AI"
- Choose from 5 different AI models optimized for different content types
- Select processing backend (WebGPU for speed, WebGL for compatibility)

### 5. Advanced Layout Editor
- Click **"Export PDF"** → **"Customize"** to open the layout editor
- Drag snippets to reposition them
- Use controls to rotate, resize, and layer snippets
- Add multiple pages and distribute snippets across them
- Export as production-ready PDF

### 6. Data Persistence
- All workspace data is automatically cached in browser storage
- Use **Export** to save workspace data as JSON files
- Use **Import** to restore workspace data from JSON files

## 🤖 AI Models

### Available Models

| Model | Best For | Speed | Quality |
|-------|----------|-------|---------|
| **Real-ESRGAN 4x Fast** | Photos, screenshots | ⚡⚡⚡ | ⭐⭐⭐ |
| **Real-ESRGAN 4x Plus** | High-quality photos | ⚡⚡ | ⭐⭐⭐⭐ |
| **General Purpose** | Mixed content | ⚡⚡ | ⭐⭐⭐ |
| **Anime 4x** | Illustrations, drawings | ⚡⚡ | ⭐⭐⭐ |
| **Anime 4x Plus** | High-quality anime art | ⚡ | ⭐⭐⭐⭐⭐ |

### Processing Backends

- **WebGPU**: Fastest performance on supported browsers (Chrome 113+)
- **WebGL**: Best compatibility across all modern browsers
- **CPU**: Fallback option, slower but works everywhere

## 🔧 Configuration

### Environment Setup

The application requires specific security headers for TensorFlow.js:

```html
<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin" />
<meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp" />
```

These are automatically configured in the Vite development server.

### Customization

- **Themes**: Modify `/styles/globals.css` for color schemes
- **Models**: Add new AI models by placing them in `/public/models/`
- **UI Components**: Extend Shadcn/ui components in `/components/ui/`

## 📱 Browser Support

### Minimum Requirements
- **Chrome/Edge** 90+
- **Firefox** 88+
- **Safari** 14+

### Optimal Experience
- **Chrome/Edge** 113+ (WebGPU support)
- **8GB+ RAM** for large PDF processing
- **Dedicated GPU** for AI upscaling

## 🚨 Limitations

- **File Size**: Large PDFs (>50MB) may cause performance issues
- **AI Processing**: First-time model download can take 2-5 minutes
- **Browser Storage**: Limited by browser's IndexedDB quota
- **Privacy**: All processing happens locally in the browser

## 🐛 Troubleshooting

### Common Issues

**"AI upscaling not working"**
- Ensure browser supports WebGL/WebGPU
- Try switching to CPU backend
- Check browser console for errors

**"PDF not loading"**
- Verify PDF file is not corrupted
- Check file size (recommend <20MB)
- Try a different PDF file

**"Workspace data lost"**
- Check browser storage permissions
- Export workspace data regularly
- Avoid clearing browser data

**"Layout editor performance issues"**
- Reduce number of snippets per page
- Lower zoom level
- Close other browser tabs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments
- **TensorFlow.js Team** - For client-side ML capabilities
- **Radix UI** - For accessible component primitives
- **Shadcn/ui** - For beautiful component library
- **PDF-lib** - For PDF manipulation capabilities
- **Real-ESRGAN** - For state-of-the-art image upscaling models
- ****

---

The UI is Built with ⚡ , fast and almost flawless using Figma Make!


