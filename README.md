# Bookmarks Wrapped

Bookmarks Wrapped is a Chrome extension similar to Spotify Wrapped. See your top bookmarked accounts, reading time stats, and monthly trends in a beautiful presentation.

## Features

- View your 2024 Twitter bookmarks statistics in an engaging slideshow format
- See your top bookmarked accounts
- Track your reading time and monthly bookmarking trends
- Beautiful, interactive UI with smooth transitions
- Share your stats with friends
- Privacy-focused: all processing happens locally in your browser

## Project Structure

The project consists of two main components:

### Extension (`/extension`)
- Chrome extension that processes your bookmarks and generates the wrapped experience
- Built with vanilla JavaScript, HTML, and CSS
- Uses html2canvas for generating shareable images

### Landing Page (`/landing`)
- Marketing website for the extension
- Built with Vite, TailwindCSS, and deployed on Firebase
- Modern, responsive design

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `extension` directory

## Usage

1. Click on the extension icon in your Chrome toolbar
2. Click "🎁 Wrap Your Bookmarks 🎁"
3. Enjoy your personalized bookmarks wrapped experience!
4. Share your stats with friends

## Development

### Extension
```bash
cd extension
# Load unpacked extension in Chrome for development
```

### Landing Page
```bash
cd landing
npm install
npm run dev     # Start development server
npm run build   # Build for production
firebase deploy  # Deploy to Firebase
```

Note: You need to have a firebase project setup and the firebase cli installed.

## File Structure

### Extension
- `manifest.json`: Extension configuration
- `popup.html/js/css`: Main extension UI and logic
- `background.js`: Background script for bookmark processing
- `content.js`: Content script for page interaction
- `html2canvas.min.js`: For generating shareable images

### Landing Page
- `src/`: Source code for the landing page
- `public/`: Static assets
- `dist/`: Built files
- Configuration files for Vite, TailwindCSS, and Firebase

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Disclaimer

This project is not affiliated with, endorsed, or sponsored by Twitter/X Corp. Use at your own risk. Please don't sue me, Elon 🙏
