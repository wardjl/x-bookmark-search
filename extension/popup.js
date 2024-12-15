document.addEventListener('DOMContentLoaded', function() {
    const exportButton = document.getElementById('exportButton');
    const loader = document.getElementById('loader');
    const status = document.getElementById('status');
    const initialScreen = document.getElementById('initial-screen');
    const slideshow = document.getElementById('slideshow');
    const prevButton = document.getElementById('prev-slide');
    const nextButton = document.getElementById('next-slide');
    const slideDots = document.getElementById('slide-dots');

    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');

    const coffeeButton = document.getElementById('coffeeButton');
    coffeeButton.addEventListener('click', function() {
        window.open('https://ko-fi.com/sahillalani', '_blank');
    });
    
    let screenshots = {};

    async function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        document.querySelectorAll('.dot').forEach(dot => dot.classList.remove('active'));
        
        slides[index].classList.add('active');
        document.querySelectorAll('.dot')[index].classList.add('active');
        
        // Update navigation state
        prevButton.style.visibility = index === 0 ? 'hidden' : 'visible';
        nextButton.style.visibility = index === slides.length - 1 ? 'hidden' : 'visible';

        // Take screenshot of current slide if it's the top 5 accounts slide
        if (index === 2) {  
            try {
                const slideContent = slides[index].querySelector('.slide-content');
                if (slideContent) {
                    html2canvas(slideContent, {
                        useCORS: true,
                        backgroundColor: '#1a1f2e',
                        scale: 2,
                        logging: false
                    }).then(canvas => {
                        const dataURL = canvas.toDataURL("image/png", 1.0);
                        console.log('Screenshot taken of top 5 accounts');
                        screenshots.topAccounts = dataURL;
                    }).catch(error => {
                        console.error('Screenshot error:', error);
                    });
                }
            } catch (error) {
                console.error('Error taking screenshot:', error);
            }
        }

        // If it's the last slide, create the display
        if (index === slides.length - 1 && screenshots.topAccounts) {
            createFinalCollage();
        }
    }

    async function createFinalCollage() {
        const collageContainer = document.getElementById('final-collage');
        
        // Show loading spinner
        collageContainer.innerHTML = '<div class="collage-loading"></div>';
        
        try {
            // Create a container for the screenshot
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.backgroundColor = '#1a1f2e';
            container.style.borderRadius = '20px';
            container.style.maxWidth = '90%';
            container.style.margin = '0 auto';
            
            // Add the screenshot
            const imageWrapper = document.createElement('div');
            imageWrapper.style.width = '100%';
            imageWrapper.style.height = '400px';  
            imageWrapper.style.display = 'flex';
            imageWrapper.style.alignItems = 'center';
            imageWrapper.style.justifyContent = 'center';
            
            const image = document.createElement('img');
            image.src = screenshots.topAccounts;
            image.style.width = 'auto';
            image.style.height = '100%';
            image.style.maxWidth = '100%';
            image.style.objectFit = 'contain';
            image.style.borderRadius = '10px';
            
            imageWrapper.appendChild(image);
            container.appendChild(imageWrapper);
            
            // Clear the container and add the image
            collageContainer.innerHTML = '';
            collageContainer.appendChild(container);
            
            // Store the image data for sharing
            collageContainer.dataset.shareUrl = screenshots.topAccounts;
            
        } catch (error) {
            console.error('Error creating display:', error);
            collageContainer.innerHTML = '<div>Failed to create display: ' + error.message + '</div>';
        }
    }
    
    // Update share button click handler
    document.querySelector('.share-all-button').addEventListener('click', async () => {
        const button = document.querySelector('.share-all-button');
        const collageContainer = document.getElementById('final-collage');
        const shareUrl = collageContainer.dataset.shareUrl;
        
        if (!shareUrl) {
            alert('Please wait for the display to finish generating');
            return;
        }
        
        const originalText = button.textContent;
        button.innerHTML = `
            <span class="button-spinner"></span>
            <span>🤦 told you not to share</span>
        `;
        
        try {
            const tweetText = `Check out my 2024 Bookmarks Wrapped! ${shareUrl}`;
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText), '_blank');
        } catch (error) {
            console.error('Error sharing:', error);
            alert('Failed to share. Please try again.');
        } finally {
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }
    });

    // Initialize slide dots
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
        slideDots.appendChild(dot);
    });

    // Navigation event listeners
    prevButton.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            showSlide(currentSlide);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            showSlide(currentSlide);
        }
    });

    exportButton.addEventListener('click', function() {
        // Replace button text with spinner
        exportButton.innerHTML = `
            <span class="button-spinner"></span>
            <span>Loading...</span>
        `;
        exportButton.disabled = true;
        chrome.runtime.sendMessage({action: "exportBookmarks"});
    });

    function processAuthorStats(tweets) {
        const authorStats = {};
        
        tweets.forEach(tweet => {
            const author = tweet.author;
            if (!authorStats[author.screen_name]) {
                authorStats[author.screen_name] = {
                    count: 0,
                    name: author.name,
                    screen_name: author.screen_name,
                    profile_image_url: author.profile_image_url
                };
            }
            authorStats[author.screen_name].count++;
        });

        // Convert to array and sort by count
        return Object.values(authorStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    function displayAuthorStats(authors) {
        let authorsList = document.getElementById('authors-list');
        authorsList.innerHTML = '';

        // Only display top 5 authors
        authors.slice(0, 5).forEach((author, index) => {
            const authorElement = document.createElement('div');
            authorElement.className = 'author-item';
            
            // Get the highest quality profile image by removing '_normal' from the URL
            const profileImageUrl = author.profile_image_url.replace('_normal', '');
            
            authorElement.innerHTML = `
                <div class="author-position">${index + 1}</div>
                <img src="${profileImageUrl}" class="author-image" alt="${author.name}'s profile" 
                     onerror="this.src='default_profile.png'" crossorigin="anonymous">
                <div class="author-info">
                    <div class="author-name">${author.name}</div>
                    <div class="author-handle">@${author.screen_name}</div>
                </div>
            `;
            authorsList.appendChild(authorElement);
        });
    }

    function calculateReadingTime(tweets) {
        const WORDS_PER_MINUTE = 238;
        
        const totalWords = tweets.reduce((sum, tweet) => {
            const words = tweet.full_text ? tweet.full_text.split(/\s+/).length : 0;
            return sum + words;
        }, 0);
        
        const minutes = Math.round(totalWords / WORDS_PER_MINUTE);
        
        // Elon's puff session was 2:23 minutes
        const WEED_SESSION_LENGTH = 2.38; // 2 minutes and 23 seconds in decimal
        const elonPuffs = Math.floor(minutes / WEED_SESSION_LENGTH);
        
        return {
            minutes,
            funFact: `In that time, Elon could have smoked weed on Joe Rogan ${elonPuffs} times`,
            videoLink: 'https://www.youtube.com/watch?v=8Nael8xcSus'
        };
    }

    function calculateMonthlyStats(tweets) {
        const monthCounts = {};
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        tweets.forEach(tweet => {
            const date = new Date(tweet.timestamp);
            const monthKey = monthNames[date.getMonth()];
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });
        
        let topMonth = Object.entries(monthCounts)
            .sort(([,a], [,b]) => b - a)[0];
            
        return {
            month: topMonth[0],
            count: topMonth[1]
        };
    }

    async function shareTweet(slideId, stats, button) {
        const baseUrl = 'https://twitter.com/intent/tweet?text=';
        let tweetText = '';

        try {
            // Request screenshot from background script
            const response = await fetch(screenshots['slide1']); // Use first screenshot for now
            const blob = await response.blob();
            
            // Create FormData and append the image
            const formData = new FormData();
            formData.append('filename', blob, 'bookmarks-wrapped.png');
            
            // Upload to server (you'll need to implement this part)
            const imageUrl = screenshots['slide1']; // Placeholder
            const tweetText = `Check out my 2024 Bookmarks Wrapped! ${imageUrl}`;
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText), '_blank');
        } catch (error) {
            console.error('Error sharing tweet:', error);
            alert('Failed to share. Please try again.');
        }
    }

    // Update share all button functionality
    document.querySelector('.share-all-button').addEventListener('click', async () => {
        const button = document.querySelector('.share-all-button');
        const originalText = button.textContent;
        button.innerHTML = `
            <span class="button-spinner"></span>
            <span>🤦 told you not to share</span>
        `;

        try {
            // Take a screenshot of the final collage
            const response = await fetch(screenshots['slide1']); // Use first screenshot for now
            const blob = await response.blob();
            
            // Create FormData and append the image
            const formData = new FormData();
            formData.append('filename', blob, 'bookmarks-wrapped-all.png');
            
            // Upload to server (you'll need to implement this part)
            const imageUrl = screenshots['slide1']; // Placeholder
            const tweetText = `Check out my 2024 Bookmarks Wrapped! ${imageUrl}`;
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText), '_blank');
        } catch (error) {
            console.error('Error sharing collage:', error);
            alert('Failed to share. Please try again.');
        }
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "tweetsReady") {
            // Hide loader and initial screen
            loader.style.display = 'none';
            initialScreen.classList.add('hidden');
            
            // Show slideshow
            slideshow.classList.remove('hidden');
            
            const tweets = message.tweets;
            
            // Process and display stats
            const topAuthors = processAuthorStats(tweets);
            displayAuthorStats(topAuthors);
            
            document.getElementById('bookmarks-count').textContent = tweets.length;
            
            const readingStats = calculateReadingTime(tweets);
            document.getElementById('reading-time-count').textContent = readingStats.minutes;
            const readingFact = document.getElementById('reading-fact');
            readingFact.innerHTML = `${readingStats.funFact} <a href="${readingStats.videoLink}" target="_blank">🌿</a>`;
            
            // Calculate and display monthly stats
            const monthlyStats = calculateMonthlyStats(tweets);
            document.getElementById('top-month').textContent = monthlyStats.month;
            document.getElementById('month-count').textContent = monthlyStats.count;

            // Add click handlers for fun choice buttons
            document.querySelectorAll('.fun-choice-button').forEach(button => {
                button.addEventListener('click', () => {
                    currentSlide = 1; // Move to the first stats slide
                    showSlide(currentSlide);
                });
            });
            
            // Show first slide
            currentSlide = 0;
            showSlide(currentSlide);

            // Use event delegation for share buttons
            // document.getElementById('slideshow').addEventListener('click', (e) => {
            //     if (e.target.classList.contains('share-button')) {
            //         const slide = e.target.closest('.slide');
            //         const slideId = slide.id;
            //         const button = e.target;
            //         const originalText = button.textContent;
            //         button.innerHTML = `
            //             <span class="button-spinner"></span>
            //             <span>🤦 told you not to share</span>
            //         `;
            //         const shareStats = {
            //             totalBookmarks: tweets.length,
            //             topAuthors: topAuthors,
            //             minutes: readingStats.minutes,
            //             elonPuffs: Math.floor(readingStats.minutes / 2.38),
            //             topMonth: monthlyStats.month,
            //             monthCount: monthlyStats.count
            //         };

            //         shareTweet(slideId, shareStats, button);
            //     }
            // });
        }
    });

    // Initialize first slide
    showSlide(0);
});
