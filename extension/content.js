chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {
        if (request.action === "screenshot") {
            try {
                const slideContent = document.querySelector('.slide-content');
                if (!slideContent) {
                    sendResponse({error: "No slide content found"});
                    return;
                }

                const canvas = await html2canvas(slideContent, {
                    backgroundColor: '#1a1f2e',
                    scale: 2, // Higher resolution
                    logging: false
                });
                
                const dataURL = canvas.toDataURL("image/png", 1.0);
                sendResponse({imageData: dataURL});
            } catch (error) {
                console.error('Screenshot error:', error);
                sendResponse({error: error.message});
            }
        }
        return true; // Keep the message channel open
    }
);

// Create and inject the loading indicator
function createLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'bookmarks-wrapped-loader';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 20px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 20px;
    height: 20px;
    border: 3px solid #ffffff;
    border-top: 3px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const text = document.createElement('span');
  text.textContent = 'Fetching bookmarks from 2024 (don\'t close this tab)';

  loadingDiv.appendChild(spinner);
  loadingDiv.appendChild(text);
  document.body.appendChild(loadingDiv);
}

// Function to remove the loading indicator
function removeLoadingIndicator() {
  const loader = document.getElementById('bookmarks-wrapped-loader');
  if (loader) {
    loader.remove();
  }
}

// Listen for the hideLoader message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "hideLoader") {
    removeLoadingIndicator();
  }
});

// Only create the loading indicator if we're on the bookmarks page
if (window.location.href.includes('x.com/i/bookmarks')) {
  createLoadingIndicator();
}
