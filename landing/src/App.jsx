export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f2e] to-[#2d3748] text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Bookmarks Wrapped
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Your Twitter bookmarks, wrapped up like it's Spotify Wrapped 
            (but please don't tell Elon) 🤫
          </p>
          <a 
            href="https://chrome.google.com/webstore"
            className="inline-flex items-center px-8 py-3 bg-blue-500 hover:bg-blue-600 rounded-full font-semibold transition-colors"
          >
            <span className="mr-2">🚀</span>
            Add to Chrome
          </a>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard 
            emoji="📊"
            title="Your Stats"
            description="See how many posts you've saved and who you've bookmarked the most"
          />
          <FeatureCard 
            emoji="⏱️"
            title="Reading Time"
            description="Find out how many Elon-smoking-with-Joe-Rogan sessions you could have watched instead"
          />
          <FeatureCard 
            emoji="📅"
            title="Monthly Insights"
            description="Discover your most active bookmarking months and patterns"
          />
        </div>

        {/* Fun Quote */}
        <div className="text-center mb-16">
          <blockquote className="text-2xl italic text-gray-300">
            "What happens in your bookmarks, stays in your bookmarks... 
            until we wrap it up!" 
          </blockquote>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-400">
          <p>Made with 💙 by someone who bookmarks too much</p>
          <p className="text-sm mt-2">
            Not affiliated with X/Twitter. Please don't sue us, Elon.
          </p>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, description }) {
  return (
    <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm hover:transform hover:scale-105 transition-transform">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}
