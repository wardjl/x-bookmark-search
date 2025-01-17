import { GROK_API_KEY, GROK_MODEL } from './config.js';

export class BookmarksChat {
  constructor(embeddings, tweets, pipeline) {
    if (!embeddings || !tweets || embeddings.length !== tweets.length) {
      console.error('Invalid embeddings or tweets data provided to chat');
      return;
    }

    this.embeddings = embeddings;
    this.tweets = tweets;
    this.embeddingPipeline = pipeline;
    
    // Update element references to use popup elements
    this.chatToggle = document.getElementById('chat-toggle');
    this.chatPopup = document.getElementById('chat-popup');
    this.chatMinimize = document.querySelector('.chat-minimize');
    this.chatInput = document.querySelector('#chat-popup .chat-input');
    this.chatSubmit = document.querySelector('#chat-popup .chat-submit');
    this.chatMessages = document.querySelector('#chat-popup .chat-messages');
    
    this.isProcessing = false;
    
    // Initialize conversation memory
    this.conversationHistory = [
      {
        role: 'system',
        content: `You are Grok, a highly capable AI assistant focused on helping users understand and analyze their bookmarked tweets.

Your goal is to:
1. Answer questions comprehensively and accurately
2. When relevant, support your answers with examples from the user's saved tweets
3. Reference specific tweets using @username format
4. Provide context for why each referenced tweet is relevant
5. If you receive many relevant tweets, prioritize the most insightful ones but try to include at least 5-6 different examples when available
6. Be concise but thorough in your explanations
7. Maintain a helpful and engaging conversational tone
8. Group similar tweets together thematically in your response

Do not:
- Include full URLs in your responses
- Make claims about tweets that aren't provided
- Ignore relevant tweet examples when they're available
- List tweets without explaining their relevance

Remember to adapt your response style based on the type of question asked - whether it's analysis, fact-finding, or general discussion.`
      }
    ];
    
    // Setup toggle functionality
    this.chatToggle.addEventListener('click', () => {
      this.chatPopup.classList.toggle('hidden');
      this.chatToggle.classList.toggle('white');
      const logo = this.chatToggle.querySelector('.chat-toggle-logo');
      if (this.chatToggle.classList.contains('white')) {
        logo.classList.add('white');
      } else {
        logo.classList.remove('white');
      }
      if (!this.chatPopup.classList.contains('hidden')) {
        this.chatInput.focus();
      }
    });
    
    this.chatMinimize.addEventListener('click', () => {
      this.chatPopup.classList.add('hidden');
    });
    
    this.chatClear = document.querySelector('.chat-clear-button');
    
    this.notificationPopup = document.getElementById('notification-popup');
    this.notificationText = document.getElementById('notification-text');
    
    this.chatClear.addEventListener('click', () => {
      this.showClearConfirmation();
    });
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isProcessing) {
        this.handleUserMessage();
      }
    });
    
    this.chatSubmit.addEventListener('click', () => {
      if (!this.isProcessing) {
        this.handleUserMessage();
      }
    });
  }

  async handleUserMessage() {
    const userInput = this.chatInput.value.trim();
    if (!userInput) return;
    
    this.isProcessing = true;
    this.chatInput.disabled = true;
    this.chatSubmit.disabled = true;
    
    // Add user message to chat
    this.addMessage(userInput, 'user');
    this.chatInput.value = '';
    
    try {
      // Find relevant tweets using embeddings
      const relevantTweets = await this.findRelevantTweets(userInput);
      
      // Generate response using Grok (now streaming)
      const response = await this.generateGrokResponse(userInput, relevantTweets);
      
      // Display referenced tweets in search results after full response
      const referencedHandles = response.match(/@(\w+)/g)?.map(h => h.substring(1)) || [];
      const referencedTweets = this.tweets.filter(tweet => 
        referencedHandles.includes(tweet.author.screen_name)
      );
      
      if (referencedTweets.length > 0) {
        window.displayTweets(referencedTweets);
      }
    } catch (error) {
      console.error('Error:', error);
      this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    } finally {
      this.isProcessing = false;
      this.chatInput.disabled = false;
      this.chatSubmit.disabled = false;
      this.chatInput.focus();
    }
  }

  async generateGrokResponse(query, relevantTweets) {
    // Get API key from storage
    const { xaiApiKey } = await chrome.storage.local.get(['xaiApiKey']);
    if (!xaiApiKey) {
      throw new Error('Please set your xAI API key in settings');
    }

    const tweetsContext = relevantTweets
      .map(tweet => `Tweet by @${tweet.author.screen_name}: "${tweet.full_text}" (url: ${tweet.url})`)
      .join('\n\n');

    // Add user's new message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: `Context tweets:\n${tweetsContext}\n\nUser question: ${query}`
    });

    // Keep only last 10 messages to prevent token limit issues
    if (this.conversationHistory.length > 12) {
      this.conversationHistory = [
        this.conversationHistory[0],
        ...this.conversationHistory.slice(-10)
      ];
    }

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiApiKey}`
        },
        body: JSON.stringify({
          model: GROK_MODEL,
          messages: this.conversationHistory,
          temperature: 0,
          stream: true // Enable streaming
        })
      });

      if (!response.ok) {
        throw new Error('Grok API request failed');
      }

      // Create a temporary message div for streaming
      const messageDiv = document.createElement('div');
      messageDiv.className = 'chat-message assistant';
      this.chatMessages.appendChild(messageDiv);
      
      let fullMessage = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // Decode the chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                fullMessage += content;
                // Format the message with markdown and tweet links
                messageDiv.innerHTML = this.formatMessage(fullMessage);
                // Scroll to bottom
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
              }
            } catch (e) {
              console.warn('Error parsing streaming response:', e);
            }
          }
        }
      }

      // Add the complete message to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullMessage
      });

      return fullMessage;
    } catch (error) {
      console.error('Grok API Error:', error);
      throw error;
    }
  }

  // Add a helper method to format messages
  formatMessage(text) {
    // Find all tweets referenced in the text and create a mapping of handles to URLs
    const tweetRefs = {};
    this.tweets.forEach(tweet => {
      if (text.includes(`@${tweet.author.screen_name}`)) {
        tweetRefs[tweet.author.screen_name] = tweet.url;
      }
    });
    
    // First convert markdown bold syntax to HTML
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format numbered lists with proper spacing
    formattedText = formattedText.replace(
      /(\d+\.\s+)([^\n]+)(?:\n|$)/g,
      (match, number, content) => `<div class="list-item">${number}${content}</div>`
    );
    
    // Convert @handles to clickable links
    formattedText = formattedText.replace(
      /@(\w+)/g,
      (match, handle) => {
        if (tweetRefs[handle]) {
          return `<a href="${tweetRefs[handle]}" target="_blank" rel="noopener noreferrer" class="tweet-link">@${handle}</a>`;
        }
        return match;
      }
    );
    
    return formattedText;
  }

  async findRelevantTweets(query) {
    // Use the embedding pipeline to get query embedding
    const queryEmbedding = await this.getQueryEmbedding(query);
    
    // Find most similar tweets using cosine similarity
    const similarities = this.embeddings.map((embedding, index) => ({
      similarity: this.cosineSimilarity(queryEmbedding, embedding),
      tweet: this.tweets[index]
    }));
    
    // Sort by similarity and get top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .filter(item => item.similarity > 0.3) // Keep tweets above similarity threshold
      .slice(0, 10) // Increase from 3 to 10 relevant tweets
      .map(item => item.tweet);
  }

  addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    // Find all tweets referenced in the text and create a mapping of handles to URLs
    const tweetRefs = {};
    this.tweets.forEach(tweet => {
      if (text.includes(`@${tweet.author.screen_name}`)) {
        tweetRefs[tweet.author.screen_name] = tweet.url;
      }
    });
    
    // First convert markdown bold syntax to HTML
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format numbered lists with proper spacing
    formattedText = formattedText.replace(
      /(\d+\.\s+)([^\n]+)(?:\n|$)/g,
      (match, number, content) => `<div class="list-item">${number}${content}</div>`
    );
    
    // Convert @handles to clickable links
    formattedText = formattedText.replace(
      /@(\w+)/g,
      (match, handle) => {
        if (tweetRefs[handle]) {
          return `<a href="${tweetRefs[handle]}" target="_blank" rel="noopener noreferrer" class="tweet-link">@${handle}</a>`;
        }
        return match;
      }
    );
    
    messageDiv.innerHTML = formattedText;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  enable() {
    this.chatInput.disabled = false;
    this.chatSubmit.disabled = false;
    
    // Add initial message
    this.addMessage('Hi! I can help you find and analyze information from your bookmarked tweets. What would you like to know?', 'assistant');
  }

  async getQueryEmbedding(query) {
    try {
      const result = await this.embeddingPipeline(query, { 
        pooling: 'mean', 
        normalize: true 
      });
      return Array.from(result.data);
    } catch (error) {
      console.error('Error getting query embedding:', error);
      throw error;
    }
  }

  clearConversation() {
    // Reset conversation history to initial state
    this.conversationHistory = [this.conversationHistory[0]];
    this.chatMessages.innerHTML = '';
    
    // Clear tweet results
    const searchResults = document.querySelector('#search-results .tweet-grid');
    if (searchResults) {
      searchResults.innerHTML = '';
    }
    
    this.addMessage('Conversation cleared. How can I help you?', 'assistant');
  }

  // Add a method to get conversation summary
  getConversationSummary() {
    return this.conversationHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role}: ${msg.text}`)
      .join('\n');
  }

  showClearConfirmation() {
    // Update notification text
    this.notificationText.innerHTML = 'Clear all messages? <button id="clear-confirm">Yes</button><button id="clear-cancel">No</button>';
    
    // Show notification
    this.notificationPopup.classList.remove('hidden');
    
    // Add event listeners for buttons
    const confirmBtn = document.getElementById('clear-confirm');
    const cancelBtn = document.getElementById('clear-cancel');
    
    const cleanup = () => {
      this.notificationPopup.classList.add('hidden');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleConfirm = () => {
      this.clearConversation();
      cleanup();
    };
    
    const handleCancel = () => {
      cleanup();
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    // Auto-hide after 5 seconds
    setTimeout(cleanup, 5000);
  }
} 