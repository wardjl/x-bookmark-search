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
  chrome.storage.local.get(
    ["cookie", "csrf", "auth"],
    async (sessionResult) => {
      if (
        !sessionResult.cookie ||
        !sessionResult.csrf ||
        !sessionResult.auth
      ) {
        console.error("cookie, csrf, or auth is missing");
        return;
      } 

      chrome.storage.local.get(["bookmarksApiId", "features"], async (localResult) => {
        if (!localResult.bookmarksApiId || !localResult.features) {
          return;
        }

        const headers = new Headers();
        headers.append("Cookie", sessionResult.cookie);
        headers.append("X-Csrf-token", sessionResult.csrf);
        headers.append("Authorization", sessionResult.auth);

        const variables = {
          count: 100,
          cursor: cursor,
          includePromotedContent: false,
        };
        const API_URL = `https://x.com/i/api/graphql/${
          localResult.bookmarksApiId
        }/Bookmarks?features=${encodeURIComponent(
          JSON.stringify(localResult.features)
        )}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

        console.log("API_URL", API_URL);

        try {
          const response = await fetch(API_URL, {
            method: "GET",
            headers: headers,
            redirect: "follow",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const entries =
            data.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]
              ?.entries || [];
          
          const tweetEntries = entries.filter((entry) =>
            entry.entryId.startsWith("tweet-")
          );

          const parsedTweets = tweetEntries.map(parseTweet);
          console.log("Parsed Tweets", parsedTweets);
          for (const tweet of parsedTweets) {
            if (getTweetYear(tweet.timestamp) !== 2024) {
              console.log("Year is not 2024, stopping import");
              not2024count++;
              if (not2024count > 10) {
                isDone = true;
                break;
              }
            }
            else {
              not2024count = 0;
              allTweets.push(tweet);
            }
          }
          
          const newTweetsCount = parsedTweets.length;
          totalImported += newTweetsCount;

          console.log("Bookmarks data:", data);
          console.log("New tweets in this batch:", newTweetsCount);
          console.log("Current total imported:", totalImported);

          const nextCursor = getNextCursor(entries);

          if (nextCursor && newTweetsCount > 0 && !isDone) {
            await getBookmarks(nextCursor, totalImported, allTweets);
          } else {

            console.log("Import completed. Total imported:", totalImported);
            console.log("All imported tweets:", allTweets);
            
            chrome.runtime.sendMessage({
              action: "tweetsReady",
              tweets: allTweets
            });
            
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs[0]) {
                chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  func: () => {
                    alert("🤫 WARNING: Your Bookmarks Wrapped is ready. Elon doesn't want you to see this!");
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error("Error fetching bookmarks:", error);

        }
      });
    }
  );
}

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
  return new Promise((resolve) => {
    const checkData = () => {
      chrome.storage.local.get(['bookmarksApiId', 'cookie', 'csrf', 'auth'], (result) => {
        if (result.bookmarksApiId && result.cookie && result.csrf && result.auth) {
          console.log('Got all data needed to fetch bookmarks, going to getBookmarks');
          resolve();
        } else {
          setTimeout(checkData, 100); // Check again after 100ms
        }
      });
    };
    checkData();
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportBookmarks") {
    chrome.tabs.create({ url: "https://x.com/i/bookmarks/all" });
    console.log("Received export request from popup");

    waitForRequiredData().then(() => {
      getBookmarks();
      sendResponse({ status: "started" });
    });

    return true; // Indicates that the response is sent asynchronously
  }
  if (request.action === "takeScreenshot") {
    // chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    //   sendResponse({ imageData: dataUrl });
    // });
    // return true; // Required for async response
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
    if (
      !(details.url.includes("x.com") || details.url.includes("twitter.com"))
    ) {
      return;
    }


    // Check if stuff is already stored
    chrome.storage.local.get(["bookmarksApiId", "cookie", "csrf", "auth", "features"], (result) => {
      // Check if the URL matches the pattern for bookmarks API
      const bookmarksUrlPattern = /https:\/\/x\.com\/i\/api\/graphql\/([^/]+)\/Bookmarks\?/;
      const match = details.url.match(bookmarksUrlPattern);

      if (match) {
        if (!result.bookmarksApiId) {
          const bookmarksApiId = match[1];
          chrome.storage.local.set({ bookmarksApiId }, () => {
            console.log(`Stored bookmarksApiId: ${bookmarksApiId}`);
          });
        }

        if (!result.features) {
          const url = new URL(details.url);
          const features = JSON.parse(decodeURIComponent(url.searchParams.get('features') || '{}'));
          chrome.storage.local.set({ features }, () => {
            console.log("Stored features: ", features);
          });
        }
      }



      const authHeader = details.requestHeaders?.find(
        (header) => header.name.toLowerCase() === "authorization"
      );
      const auth = authHeader ? authHeader.value : "";

      const cookieHeader = details.requestHeaders?.find(
        (header) => header.name.toLowerCase() === "cookie"
      );
      const cookie = cookieHeader ? cookieHeader.value : "";

      const csrfHeader = details.requestHeaders?.find(
        (header) => header.name.toLowerCase() === "x-csrf-token"
      );
      const csrf = csrfHeader ? csrfHeader.value : "";

      if (!auth || !cookie || !csrf) {
        return;
      }

      if (result.cookie !== cookie || result.csrf !== csrf || result.auth !== auth) {
        chrome.storage.local.set({ cookie, csrf, auth }, () => {
          console.log("Updated cookie, csrf, auth in local storage");
        });
      }
    });
  },
  { urls: ["*://x.com/*", "*://twitter.com/*"] },
  ["requestHeaders", "extraHeaders"]
);

