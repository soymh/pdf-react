# ⚡ PDF Workspace - Cyberpunk Edition ⚡

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)

A dynamic, cyberpunk-themed web application built with React for advanced PDF interaction. Go beyond simple viewing—capture regions, organize snippets into "Spaces" and "Workspaces," and compile them into new documents. This project explores modern React features and demonstrates handling complex UI/UX with third-party libraries.

## Key Features

-   **Multi-PDF Viewer**: Load and view multiple PDF documents side-by-side in a scrollable workspace.
-   **Region Capture**: Select any rectangular area on a PDF page with your mouse to create an image snippet.
-   **"Spaces" for Organization**: Create distinct digital "Spaces" within "Workspaces" to collect and group your captured snippets.
-   **Drag-and-Drop Reordering**: Easily reorder your captured images within a Space using a smooth drag-and-drop interface.
-   **PDF Export**: Compile all the captures within a Space into a brand new, single PDF document, preserving the order you set.
-   **Persistent State**: Your created Workspaces, Spaces, and captures are automatically saved to your browser's `IndexedDB`, ensuring your work is preserved between sessions.
-   **Workspace Import/Export**: Import and export entire workspaces, including all associated PDFs (binaries) and spaces with captures, for easy migration and backup.
-   **Single-Page PDF Upscaling**: Enhance the quality of individual PDF pages by upscaling them, replacing the original page with its high-resolution version within the PDF document. (Powered by a web-optimized Real-ESRGAN implementation from [xororz/web-realesrgan](https://github.com/xororz/web-realesrgan), using the `realx4v3-fast` model by default).
-   **Upscaling Backend Selection**: Choose between WebGPU (recommended) and WebGL backends for the upscaling process via a dedicated settings menu.
-   **Immersive Upscaling Feedback**: During upscaling, enjoy a custom loading experience featuring a circular progress bar, a subtle blur on the target PDF, and dynamic, looping cyberpunk-themed messages with magic sparks.
-   **Zen Mode**: Minimize distractions with a dedicated Zen Mode for focused PDF viewing.
-   **Responsive & Dynamic UI**: A sleek, cyberpunk-themed interface featuring a hover-to-expand sidebar and fluid animations.

## Tech Stack

-   **[React](https://reactjs.org/)**: The core UI library for building the component-based architecture.
-   **[PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`)**: A powerful library from Mozilla for parsing and rendering PDF documents onto an HTML `<canvas>`.
-   **[pdf-lib](https://pdf-lib.js.org/)**: For programmatically creating new PDF documents and embedding images.
-   **[TensorFlow.js](https://www.tensorflow.org/js)**: The machine learning library used within the web worker for image upscaling algorithms.
-   **Web Workers**: Crucial for offloading computationally intensive image upscaling tasks from the main thread.
-   **IndexedDB**: Persistent storage (via `src/db.js`) for PDF binary data, workspaces, and spaces.
-   **[jsPDF](https://github.com/parallax/jsPDF)**: Used to generate the final, combined PDF from the captured image snippets (for Space export).
-   **[React SortableJS](https://github.com/SortableJS/react-sortablejs)**: A React wrapper for the powerful `Sortable.js` library to enable drag-and-drop functionality.
-   **CSS3**: Custom styling for the unique cyberpunk theme, including complex animations, flexbox/grid layouts, and the hover-based UI.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) (version 14 or later) and `npm` installed on your computer.

### Installation

1.  **Clone the repository**
    ```sh
    git clone https://github.com/soymh/pdf-react.git
    ```

2.  **Navigate to the project directory**
    ```sh
    cd pdf-react
    ```

3.  **Install NPM packages**
    ```sh
    npm install
    ```

4.  **Run the application**
    ```sh
    npm start
    ```

The app will open automatically in your browser at `http://localhost:3000`.

## Project Structure

The project is organized with a clear and scalable component-based structure.

```
pdf-react/
├── .github/              # GitHub Actions workflows
│   └── workflows/
│       └── release.yml   # Workflow for creating releases
├── public/
│   ├── favicon.ico         # Website favicon
│   ├── index.html          # The main HTML file for the application
│   ├── logo192.png         # PWA icon (192x192)
│   ├── logo512.png         # PWA icon (512x512)
│   ├── manifest.json       # Web application manifest for PWA features
│   ├── models/             # Directory for AI/ML models (e.g., Real-ESRGAN models)
│   │   └── realx4v3-fast/  # Default Real-ESRGAN model files
│   │       ├── group1-shard1of1.bin # Model weights
│   │       └── model.json           # Model architecture configuration
│   ├── pdf.worker.min.mjs  # PDF.js worker module for off-main-thread PDF rendering
│   └── robots.txt          # Directives for web crawlers
├── src/
│   ├── assets/             # Static assets like icons, images, etc.
│   │   └── icons/          # (Optional) Directory for SVG icons, if used (currently empty)
│   ├── components/         # Reusable React UI components
│   │   ├── CreateSpaceModal.js     # Modal for creating new PDF spaces
│   │   ├── CreateWorkspaceModal.js # Modal for creating new workspaces
│   │   ├── Header.js               # Application header and main controls
│   │   ├── Notification.js         # UI component for displaying toast notifications
│   │   ├── PageEditor.css          # Styles for the PageEditor component
│   │   ├── PageEditor.js           # Component for editing pages within a space
│   │   ├── PdfViewer.js            # Component for rendering and interacting with a single PDF document
│   │   ├── SettingsMenu.js         # Modal for application settings (e.g., upscaling backend)
│   │   ├── SpaceItem.js            # Represents a single space and its captures within SpacesPanel
│   │   ├── SpacesPanel.js          # Sidebar panel for managing PDF spaces and captures
│   │   └── WorkspacesPanel.js      # Sidebar panel for managing different workspaces
│   ├── App.css             # Global and component-specific styles for the application
│   ├── App.js              # The main application component, manages global state, routing, and core logic
│   ├── App.test.js         # Jest tests for the main App component
│   ├── db.js               # IndexedDB utility functions for persistent data storage
│   ├── index.css           # Base styles for the application
│   ├── index.js            # Entry point for the React application, renders the App component
│   ├── logo.svg            # React logo SVG
│   ├── reportWebVitals.js  # Utility for measuring application performance (Web Vitals)
│   ├── setupTests.js       # Configuration for Jest/React Testing Library setup
│   ├── upscaleImage.js     # Helper module for initiating image upscaling with the web worker
│   ├── upscalePdf.js       # (Future use or broader PDF upscaling logic - currently not in use)
│   └── upscaleWorker.js    # Dedicated Web Worker for running the computationally intensive upscaling model
├── .gitignore            # Specifies intentionally untracked files to ignore
├── package.json          # Lists project dependencies, scripts, and metadata
└── README.md             # This comprehensive project documentation
```

## Future Ideas

This project has a solid foundation and is continuously evolving. Here are some ideas for future enhancements:
-   [x] Implement easy captured sections manipulation (e.g., Add Multiple captured pages freely in a PDF page).
-   [ ] Add more AI tools; e.g. make Markdown Notes out of your captured PDFs!
-   [ ] Implement a cloud api trigger for converting notes to markdown using Vision AI models.
-   [ ] Add more export options (e.g., export spaces as images).
-   [ ] Enhance accessibility (ARIA attributes, keyboard navigation).
-   [ ] Implement multi-language support.

## License

This project is distributed under the MIT License. See `LICENSE` for more information (you can create this file if you want, or just leave this note).

---
*This README was generated with care using AI! Feel free to contribute by opening an issue or a pull request!*

