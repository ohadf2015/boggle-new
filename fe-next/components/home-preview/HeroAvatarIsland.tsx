'use client';

import { createPortal } from 'react-dom';
import Avatar from '@/components/Avatar';
import { EditAvatarButton } from './EditAvatarButton';
import { useHeroAvatarBridge } from './heroAvatarBridge';

/**
 * Every avatar on the homepage, carried in its own lazy chunk. NEVER import
 * this module statically (or via a literal import()) from anything LandingView
 * can reach — that is exactly the leak LandingView.bundleGraph.test.ts guards:
 * this module pulls in Avatar.tsx, which import()s AvatarRenderer and the
 * ~477 KiB SVG part library. HeroAvatarMount loads it with a runtime import()
 * after first paint and it portals into the slot <div>s the home-preview
 * components published on heroAvatarBridge.
 */
export default function HeroAvatarIsland() {
  const { slots, heroProps, friendsAvatars } = useHeroAvatarBridge();

  return (
    <>
      {heroProps && slots.hero
        ? createPortal(
            <>
              <div className="lg:hidden">
                <Avatar userId={heroProps.userId} customAvatar={heroProps.customAvatar ?? undefined} pixelSize={140} mood="idle" />
              </div>
              <div className="hidden lg:block 2xl:hidden">
                <Avatar userId={heroProps.userId} customAvatar={heroProps.customAvatar ?? undefined} pixelSize={260} mood="idle" />
              </div>
              <div className="hidden 2xl:block">
                <Avatar userId={heroProps.userId} customAvatar={heroProps.customAvatar ?? undefined} pixelSize={300} mood="idle" />
              </div>
            </>,
            slots.hero,
          )
        : null}
      {heroProps && slots.heroEdit
        ? createPortal(
            <EditAvatarButton t={heroProps.t} config={heroProps.customAvatar} onSaved={heroProps.onAvatarSaved} />,
            slots.heroEdit,
          )
        : null}
      {/* FriendsBlock's decorative demo faces (seeded, no real user data). The
          layout owns the box; only the SVG itself rides the lazy chunk. */}
      {friendsAvatars && slots.friendsYou
        ? createPortal(
            <>
              <Avatar userId="hp-friend-you" pixelSize={56} mood="emoteCool" className="lg:hidden" />
              <Avatar userId="hp-friend-you" pixelSize={80} mood="emoteCool" className="hidden lg:block" />
            </>,
            slots.friendsYou,
          )
        : null}
      {friendsAvatars && slots.friendsRival
        ? createPortal(
            <>
              <Avatar userId="hp-friend-maya" pixelSize={56} mood="emoteSilly" className="lg:hidden" />
              <Avatar userId="hp-friend-maya" pixelSize={80} mood="emoteSilly" className="hidden lg:block" />
            </>,
            slots.friendsRival,
          )
        : null}
    </>
  );
}
