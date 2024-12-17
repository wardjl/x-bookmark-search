document.addEventListener('DOMContentLoaded', function() {
    const exportButton = document.getElementById('exportButton');
    const loader = document.getElementById('loader');
    const status = document.getElementById('status');
    const initialScreen = document.getElementById('initial-screen');
    const slideshow = document.getElementById('slideshow');
    const prevButton = document.getElementById('prev-slide');
    const nextButton = document.getElementById('next-slide');
    const slideDots = document.getElementById('slide-dots');
    const copyButton = document.getElementById('copy-button');

    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');

    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Only handle keyboard navigation when slideshow is visible
        if (!slideshow.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft' && currentSlide > 0) {
                currentSlide--;
                showSlide(currentSlide);
            } else if (e.key === 'ArrowRight' && currentSlide < slides.length - 1) {
                currentSlide++;
                showSlide(currentSlide);
            }
        }
    });

    const coffeeButton = document.getElementById('coffeeButton');
    coffeeButton.addEventListener('click', function() {
        window.open('https://ko-fi.com/sahillalani', '_blank');
    });
    
    let screenshots = {
        totalBookmarks: null,
        topAuthors: null,
        readingTime: null,
        monthlyStats: null
    };

    async function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        document.querySelectorAll('.dot').forEach(dot => dot.classList.remove('active'));
        
        slides[index].classList.add('active');
        document.querySelectorAll('.dot')[index].classList.add('active');
        
        // Update navigation state
        prevButton.style.visibility = index === 0 ? 'hidden' : 'visible';
        nextButton.style.visibility = index === slides.length - 1 ? 'hidden' : 'visible';

        // Take screenshots of the stats slides
        if (index >= 1 && index <= 4) {  // Stats slides are from index 1 to 4
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
                        switch(index) {
                            case 1:
                                screenshots.totalBookmarks = dataURL;
                                break;
                            case 2:
                                screenshots.topAuthors = dataURL;
                                break;
                            case 3:
                                screenshots.readingTime = dataURL;
                                break;
                            case 4:
                                screenshots.monthlyStats = dataURL;
                                break;
                        }
                        console.log(`Screenshot taken for slide ${index}`);
                    }).catch(error => {
                        console.error('Screenshot error:', error);
                    });
                }
            } catch (error) {
                console.error('Error taking screenshot:', error);
            }
        }

        // If it's the last slide, create the display
        if (index === slides.length - 1) {
            createFinalCollage();
        }
    }

    let currentPreviewIndex = 0;
    const previewSlides = ['totalBookmarks', 'topAuthors', 'readingTime', 'monthlyStats'];

    async function createFinalCollage() {
        const collageContainer = document.getElementById('final-collage');
        
        // Show loading spinner
        collageContainer.innerHTML = '<div class="collage-loading"></div>';
        
        try {
            // Create a container for the slideshow
            const container = document.createElement('div');
            container.className = 'preview-slideshow';
            container.style.position = 'relative';
            
            // Add navigation arrows
            const prevArrow = document.createElement('button');
            prevArrow.className = 'preview-nav prev';
            prevArrow.innerHTML = '←';
            prevArrow.onclick = () => showPreviewSlide((currentPreviewIndex - 1 + previewSlides.length) % previewSlides.length);
            
            const nextArrow = document.createElement('button');
            nextArrow.className = 'preview-nav next';
            nextArrow.innerHTML = '→';
            nextArrow.onclick = () => showPreviewSlide((currentPreviewIndex + 1) % previewSlides.length);
            
            // Add preview dots
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'preview-dots';
            previewSlides.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.className = 'preview-dot' + (index === 0 ? ' active' : '');
                dot.onclick = () => showPreviewSlide(index);
                dotsContainer.appendChild(dot);
            });
            
            // Add the image container
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'preview-image-wrapper';
            
            const image = document.createElement('img');
            image.src = screenshots[previewSlides[0]];
            image.className = 'preview-image';
            
            imageWrapper.appendChild(image);
            container.appendChild(prevArrow);
            container.appendChild(imageWrapper);
            container.appendChild(nextArrow);
            container.appendChild(dotsContainer);
            
            // Clear the container and add the slideshow
            collageContainer.innerHTML = '';
            collageContainer.appendChild(container);
            
            // Store the current image data for sharing
            collageContainer.dataset.shareUrl = screenshots[previewSlides[currentPreviewIndex]];
            
        } catch (error) {
            console.error('Error creating display:', error);
            collageContainer.innerHTML = '<div>Failed to create display: ' + error.message + '</div>';
        }
    }

    function showPreviewSlide(index) {
        currentPreviewIndex = index;
        const container = document.getElementById('final-collage');
        const image = container.querySelector('.preview-image');
        const dots = container.querySelectorAll('.preview-dot');
        
        image.src = screenshots[previewSlides[index]];
        container.dataset.shareUrl = screenshots[previewSlides[index]];
        
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

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

    copyButton.addEventListener('click', async () => {
        const button = document.querySelector('.copy-button');
        const shareOptions = document.getElementById('share-options');
        const collageContainer = document.getElementById('final-collage');
        const imageData = collageContainer.dataset.shareUrl;
        
        try {
            const response = await fetch(imageData);
            const blob = await response.blob();
            const clipboardItem = new ClipboardItem({
                [blob.type]: blob
            });
            await navigator.clipboard.write([clipboardItem]);
            
            // Update button state
            button.innerHTML = `
                <span class="button-icon">✅</span>
                Image Copied!
            `;
            
            // Show share options
            shareOptions.style.display = 'block';
            
            // Reset button after delay
            setTimeout(() => {
                button.innerHTML = `
                    <span class="button-icon">📋</span>
                    Copy Image to Share
                `;
            }, 2000);
        } catch (error) {
            console.error('Error copying:', error);
            button.innerHTML = `
                <span class="button-icon">❌</span>
                Failed to copy
            `;
        }
    });

    // Handle platform-specific sharing
    document.getElementById('share-twitter').addEventListener('click', () => {
        const tweetText = `Check out my 2024 Bookmarks Wrapped!\n\nTry it out at https://elondontsueme.com\n\nP.S: @elonmusk please don't sue @sahillalani0\n\n[PASTE-IMAGE-HERE]`;
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText), '_blank');
    });

    document.getElementById('share-imessage').addEventListener('click', () => {
        window.open('sms:', '_blank');
    });

    document.getElementById('share-whatsapp').addEventListener('click', () => {
        const text = 'Check out my 2024 Bookmarks Wrapped!';
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
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

        authors.slice(0, 5).forEach((author, index) => {
            const authorElement = document.createElement('div');
            authorElement.className = 'author-item';
            
            // Get the highest quality profile image
            const profileImageUrl = author.profile_image_url.replace('_normal', '');
            
            // Add special class for top 3
            const rankClass = index === 0 ? 'gold-rank' : 
                             index === 1 ? 'silver-rank' : 
                             index === 2 ? 'bronze-rank' : '';
            
            authorElement.innerHTML = `
                <div class="author-position ${rankClass}">${index + 1}</div>
                <img src="${profileImageUrl}" class="author-image ${rankClass}" 
                     alt="${author.name}'s profile" 
                     onerror="this.src='default_profile.png'" 
                     crossorigin="anonymous">
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
