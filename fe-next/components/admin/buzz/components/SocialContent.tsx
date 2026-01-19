'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import type { SocialContent as SocialContentType } from '../types';

export interface SocialContentProps {
  socialContent: SocialContentType | null | undefined;
}

interface PlatformConfig {
  key: 'x' | 'instagram' | 'tiktok';
  label: string;
  icon: string;
  hashtagColor: string;
}

const PLATFORMS: PlatformConfig[] = [
  { key: 'x', label: 'X (Twitter)', icon: '\uD835\uDD4F', hashtagColor: 'text-neo-cyan' },
  { key: 'instagram', label: 'Instagram', icon: '\uD83D\uDCF8', hashtagColor: 'text-neo-pink' },
  { key: 'tiktok', label: 'TikTok', icon: '\uD83C\uDFB5', hashtagColor: 'text-neo-orange' },
];

function formatSocialPost(text: string, hashtags: string[]): string {
  const hashtagStr = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
  return `${text}\n\n${hashtagStr}`;
}

/**
 * Social media content display with copy functionality.
 */
export function SocialContent({
  socialContent,
}: SocialContentProps): React.ReactElement {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  async function handleCopy(platform: string, content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-neo-pink" />
        <span className="text-sm font-medium text-slate-400">Social Media Posts</span>
      </div>
      {socialContent ? (
        <div className="space-y-4">
          {PLATFORMS.map((platform) => (
            <SocialPlatformCard
              key={platform.key}
              platform={platform}
              content={socialContent[platform.key]}
              isCopied={copiedPlatform === platform.key}
              onCopy={() => handleCopy(
                platform.key,
                formatSocialPost(socialContent[platform.key].text, socialContent[platform.key].hashtags)
              )}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Share2 className="w-4 h-4" />
          No social content generated. Regenerate challenges to create social posts.
        </div>
      )}
    </div>
  );
}

interface SocialPlatformCardProps {
  platform: PlatformConfig;
  content: { text: string; hashtags: string[] };
  isCopied: boolean;
  onCopy: () => void;
}

function SocialPlatformCard({
  platform,
  content,
  isCopied,
  onCopy,
}: SocialPlatformCardProps): React.ReactElement {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <span className="text-lg">{platform.icon}</span> {platform.label}
        </span>
        <button
          onClick={onCopy}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            isCopied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-white whitespace-pre-wrap">{content.text}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {content.hashtags.map((tag, i) => (
          <span key={i} className={`text-xs ${platform.hashtagColor}`}>#{tag}</span>
        ))}
      </div>
    </div>
  );
}
