console.log("Content script loaded");

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "showLoader") {
    console.log("Showing loader");
    createLoadingIndicator();
    sendResponse({ status: "loader shown" });
  }
  
  if (message.action === "hideLoader") {
    console.log("Hiding loader");
    const loader = document.getElementById('bookmarks-wrapped-loader');
    if (loader) {
      loader.remove();
    }
    sendResponse({ status: "loader hidden" });
  }
  
  return true; // Keep the message channel open
});

function createLoadingIndicator() {
  console.log("Creating loading indicator");
  
  // Remove existing loader if any
  const existingLoader = document.getElementById('bookmarks-wrapped-loader');
  if (existingLoader) {
    existingLoader.remove();
  }

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
  text.textContent = 'fetching your bookmarks (don\'t close this tab)';

  loadingDiv.appendChild(spinner);
  loadingDiv.appendChild(text);
  document.body.appendChild(loadingDiv);
  
  console.log("Loading indicator created and added to page");
}

// Add this to verify the script is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content script DOM ready');
});

