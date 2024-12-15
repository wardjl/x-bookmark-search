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
