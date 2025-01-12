/************************************************************
 * welcome.js -- Local "Semantic-ish" Searching of Bookmarks
 * Uses Transformers.js for local embeddings (no API keys).
 ************************************************************/

import { pipeline } from './lib/transformers.min.js';
import { BookmarksChat } from './chat.js';

// --- UI Elements ---
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results').querySelector('.tweet-grid');
const statusText = document.getElementById('status-text');

let allTweets = [];      // Will store tweet objects + their embeddings
let embeddingPipeline;   // Pipeline for local embeddings from Transformers.js
let isProcessingEmbeddings = false;
const BATCH_SIZE = 10; // Increased batch size
const CACHE_KEY = 'tweet_embeddings_cache';

// After embeddings are processed and tweets are loaded
let chat;

// Add settings functionality
const settingsButton = document.getElementById('settings-button');
const settingsPopup = document.getElementById('settings-popup');
const settingsClose = document.querySelector('.settings-close');
const saveApiKey = document.getElementById('save-api-key');
const apiKeyInput = document.getElementById('xai-api-key');

// Load saved API key
chrome.storage.local.get(['xaiApiKey'], (result) => {
  if (result.xaiApiKey) {
    apiKeyInput.value = result.xaiApiKey;
  }
});

// Toggle settings popup
settingsButton.addEventListener('click', () => {
  settingsPopup.classList.remove('hidden');
});

settingsClose.addEventListener('click', () => {
  settingsPopup.classList.add('hidden');
});

// Close on click outside
settingsPopup.addEventListener('click', (e) => {
  if (e.target === settingsPopup) {
    settingsPopup.classList.add('hidden');
  }
});

// Save API key
saveApiKey.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  chrome.storage.local.set({ xaiApiKey: apiKey }, () => {
    // Show success notification
    const notification = document.getElementById('notification-popup');
    const notificationText = document.getElementById('notification-text');
    notificationText.textContent = 'API key saved successfully!';
    notification.classList.remove('hidden');
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
    
    settingsPopup.classList.add('hidden');
  });
});

// ----------------------------------------------------------
// 1) On Load, Check if Tweets Are Imported and Trigger Import
// ----------------------------------------------------------
chrome.storage.local.get(null, async (result) => {
  const meta = result.bookmarked_tweets_meta;
  if (meta) {
    // Gather all tweets in memory
    allTweets = [];
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunk = result[`bookmarked_tweets_${i}`];
      if (chunk?.tweets) {
        allTweets.push(...chunk.tweets);
      }
    }
    
    statusText.textContent = `${meta.totalTweets} bookmarks imported`;
    searchInput.disabled = false;
    
    // Try to load cached embeddings first
    const cache = await loadEmbeddingCache();
    if (cache) {
      // Apply cached embeddings to tweets
      let cacheHits = 0;
      allTweets.forEach(tweet => {
        if (cache[tweet.id]) {
          tweet.embedding = cache[tweet.id];
          cacheHits++;
        }
      });
      console.log(`Loaded ${cacheHits} embeddings from cache`);
      
      // Only build embeddings for tweets without them
      const tweetsNeedingEmbeddings = allTweets.filter(t => !t.embedding);
      if (tweetsNeedingEmbeddings.length > 0) {
        statusText.textContent = `Building embeddings for ${tweetsNeedingEmbeddings.length} new tweets...`;
        await buildAllTweetEmbeddings(tweetsNeedingEmbeddings);
      } else {
        statusText.textContent = `${allTweets.length} bookmarks ready for search`;
      }
    } else {
      // Build embeddings for all tweets
      await buildAllTweetEmbeddings(allTweets);
    }
  } else {
    // Automatically trigger import
    statusText.textContent = 'please wait while we import your bookmarks...';
    chrome.runtime.sendMessage({ action: "exportBookmarks" });
  }
});

// Cache management functions
async function loadEmbeddingCache() {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    return result[CACHE_KEY] || null;
  } catch (error) {
    console.warn('Error loading embedding cache:', error);
    return null;
  }
}

async function updateEmbeddingCache(tweets) {
  try {
    const cache = await loadEmbeddingCache() || {};
    tweets.forEach(tweet => {
      if (tweet.embedding) {
        cache[tweet.id] = tweet.embedding;
      }
    });
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  } catch (error) {
    console.warn('Error updating embedding cache:', error);
  }
}

// ----------------------------------------------------------
// 2) Listen for Import Results
// ----------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "tweetsReady") {
    const count = message.tweets ? message.tweets.length : 0;
    allTweets = message.tweets || [];
    statusText.textContent = `${count} bookmarks imported`;
    searchInput.disabled = false;

    // Build embeddings for newly imported tweets
    buildAllTweetEmbeddings(allTweets).then(() => {
      console.log("All tweet embeddings built!");
    });

    if (sendResponse) {
      sendResponse({ status: "received" });
    }
  } else if (message.action === "importError") {
    statusText.textContent = message.error;
  }
});

// ----------------------------------------------------------
// 3) Search Input Handler (Using Cosine Similarity of Embeddings)
// ----------------------------------------------------------
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Clear results if search is emptied
  if (!e.target.value.trim()) {
    searchResults.innerHTML = '';
    statusText.textContent = `${allTweets.length} tweets ready for search`;
    return;
  }
  
  // Debounce search
  searchTimeout = setTimeout(async () => {
    const query = e.target.value.trim();
    if (!query) {
      displayTweets(allTweets.slice(0, 50)); // Show first 50 tweets when no query
      statusText.textContent = `${allTweets.length} tweets ready for search`;
      return;
    }

    try {
      // Show loading state
      statusText.textContent = 'Searching...';
      
      // Embed the query text
      const queryEmbedding = await getEmbeddingForText(query);
      if (!queryEmbedding) {
        displayTweets([]);
        return;
      }

      // Rank tweets by similarity
      const results = allTweets
        .map(tweet => ({
          tweet,
          score: tweet.embedding ? cosineSimilarity(queryEmbedding, tweet.embedding) : 0
        }))
        .filter(item => item.score > 0.3) // Only show reasonably good matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 50) // Limit to top 50 results
        .map(item => item.tweet);

      displayTweets(results);
      statusText.textContent = `found ${results.length} matches`;
    } catch (error) {
      console.error('Search error:', error);
      statusText.textContent = 'Search error occurred';
    }
  }, 300); // Wait 300ms after last keystroke before searching
});

// ----------------------------------------------------------
// 4) Display Tweets Using Custom Implementation
// ----------------------------------------------------------
function displayTweets(tweets) {
  // Clear previous results
  searchResults.innerHTML = '';
  
  if (tweets.length === 0) {
    searchResults.innerHTML = `
      <div class="tweet-loading">
        No tweets found
      </div>
    `;
    return;
  }

  // Create custom display for each tweet
  tweets.forEach(tweet => {
    searchResults.appendChild(createTweetDisplay(tweet));
  });
}

// ----------------------------------------------------------
// 5) Create Tweet Display
// ----------------------------------------------------------
function createTweetDisplay(tweet) {
  const container = document.createElement('div');
  container.className = 'tweet-container';

  // Format date
  const date = new Date(tweet.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Only set mediaClass if we actually have media
  let mediaSection = '';
  if (tweet.media) {
    const mediaCount = Array.isArray(tweet.media) ? tweet.media.length : 1;
    const mediaClass = ['single', 'double', 'triple', 'quad'][Math.min(mediaCount - 1, 3)];
    
    mediaSection = `
      <div class="tweet-media ${mediaClass}">
        ${Array.isArray(tweet.media) ? 
          tweet.media.map(m => 
            m.type === 'photo' 
              ? `<img src="${m.source}" alt="" loading="lazy">` 
              : `<video src="${m.source}" controls></video>`
          ).join('') 
          : tweet.media.type === 'photo'
            ? `<img src="${tweet.media.source}" alt="" loading="lazy">`
            : `<video src="${tweet.media.source}" controls></video>`
        }
      </div>
    `;
  }

  container.innerHTML = `
    <a href="${tweet.url}" 
       target="_blank" 
       rel="noopener noreferrer"
       class="tweet-overlay-link"
       aria-label="View tweet"></a>
    <div class="tweet-header">
      <img 
        src="${tweet.author.profile_image_url}" 
        alt="" 
        class="tweet-author-image"
      >
      <div class="tweet-author-info">
        <div class="tweet-author-name">${tweet.author.name}</div>
        <div class="tweet-author-handle">@${tweet.author.screen_name}</div>
      </div>
    </div>
    
    <div class="tweet-content">${tweet.full_text}</div>
    ${mediaSection}
    <div class="tweet-footer">
      <span class="tweet-date">${formattedDate}</span>
      <a href="${tweet.url}" 
         target="_blank" 
         rel="noopener noreferrer" 
         class="tweet-link">
        View on X →
      </a>
    </div>
  `;
  
  return container;
}

// ----------------------------------------------------------
// 6) Build Embeddings for Tweets (Local Transformers.js)
// ----------------------------------------------------------
async function buildAllTweetEmbeddings(tweets) {
  if (!tweets || tweets.length === 0 || isProcessingEmbeddings) return;
  
  isProcessingEmbeddings = true;
  const startTime = Date.now();
  
  try {
    // Initialize pipeline if needed
    if (!embeddingPipeline) {
      statusText.textContent = 'loading model...';
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { 
          progress_callback: null,
          config: {
            local: false,
            quantized: false,
            useWorker: false,
            wasmPath: chrome.runtime.getURL('lib/'),
            tokenizerId: 'Xenova/all-MiniLM-L6-v2'
          }
        }
      );
    }

    let processedCount = 0;
    const updateProgress = () => {
      const progress = Math.round((processedCount / tweets.length) * 100);
      const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const tweetsPerSecond = (processedCount / (Date.now() - startTime) * 1000).toFixed(1);
      statusText.textContent = `building search index... ${progress}% (${processedCount}/${tweets.length} tweets, ${tweetsPerSecond}/s)`;
    };

    // Process in batches
    for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
      const batch = tweets.slice(i, i + BATCH_SIZE);
      const batchTexts = batch.map(tweet => getTweetText(tweet));
      
      try {
        // Process batch of tweets
        const results = await Promise.all(
          batchTexts.map(text => 
            embeddingPipeline(text, { 
              pooling: 'mean', 
              normalize: true 
            })
          )
        );
        
        // Store embeddings
        results.forEach((result, idx) => {
          batch[idx].embedding = Array.from(result.data);
        });
        
        processedCount += batch.length;
        updateProgress();
        
        // Cache embeddings every few batches
        if (i % (BATCH_SIZE * 5) === 0) {
          await updateEmbeddingCache(batch);
        }
      } catch (error) {
        console.warn('Error processing batch:', error);
        // Continue with next batch even if this one failed
      }
      
      // Brief UI pause every few batches
      if (i % (BATCH_SIZE * 3) === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Final cache update
    await updateEmbeddingCache(tweets);
    
    chat = new BookmarksChat(
      tweets.map(t => t.embedding), 
      tweets,
      embeddingPipeline
    );
    chat.enable();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    statusText.textContent = `${tweets.length} bookmarks ready for search (processed in ${totalTime}s)`;
  } catch (error) {
    console.error('Error building embeddings:', error);
    statusText.textContent = 'Error building search index';
  } finally {
    isProcessingEmbeddings = false;
  }
}

/**
 * Return the relevant text from tweet for embedding
 * Emphasizes the tweet text, author name, and username
 */
function getTweetText(tweet) {
  const authorName = tweet.author?.name || '';
  const authorScreenName = tweet.author?.screen_name || '';
  const tweetText = tweet.full_text || '';
  return `${tweetText}\n${authorName}\n${authorScreenName}`.trim();
}

/**
 * Get an embedding vector from Transformers.js
 */
async function getEmbeddingForText(text) {
  try {
    if (!embeddingPipeline) {
      console.log("loading embedding model...");
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { 
          config: {
            local: false,
            quantized: false,
            useWorker: false
          }
        }
      );
    }

    // Get embeddings
    const result = await embeddingPipeline(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    return Array.from(result.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// ----------------------------------------------------------
// 7) Cosine Similarity for Embedding Arrays
// ----------------------------------------------------------
function cosineSimilarity(a, b) {
  if (!a || !b || !a.length || !b.length || a.length !== b.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Make displayTweets function global so it can be called from chat.js
window.displayTweets = displayTweets;

// Add clear button functionality
const searchClearButton = document.querySelector('.search-clear-button');
searchClearButton.addEventListener('click', () => {
  searchInput.value = '';
  searchInput.focus();
  searchResults.innerHTML = '';
  statusText.textContent = `${allTweets.length} tweets ready for search`;
  // Trigger input event to update UI
  searchInput.dispatchEvent(new Event('input'));
});
