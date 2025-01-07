'use client'

import { Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function TwitterBookmarks() {
  const [search, setSearch] = useState("")
  const lastImported = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Enhanced grainy, white gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 150%, rgba(255,255,255,0.2), transparent),
            radial-gradient(ellipse 50% 50% at 20% 150%, rgba(255,255,255,0.15), transparent),
            radial-gradient(ellipse 50% 50% at 80% 150%, rgba(255,255,255,0.15), transparent)
          `,
        }}
      />
      
      {/* Intensified noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-70 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.8'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      
      <div className="relative flex min-h-screen flex-col">
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mb-12 text-center">
              <h1 className="text-6xl font-bold tracking-tight text-white md:text-8xl">
                Search Your Twitter Bookmarks
              </h1>
              <p className="mt-4 text-base text-white/60">
                Last imported: {lastImported}
              </p>
            </div>

            <div className="mx-auto max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <Input
                  type="search"
                  placeholder="Search your bookmarks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 w-full rounded-full border-white/10 bg-white/[0.03] pl-12 pr-6 text-lg text-white placeholder-white/40 backdrop-blur-sm transition-all hover:bg-white/[0.05] focus-visible:border-white/20 focus-visible:bg-white/[0.07] focus-visible:ring-white/20"
                />
              </div>

              <div className="mt-8 space-y-4">
                {search && (
                  <div className="rounded-lg border border-white/[0.03] bg-white/[0.02] p-4 backdrop-blur-sm">
                    <p className="text-white/60">No tweets found matching "{search}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full py-4 text-center">
          <a 
            href="https://x.com/_ishand_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-white/40 hover:text-white transition-colors duration-200"
          >
            made by ishan
          </a>
        </footer>
      </div>
    </div>
  )
}

