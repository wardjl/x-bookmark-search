# Twitter Bookmarks Search

A Chrome extension that enables semantic search of your Twitter bookmarks using local LangChain embeddings. Find your bookmarked tweets by searching for concepts and meaning, not just keywords.

## Features

- 🔍 Semantic search across your Twitter bookmarks
- 🧠 Uses LangChain and embeddings for concept-based matching
- 💨 Fast local search - no cloud/API dependencies
- 🔒 Privacy-focused: all processing happens in your browser
- 🎯 Find tweets based on meaning and concepts, not just exact text matches
- 📱 Works directly in your Twitter interface

## How It Works

1. The extension processes your Twitter bookmarks locally
2. Creates embeddings using LangChain to understand the semantic meaning of tweets
3. When you search, it finds tweets that match the concept you're looking for
4. Results are ranked by semantic similarity to your query

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `extension` directory

## Usage

1. Go to Twitter and open your bookmarks
2. Use the search bar added by the extension
3. Enter your search query - try searching for concepts!
4. See results ranked by semantic relevance

## Project Structure

- `manifest.json`: Extension configuration
- `content.js`: Handles Twitter page integration and UI
- `background.js`: Manages bookmark processing and search
- `popup.html/js/css`: Extension popup interface

## Credit to Forked Project

This project was heavily inspired by and built upon the functionality provided by the [bookmarks-wrapped](https://github.com/sahil-lalani/bookmarks-wrapped) project by [Sahil Lalani](https://github.com/sahil-lalani). Much of the core functionality, including bookmark processing and search mechanisms, was adapted from this excellent work. Special thanks to Sahil Lalani for laying the foundation.

## Development

```bash
# Load unpacked extension in Chrome for development
1. Enable Chrome Developer Mode
2. Load the /extension directory
```

## Privacy

This extension:
- Runs 100% locally in your browser
- Does not send your bookmarks or searches to any server
- Does not require any API keys or cloud services
- Is completely open source

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details
