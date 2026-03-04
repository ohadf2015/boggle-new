'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Gem, Bomb, Rainbow, Hand, Diamond, Snowflake, Sparkles, Zap, Magnet, Shuffle, Star } from 'lucide-react';

interface BlastHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string | undefined;
}

/** Mini tile preview with gradient background matching the actual tile style */
function TilePreview({ gradient, border, icon }: { gradient: string; border: string; icon: React.ReactNode }) {
  return (
    <div
      className="w-8 h-8 rounded-neo shrink-0 flex items-center justify-center"
      style={{ background: gradient, border, boxShadow: 'inset 0 0 8px rgba(255,255,255,0.15)' }}
    >
      {icon}
    </div>
  );
}

/** Category header divider */
function CategoryHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-px flex-1 bg-white/15" />
      <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <div className="h-px flex-1 bg-white/15" />
    </div>
  );
}

/** Tile explanation card with colored accent */
function TileCard({
  accentColor,
  preview,
  label,
  labelColor,
  description,
}: {
  accentColor: string;
  preview: React.ReactNode;
  label: string;
  labelColor: string;
  description: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-neo border-2 border-neo-black/40"
      style={{
        background: `linear-gradient(135deg, ${accentColor}12 0%, transparent 100%)`,
        borderLeftColor: accentColor,
        borderLeftWidth: '3px',
      }}
    >
      {preview}
      <div className="min-w-0">
        <span className="font-black text-xs" style={{ color: labelColor }}>{label}</span>
        <p className="text-[11px] text-white/65 leading-tight">{description}</p>
      </div>
    </div>
  );
}

/**
 * BlastHelpModal - Explains Blast mode mechanics and special tiles.
 * Card-based layout with category grouping and mini tile previews.
 */
export function BlastHelpModal({ open, onOpenChange, t }: BlastHelpModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm border-3 border-neo-black shadow-hard-lg bg-neo-navy text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black uppercase text-center text-neo-yellow">
            {t('blast.helpTitle') || 'How to Play'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2.5 text-white/80 text-sm">
              {/* Drag instruction */}
              <div className="flex items-center gap-3 px-3 py-2 bg-neo-cyan/10 rounded-neo border-2 border-neo-cyan/30">
                <Hand className="w-5 h-5 text-neo-cyan shrink-0" />
                <p className="text-xs text-white/70">{t('blast.helpDrag') || 'Drag across letters to form words. Words must be at least 2 letters long.'}</p>
              </div>

              {/* Score Boosters */}
              <CategoryHeader label="Score Boosters" />

              <TileCard
                accentColor="#FFD700"
                preview={<TilePreview gradient="linear-gradient(135deg, #FFD700 0%, #FFB000 100%)" border="3px solid #B8860B" icon={<Gem className="w-4 h-4 text-yellow-900" />} />}
                label={t('blast.helpGoldLabel') as string || 'Gold'}
                labelColor="#FBBF24"
                description={t('blast.helpGold') as string || '3x score multiplier for the word.'}
              />

              <TileCard
                accentColor="#A855F7"
                preview={<TilePreview gradient="linear-gradient(135deg, #F472B6 0%, #A855F7 50%, #06B6D4 100%)" border="3px solid #7C3AED" icon={<Rainbow className="w-4 h-4 text-white" />} />}
                label={t('blast.helpRainbowLabel') as string || 'Rainbow'}
                labelColor="#C084FC"
                description={t('blast.helpRainbow') as string || '+5 bonus points.'}
              />

              <TileCard
                accentColor="#C0C0C0"
                preview={<TilePreview gradient="radial-gradient(circle at 40% 35%, #E8E8E8 0%, #B0B0B0 55%, #8C8C8C 100%)" border="3px solid #C0C0C0" icon={<Star className="w-4 h-4 text-gray-300" />} />}
                label={t('blast.helpSilverLabel') as string || 'Silver'}
                labelColor="#D1D5DB"
                description={t('blast.helpSilver') as string || '4x score multiplier for the word.'}
              />

              <TileCard
                accentColor="#00CED1"
                preview={<TilePreview gradient="radial-gradient(circle at 40% 35%, #B9F2FF 0%, #00CED1 55%, #009698 100%)" border="3px solid #00CED1" icon={<Diamond className="w-4 h-4 text-cyan-200" />} />}
                label={t('blast.helpDiamondLabel') as string || 'Diamond'}
                labelColor="#67E8F9"
                description={t('blast.helpDiamond') as string || '5x score multiplier. Highest value tile.'}
              />

              <TileCard
                accentColor="#50C878"
                preview={<TilePreview gradient="radial-gradient(circle, #50C878 0%, #008050 100%)" border="3px solid #34D399" icon={<Diamond className="w-4 h-4 text-white" />} />}
                label={t('blast.helpGemLabel') as string || 'Gem'}
                labelColor="#6EE7B7"
                description={t('blast.helpGem') as string || '+3 per use, +8 on collection (3 hits).'}
              />

              {/* Strategic Tiles */}
              <CategoryHeader label="Strategic" />

              <TileCard
                accentColor="#FF4444"
                preview={<TilePreview gradient="radial-gradient(circle at 35% 35%, #FF6B4A 0%, #B40000 100%)" border="3px solid #DC2626" icon={<Bomb className="w-4 h-4 text-white" />} />}
                label={t('blast.helpBombLabel') as string || 'Bomb'}
                labelColor="#F87171"
                description={t('blast.helpBomb') as string || 'Clears all 8 surrounding tiles.'}
              />

              <TileCard
                accentColor="#FF69B4"
                preview={<TilePreview gradient="conic-gradient(from 0deg, #f00, #f90, #ff0, #0f0, #06f, #93f, #f00)" border="3px solid rgba(255,255,255,0.8)" icon={<Sparkles className="w-4 h-4 text-white" />} />}
                label={t('blast.helpPrismLabel') as string || 'Prism'}
                labelColor="#F9A8D4"
                description={t('blast.helpPrism') as string || 'Use in 2 words to trigger a cross-clear.'}
              />

              <TileCard
                accentColor="#FFE100"
                preview={<TilePreview gradient="linear-gradient(135deg, #FFE100 0%, #00BFF0 50%, #FFE100 100%)" border="3px solid #FFE100" icon={<Zap className="w-4 h-4 text-yellow-300" />} />}
                label={t('blast.helpLightningLabel') as string || 'Lightning'}
                labelColor="#FDE047"
                description={t('blast.helpLightning') as string || 'Clears the entire column when used in a word.'}
              />

              <TileCard
                accentColor="#8B00FF"
                preview={<TilePreview gradient="radial-gradient(circle at 40% 40%, #8B00FF 0%, #FF0040 55%, #8B00FF 100%)" border="3px solid #8B00FF" icon={<Magnet className="w-4 h-4 text-white" />} />}
                label={t('blast.helpMagnetLabel') as string || 'Magnet'}
                labelColor="#C084FC"
                description={t('blast.helpMagnet') as string || 'Pulls nearby tiles toward it when cleared.'}
              />

              <TileCard
                accentColor="#8888FF"
                preview={<TilePreview gradient="radial-gradient(circle, #E0E0FF 0%, #8888FF 60%, #6464C8 100%)" border="3px solid #8888FF" icon={<Shuffle className="w-4 h-4 text-indigo-200" />} />}
                label={t('blast.helpMirrorLabel') as string || 'Mirror'}
                labelColor="#A5B4FC"
                description={t('blast.helpMirror') as string || 'Doubles partner special tile effect, or 2x score.'}
              />

              {/* Obstacles */}
              <CategoryHeader label="Obstacles" />

              <TileCard
                accentColor="#B4E6FF"
                preview={<TilePreview gradient="linear-gradient(135deg, #B4E6FF 0%, #82C8FF 50%, #C8F0FF 100%)" border="3px solid #96DCFF" icon={<Snowflake className="w-4 h-4 text-blue-200" />} />}
                label={t('blast.helpIceLabel') as string || 'Ice'}
                labelColor="#BAE6FD"
                description={t('blast.helpIce') as string || '2 hits to break. Cracks on first use.'}
              />

              <TileCard
                accentColor="#93C5FD"
                preview={<TilePreview gradient="linear-gradient(135deg, #C8DCFF 0%, #A0C8F0 50%, #DCEFFF 100%)" border="4px solid #93C5FD" icon={<Snowflake className="w-4 h-4 text-blue-800" />} />}
                label={t('blast.helpFrozenLabel') as string || 'Frozen'}
                labelColor="#93C5FD"
                description={t('blast.helpFrozen') as string || '3 hits to break. Toughest obstacle.'}
              />

              {/* Goal */}
              <p className="text-white/50 text-[10px] border-t border-white/10 pt-2.5 text-center font-bold uppercase tracking-wider">
                {t('blast.helpGoal') || 'Clear as many tiles as possible for the highest score!'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="w-full bg-neo-yellow text-neo-black font-black border-3 border-neo-black shadow-hard hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            {t('common.gotIt') || 'Got it!'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
