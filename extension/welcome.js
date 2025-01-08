/************************************************************
 * welcome.js -- Local "Semantic-ish" Searching of Bookmarks
 * All code is contained here for simplicity.
 ************************************************************/

// --- UI Elements ---
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results').querySelector('.tweet-grid');
const statusText = document.getElementById('status-text');
const importButton = document.getElementById('import-button');

let allTweets = [];  // Will store tweet objects + their vectors (embedding)

// ----------------------------------------------------------
// 1) On Load, Check if Tweets Are Imported
// ----------------------------------------------------------
chrome.storage.local.get(null, (result) => {
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
    importButton.innerHTML = 'Re-Import Bookmarks';
    
    // Build local embeddings for all these tweets
    buildAllTweetEmbeddings(allTweets);
  }
});

// ----------------------------------------------------------
// 2) Import Button: Trigger background script
// ----------------------------------------------------------
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

// ----------------------------------------------------------
// 3) Listen for "tweetsReady" from background to load new tweets
// ----------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "tweetsReady") {
    const count = message.tweets ? message.tweets.length : 0;
    allTweets = message.tweets || [];
    statusText.textContent = `${count} bookmarks imported`;
    importButton.disabled = false;
    importButton.innerHTML = 'Re-Import Bookmarks';
    searchInput.disabled = false;

    // Build embeddings for newly imported tweets
    buildAllTweetEmbeddings(allTweets);

    if (sendResponse) {
      sendResponse({ status: "received" });
    }
  } else if (message.action === "importError") {
    statusText.textContent = message.error;
    importButton.disabled = false;
    importButton.innerHTML = 'Import Failed - Try Again';
  }
});

// ----------------------------------------------------------
// 4) Build Embeddings for Tweets
//    - "Semantic-ish" local approach: TF-IDF or word hashing
// ----------------------------------------------------------
/**
 * For demonstration, let's do a simple TF-IDF-like approach
 * 1. Collect all text from all tweets to build a "vocabulary"
 * 2. Calculate IDF for each word
 * 3. For each tweet, build a vector of TF * IDF
 */
let globalVocabulary = {};  // { word -> docCountInWhichItAppears }
let idfScores = {};         // { word -> IDF }

function buildAllTweetEmbeddings(tweets) {
  if (!tweets || tweets.length === 0) return;

  // 1) Build "corpus" of all tokens
  const docs = tweets.map(t => getTweetText(t));

  // 2) Build vocabulary counts: how many docs a word appears in
  globalVocabulary = {};
  docs.forEach((docText) => {
    // For each doc, track unique words
    const wordSet = new Set(tokenize(docText));
    wordSet.forEach(word => {
      globalVocabulary[word] = (globalVocabulary[word] || 0) + 1;
    });
  });

  // 3) Compute IDF (inverse doc frequency) for each word
  //    IDF(word) = log(totalDocs / (1 + docCountForWord))
  const totalDocs = docs.length;
  for (const word in globalVocabulary) {
    const docCount = globalVocabulary[word];
    idfScores[word] = Math.log(totalDocs / (1 + docCount));
  }

  // 4) Build vector for each tweet
  tweets.forEach((tweet, idx) => {
    const text = getTweetText(tweet);
    tweet.embedding = computeTfIdfVector(text);
  });

  console.log('Local TF-IDF embeddings built for all tweets!');
}

/**
 * Return the relevant text from tweet for embedding
 */
function getTweetText(tweet) {
  const authorName = tweet.author?.name || '';
  const authorScreenName = tweet.author?.screen_name || '';
  const tweetText = tweet.full_text || '';
  // Combine them for a richer representation
  return `${tweetText} ${authorName} ${authorScreenName}`;
}

/**
 * Tokenize text into words, removing punctuation and converting to lowercase
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Compute TF-IDF vector for a single piece of text
 */
function computeTfIdfVector(text) {
  // 1) Tokenize
  const words = tokenize(text);
  if (words.length === 0) {
    // If no words, return empty or zero vector. We'll store it as a map for simplicity
    return {};
  }

  // 2) Count frequency of each word in this doc
  const freqMap = {};
  words.forEach(word => {
    freqMap[word] = (freqMap[word] || 0) + 1;
  });

  // 3) Build vector: for each word that appears, TF * IDF
  // We store it as an object: { word -> tfidfScore }
  const tfidfVec = {};
  const maxFreq = Math.max(...Object.values(freqMap));
  for (const w in freqMap) {
    const tf = freqMap[w] / maxFreq; // normalized term freq
    const idf = idfScores[w] || 0;   // if the word wasn't in globalVocabulary for some reason
    tfidfVec[w] = tf * idf;
  }

  return tfidfVec;
}

// ----------------------------------------------------------
// 5) Cosine Similarity for "Sparse" TF-IDF Vectors
// ----------------------------------------------------------
function cosineSimilaritySparse(vecA, vecB) {
  // vecA and vecB are objects like: { word -> tfidfScore }
  // sum over common words
  let dot = 0;
  let magA = 0;
  let magB = 0;

  // dot product
  for (const w in vecA) {
    if (w in vecB) {
      dot += vecA[w] * vecB[w];
    }
  }

  // magnitude of A
  for (const w in vecA) {
    magA += vecA[w] * vecA[w];
  }

  // magnitude of B
  for (const w in vecB) {
    magB += vecB[w] * vecB[w];
  }

  // final cos sim
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ----------------------------------------------------------
// 6) Debounced Search: embed query -> compare -> show top 10
// ----------------------------------------------------------
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Actually run the "semantic" search
 */
const performSearch = debounce((query) => {
  // If user clears
  if (!query) {
    searchResults.innerHTML = '';
    return;
  }

  // If no tweets, or we haven't built embeddings yet
  if (!allTweets?.length || !allTweets[0]?.embedding) {
    return;
  }

  // Embed the query (TF-IDF)
  const queryVector = computeTfIdfVector(query);

  // Score each tweet
  const scored = allTweets.map(tweet => {
    const sim = cosineSimilaritySparse(queryVector, tweet.embedding);
    return { tweet, similarity: sim };
  });

  // Sort descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Take top 10
  const top10 = scored.slice(0, 10);

  // Clear results
  searchResults.innerHTML = '';

  if (top10.length > 0) {
    top10.forEach(({ tweet }) => {
      searchResults.appendChild(createTweetDisplay(tweet));
    });
  } else {
    searchResults.innerHTML = `
      <div class="status-message rounded-lg p-4" style="grid-column: 1 / -1;">
        <p class="text-white/60">No tweets found matching "${query}"</p>
      </div>
    `;
  }
}, 300);

// Hook up the search input
searchInput.addEventListener('input', (e) => performSearch(e.target.value));

// ----------------------------------------------------------
// 7) Create Tweet Display
// ----------------------------------------------------------
function createTweetDisplay(tweet) {
  const container = document.createElement('div');
  container.className = 'tweet-container p-4';

  // Format the date
  const date = new Date(tweet.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  container.innerHTML = `
    <div class="flex items-center gap-3 mb-2">
      <img src="${tweet.author.profile_image_url}" alt="" class="w-12 h-12 rounded-full">
      <div>
        <div class="font-medium text-white">${tweet.author.name}</div>
        <div class="text-white/60">@${tweet.author.screen_name}</div>
      </div>
    </div>
    <div class="text-white/90 mb-2 whitespace-pre-wrap">${tweet.full_text}</div>
    ${
      tweet.media
        ? `
          <div class="mb-2">
            ${
              tweet.media.type === 'photo'
                ? `<img src="${tweet.media.source}" alt="" class="w-full rounded-lg">`
                : (tweet.media.type === 'video' || tweet.media.type === 'animated_gif')
                  ? `<video src="${tweet.media.source}" controls class="w-full rounded-lg"></video>`
                  : ''
            }
          </div>
        `
        : ''
    }
    <div class="flex justify-between items-center text-sm text-white/40">
      <span>${formattedDate}</span>
      <a href="${tweet.url}" target="_blank" rel="noopener noreferrer"
         class="hover:text-white transition-colors">
        View on Twitter →
      </a>
    </div>
  `;
  
  return container;
}
