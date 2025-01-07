const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const statusText = document.getElementById('status-text');
const importButton = document.getElementById('import-button');

// Check if bookmarks are already imported
chrome.storage.local.get('bookmarked_tweets_meta', (result) => {
  if (result.bookmarked_tweets_meta) {
    statusText.textContent = `${result.bookmarked_tweets_meta.totalTweets} bookmarks imported`;
    searchInput.disabled = false;
    importButton.innerHTML = 'Re-Import Bookmarks';
  }
});

// Import functionality
importButton.addEventListener('click', () => {
  importButton.disabled = true;
  importButton.innerHTML = `
    <span class="button-spinner"></span>
    Opening Twitter...
  `;
  statusText.textContent = 'Please wait while we import your bookmarks...';
  
  // Send message to background script to start import
  chrome.runtime.sendMessage({ action: "exportBookmarks" });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "tweetsReady") {
    const count = message.tweets ? message.tweets.length : 0;
    statusText.textContent = `${count} bookmarks imported`;
    importButton.disabled = false;
    importButton.innerHTML = 'Re-Import Bookmarks';
    searchInput.disabled = false;
    if (sendResponse) {
      sendResponse({ status: "received" });
    }
  } else if (message.action === "importError") {
    statusText.textContent = message.error;
    importButton.disabled = false;
    importButton.innerHTML = 'Import Failed - Try Again';
  }
});

// Search functionality
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    searchResults.innerHTML = '';
    return;
  }

  chrome.storage.local.get(null, (result) => {
    const tweets = [];
    // Collect all tweets from chunks
    Object.keys(result).forEach(key => {
      if (key.startsWith('bookmarked_tweets_') && !key.endsWith('meta')) {
        tweets.push(...result[key].tweets);
      }
    });

    // Filter tweets based on search query
    const filteredTweets = tweets.filter(tweet => 
      tweet.full_text?.toLowerCase().includes(query)
    );

    // Display results
    if (filteredTweets.length > 0) {
      searchResults.innerHTML = filteredTweets.map(tweet => `
        <div class="status-message rounded-lg p-4">
          <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
            <img src="${tweet.author.profile_image_url}" alt="" style="width: 48px; height: 48px; border-radius: 50%;">
            <div>
              <div style="font-weight: 500;" class="text-white">${tweet.author.name}</div>
              <div class="text-white/60">@${tweet.author.screen_name}</div>
            </div>
          </div>
          <p class="text-white/90" style="margin: 0.5rem 0;">${tweet.full_text}</p>
          ${tweet.media ? `
            <div style="margin: 0.5rem 0;">
              ${tweet.media.type === 'photo' ? 
                `<img src="${tweet.media.source}" alt="" style="max-width: 100%; border-radius: 0.5rem;">` :
                tweet.media.type === 'video' || tweet.media.type === 'animated_gif' ?
                `<video src="${tweet.media.source}" controls style="max-width: 100%; border-radius: 0.5rem;"></video>` :
                ''
              }
            </div>
          ` : ''}
          <a href="https://x.com/i/web/status/${tweet.id.split('-')[1]}" target="_blank" rel="noopener noreferrer" 
             class="text-white/40 hover:text-white" style="text-decoration: none; font-size: 0.875rem; display: inline-block; margin-top: 0.5rem;">
            View Tweet
          </a>
        </div>
      `).join('');
    } else {
      searchResults.innerHTML = `
        <div class="status-message rounded-lg p-4">
          <p class="text-white/60">No tweets found matching "${query}"</p>
        </div>
      `;
    }
  });
}); 