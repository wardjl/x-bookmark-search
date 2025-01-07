chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: 'popup.html'
  });
});

const getTweetYear = (timestamp) => {
  return new Date(timestamp).getFullYear();
};

let isDone = false;
let not2024count = 0;

const getBookmarks = async (cursor = "", totalImported = 0, allTweets = []) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(
      ["cookie", "csrf", "auth", "bookmarksApiId", "features"],
      async (result) => {
        try {
          if (!result.cookie || !result.csrf || !result.auth || !result.bookmarksApiId || !result.features) {
            console.log("Missing required data:", {
              cookie: !!result.cookie,
              csrf: !!result.csrf,
              auth: !!result.auth,
              bookmarksApiId: !!result.bookmarksApiId,
              features: !!result.features
            });
            reject(new Error("Missing required data"));
            return;
          }

          const headers = new Headers();
          headers.append("Cookie", result.cookie);
          headers.append("X-Csrf-token", result.csrf);
          headers.append("Authorization", result.auth);

          const variables = {
            count: 100,
            cursor: cursor,
            includePromotedContent: false,
          };

          const API_URL = `https://x.com/i/api/graphql/${
            result.bookmarksApiId
          }/Bookmarks?features=${encodeURIComponent(
            JSON.stringify(result.features)
          )}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

          console.log("Fetching bookmarks from:", API_URL);

          const response = await fetch(API_URL, {
            method: "GET",
            headers: headers,
            credentials: 'include'
          });

          if (!response.ok) {
            console.error("API error:", response.status);
            if (response.status === 429) {
              console.log("Rate limited, waiting 60s before retry...");
              await new Promise(resolve => setTimeout(resolve, 60000));
              const retryResult = await getBookmarks(cursor, totalImported, allTweets);
              resolve(retryResult);
              return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log("Received data:", data);

          const entries = data.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries || [];
          const tweetEntries = entries.filter(entry => entry.entryId.startsWith("tweet-"));
          const parsedTweets = tweetEntries.map(parseTweet);

          allTweets.push(...parsedTweets);
          
          // Store tweets in chunks to avoid storage limits
          const lastUpdateTime = new Date().toISOString();
          const tweetChunks = [];
          for (let i = 0; i < allTweets.length; i += 100) {
            tweetChunks.push({
              tweets: allTweets.slice(i, i + 100),
              chunkIndex: Math.floor(i / 100),
              totalChunks: Math.ceil(allTweets.length / 100),
              lastUpdated: lastUpdateTime
            });
          }

          // Store each chunk
          for (const chunk of tweetChunks) {
            await new Promise((resolve) => {
              chrome.storage.local.set({
                [`bookmarked_tweets_${chunk.chunkIndex}`]: chunk
              }, resolve);
            });
          }

          // Store metadata
          await new Promise((resolve) => {
            chrome.storage.local.set({
              bookmarked_tweets_meta: {
                totalTweets: allTweets.length,
                totalChunks: tweetChunks.length,
                lastUpdated: lastUpdateTime
              }
            }, resolve);
          });

          console.log(`Stored ${allTweets.length} tweets in ${tweetChunks.length} chunks`);

          const nextCursor = getNextCursor(entries);
          if (nextCursor && parsedTweets.length > 0) {
            // Add delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = await getBookmarks(nextCursor, totalImported + parsedTweets.length, allTweets);
            resolve(result);
          } else {
            console.log("Completed fetching bookmarks. Total:", allTweets.length);
            resolve(allTweets);
          }
        } catch (error) {
          console.error("Error in getBookmarks:", error);
          reject(error);
        }
      }
    );
  });
};

const parseTweet = (entry) => {
  const tweet = entry.content?.itemContent?.tweet_results?.result?.tweet || entry.content?.itemContent?.tweet_results?.result;

  // Safely access media, handling potential undefined values
  const media = tweet?.legacy?.entities?.media?.[0] || null;

  const getBestVideoVariant = (variants) => {
    if (!variants || variants.length === 0) return null;
    const mp4Variants = variants.filter(v => v.content_type === "video/mp4");
    return mp4Variants.reduce((best, current) => {
      if (!best || (current.bitrate && current.bitrate > best.bitrate)) {
        return current;
      }
      return best;
    }, null);
  };

  const getMediaInfo = (media) => {
    if (!media) return null;

    if (media.type === 'video' || media.type === 'animated_gif') {
      const videoInfo = tweet?.legacy?.extended_entities?.media?.[0]?.video_info;
      const bestVariant = getBestVideoVariant(videoInfo?.variants);
      return {
        type: media.type,
        source: bestVariant?.url || media.media_url_https,
      };
    }

    return {
      type: media.type,
      source: media.media_url_https,
    };
  };

  const author = tweet?.core?.user_results?.result?.legacy || {};

  return {
    id: entry.entryId,
    full_text: tweet?.legacy?.full_text,
    timestamp: tweet?.legacy?.created_at,
    media: getMediaInfo(media),
    author: {
      name: author.name,
      screen_name: author.screen_name,
      profile_image_url: author.profile_image_url_https
    }
  }; 
};

const getNextCursor = (entries) => {
  const cursorEntry = entries.find(entry => entry.entryId.startsWith("cursor-bottom-"));
  return cursorEntry ? cursorEntry.content.value : null;
};

const waitForRequiredData = () => {
  return new Promise((resolve, reject) => {
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds total (50 * 100ms)
    
    const checkData = () => {
      chrome.storage.local.get(['bookmarksApiId', 'cookie', 'csrf', 'auth', 'features'], (result) => {
        console.log('Checking required data:', {
          hasBookmarksApiId: !!result.bookmarksApiId,
          hasCookie: !!result.cookie,
          hasCsrf: !!result.csrf,
          hasAuth: !!result.auth,
          hasFeatures: !!result.features
        });
        
        if (result.bookmarksApiId && result.cookie && result.csrf && result.auth && result.features) {
          console.log('All required data present:', {
            bookmarksApiId: result.bookmarksApiId,
            cookieLength: result.cookie.length,
            csrfLength: result.csrf.length,
            authLength: result.auth.length
          });
          resolve();
        } else {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.log('Timed out waiting for required data');
            reject(new Error('Timed out waiting for required data. Please try refreshing the page.'));
            return;
          }
          console.log('Missing required data, retrying in 100ms');
          setTimeout(checkData, 100);
        }
      });
    };
    checkData();
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportBookmarks") {
    console.log("Starting bookmark export");
    
    // Reset global state
    isDone = false;
    not2024count = 0;
    
    chrome.tabs.create({ url: "https://x.com/i/bookmarks/all" }, (newTab) => {
      setTimeout(async () => {
        try {
          chrome.tabs.sendMessage(newTab.id, { action: "showLoader" });
          
          await waitForRequiredData();
          console.log("Required data received, starting fetch");
          
          const tweets = await getBookmarks();
          console.log("Fetched tweets:", tweets?.length);
          
          chrome.tabs.sendMessage(newTab.id, { action: "hideLoader" });
          
          if (tweets && tweets.length > 0) {
            // Send tweets to popup and wait for confirmation
            chrome.runtime.sendMessage({
              action: "tweetsReady",
              tweets: tweets
            }, (response) => {
              // Only close the tab after popup confirms receipt
              if (response && response.status === "received") {
                chrome.tabs.remove(newTab.id);
              }
            });
          } else {
            // If no tweets, show error and keep tab open
            chrome.tabs.sendMessage(newTab.id, { 
              action: "hideLoader",
              error: "No tweets found from 2024. Try bookmarking some tweets first!" 
            });
          }
        } catch (error) {
          console.error("Export error:", error);
          chrome.tabs.sendMessage(newTab.id, { 
            action: "hideLoader",
            error: error.message 
          });
        }
      }, 2000);
    });
    
    return true;
  }
  
  if (request.action === "takeScreenshot") {

    const slideContent = document.querySelector('.slide-content');
    if (!slideContent) {
        sendResponse({error: "No slide content found"});
        return;
    }

    html2canvas(slideContent, {
        backgroundColor: '#1a1f2e',
        scale: 2, // Higher resolution
        logging: false
    }).then(function(canvas) {
        const dataURL = canvas.toDataURL("image/png", 1.0);
        sendResponse({imageData: dataURL});
    });

    return true; // Required for async response
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!(details.url.includes("x.com") || details.url.includes("twitter.com"))) {
      return;
    }

    console.log("Intercepted request:", details.url);

    const authHeader = details.requestHeaders?.find(
      (header) => header.name.toLowerCase() === "authorization"
    );
    const cookieHeader = details.requestHeaders?.find(
      (header) => header.name.toLowerCase() === "cookie"
    );
    const csrfHeader = details.requestHeaders?.find(
      (header) => header.name.toLowerCase() === "x-csrf-token"
    );

    if (authHeader && cookieHeader && csrfHeader) {
      console.log("Found all required headers");
      chrome.storage.local.set({
        auth: authHeader.value,
        cookie: cookieHeader.value,
        csrf: csrfHeader.value
      }, () => {
        console.log("Stored auth data in local storage");
      });
    }

    // Extract bookmarksApiId and features from Bookmarks API request
    if (details.url.includes("/graphql/") && details.url.includes("/Bookmarks?")) {
      try {
        // Extract bookmarksApiId from URL
        const bookmarksApiId = details.url.split("/graphql/")[1].split("/Bookmarks?")[0];
        
        // Extract features from URL
        const url = new URL(details.url);
        const features = url.searchParams.get("features");
        
        if (bookmarksApiId && features) {
          console.log("Found Bookmarks API data:", { bookmarksApiId });
          chrome.storage.local.set({
            bookmarksApiId,
            features: JSON.parse(decodeURIComponent(features))
          }, () => {
            console.log("Stored Bookmarks API data in local storage");
          });
        }
      } catch (error) {
        console.error("Error extracting Bookmarks API data:", error);
      }
    }
  },
  { urls: ["*://x.com/*", "*://twitter.com/*"] },
  ["requestHeaders", "extraHeaders"]
);

// Add onInstalled handler at the top level of the file
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.get(['wasPopupShown'], (result) => {
      if (!result.wasPopupShown) {
        chrome.tabs.create({
          url: chrome.runtime.getURL('welcome.html')
        });
        chrome.storage.local.set({ wasPopupShown: true });
      }
    });
  }
});

