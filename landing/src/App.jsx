export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f2e] to-[#2d3748] text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
  <h1 className="text-6xl font-bold mb-4 bg-[#1da1f2] text-transparent bg-clip-text animate-gradient">
    Bookmarks Wrapped 
  </h1>
  <p className="text-xl text-gray-300 mb-8">
    Spotify wrapped but for Twitter bookmarks.
  </p>
  <a 
    href="https://chromewebstore.google.com/detail/bookmarks-wrapped/kbfpieehoalhenikobakdhoddpciione" 
    target="_blank"
    className="inline-flex items-center px-8 py-3 bg-[#1da1f2] hover:bg-blue-600 rounded-full font-semibold text-2xl transition-all animate-bounce-subtle mb-4"
  >
    <span className="mr-2">🚀</span>
    Get Started
    <span className="ml-2">🚀</span>
  </a>
  <div className="text-md text-gray-400 mt-2"> {/* Changed margin to mt-2 */}
    <span className="mr-2 animate-bounce-slow">🏄‍♂️</span>
    Built with <a 
      href="https://surferprotocol.org" 
      target="_blank" 
      className="text-blue-500 hover:text-blue-600 relative group"
    >
      Surfer Protocol
      <span className="absolute inset-0 bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></span>
    </a>
  </div>
</div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-8 mb-16">
          <FeatureCard 
            emoji="📊"
            title="Saved Posts"
            description="See how many posts you've saved and the top 5 authors you've bookmarked"
          />
          <FeatureCard 
            emoji="🔍"
            title="Top 5 Authors"
            description="See the top 5 authors you've bookmarked"
          />
          <FeatureCard 
            emoji="⏱️"
            title="Reading Time"
            description="Find out how many Elon-smoking-with-Joe-Rogan sessions you could have watched instead"
          />
          <FeatureCard 
            emoji="📅"
            title="Monthly Insights"
            description="Discover your most active bookmarking month"
          />
        </div>

        {/* Fun Quote */}
        <div className="text-center mb-16">
          <blockquote className="text-2xl italic text-gray-300">
            Disclaimer: Elon Musk may not be happy about this.
          </blockquote>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-400">
          <p>
            Made by{" "}
            <a href="https://twitter.com/SahilLalani0" target="_blank" className="text-blue-500 hover:text-blue-600">
              @SahilLalani0
            </a>
            {" | "}
            <a href="https://github.com/sahil-lalani/bookmarks-wrapped" target="_blank" className="text-blue-500 hover:text-blue-600">
              Open-source
            </a>{" "}
            just like the Twitter algo
          </p>
          <p className="text-sm mt-2">
            Not affiliated with X/Twitter. Please don't sue me, Elon.
          </p>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, description }) {
  return (
    <div className="group relative bg-white/10 rounded-xl p-6 backdrop-blur-sm hover:transform hover:scale-105 transition-all duration-300 hover:after:opacity-100 after:absolute after:inset-0 after:rounded-xl after:bg-gradient-to-br after:from-transparent after:to-blue-500/20 after:opacity-0 after:transition-opacity after:duration-300 after:-z-10">
      <div className="text-4xl mb-4 animate-bounce-slow">{emoji}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}