
# ⚡ PDF Workspace - Cyberpunk Edition ⚡

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)

A dynamic, cyberpunk-themed web application built with React for advanced PDF interaction. Go beyond simple viewing—capture regions, organize snippets into "Spaces," and compile them into new documents. This project was built to explore modern React features and demonstrate handling complex UI/UX with third-party libraries like PDF.js.

## Key Features

-   **Multi-PDF Viewer**: Load and view multiple PDF documents side-by-side in a scrollable workspace.
-   **Region Capture**: Select any rectangular area on a PDF page with your mouse to create an image snippet.
-   **"Spaces" for Organization**: Create distinct workspaces (called "Spaces") to collect and group your captured snippets.
-   **Drag-and-Drop Reordering**: Easily reorder your captured images within a Space using a smooth drag-and-drop interface.
-   **PDF Export**: Compile all the captures within a Space into a brand new, single PDF document, preserving the order you set.
-   **Persistent State**: Your created Spaces and captures are automatically saved to your browser's `localStorage`, so your work is preserved between sessions.
-   **Responsive & Dynamic UI**: A sleek, cyberpunk-themed interface featuring a hover-to-expand sidebar and fluid animations.

## Tech Stack

-   **[React](https://reactjs.org/)**: The core UI library for building the component-based architecture.
-   **[PDF.js](https://mozilla.github.io/pdf.js/)**: (`pdfjs-dist`) A library from Mozilla for rendering PDF documents onto an HTML `<canvas>`.
-   **[jsPDF](https://github.com/parallax/jsPDF)**: Used to generate the final, combined PDF from the captured image snippets.
-   **[React SortableJS](https://github.com/SortableJS/react-sortablejs)**: A React wrapper for the powerful `Sortable.js` library to enable drag-and-drop functionality.
-   **CSS3**: Custom styling for the unique cyberpunk theme, including animations, flexbox/grid layouts, and the hover-based UI.

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
├── public/
│   ├── index.html          # The root HTML file
│   └── pdf.worker.min.js   # PDF.js worker file for performance
│
├── src/
│   ├── components/         # All reusable React components
│   │   ├── CreateSpaceModal.js
│   │   ├── Header.js
│   │   ├── Notification.js
│   │   ├── PdfViewer.js
│   │   └── SpacesPanel.js
│   │
│   ├── App.js              # The main application component, holds the primary state
│   ├── App.css             # All styles for the application
│   └── index.js            # The entry point for the React app
│
├── .gitignore
├── package.json
└── README.md
```

## Future Ideas

This project has a solid foundation. Here are some ideas for future enhancements:
-   [x] Implement easy captured sections manipulation (e.g., Add Multiple captured pages freely in a PDF page).
-   [ ] Add AI tools to make Markdown Notes out of your captured PDFs!
-   [ ] Implement a cloud api trigger for converting notes to markdown using Vision AI models.
-   [ ] Add more export options...
-   [ ] Enhance accessibility (ARIA attributes, keyboard navigation).

## License

This project is distributed under the MIT License. See `LICENSE` for more information (you can create this file if you want, or just leave this note).

---
*This README was generated with care using AI! Feel free to contribute by opening an issue or a pull request!*
