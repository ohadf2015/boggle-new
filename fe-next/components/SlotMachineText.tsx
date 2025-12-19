import React, { useState, useEffect, useRef } from 'react';

interface SlotMachineTextProps {
  text: string;
  duration?: number;
}

const SlotMachineText: React.FC<SlotMachineTextProps> = ({ text, duration = 1000 }) => {
    const [displayedText, setDisplayedText] = useState<string>(text);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [glowIntensity, setGlowIntensity] = useState<number>(1);

    // Track if we've already animated this text to prevent re-animation on parent re-renders
    const hasAnimatedRef = useRef<Set<string>>(new Set());
    const lastTextRef = useRef<string>(text);

    // Include Hebrew characters for better support
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789אבגדהוזחטיכלמנסעפצקרשת!@#$%^&*()';

    useEffect(() => {
        // Only animate if this is a new text we haven't animated before
        if (hasAnimatedRef.current.has(text)) {
            // Already animated this text, just display it without animation
            setDisplayedText(text);
            setIsAnimating(false);
            setGlowIntensity(1);
            return;
        }

        // If text actually changed to something new, animate it
        const isNewText = lastTextRef.current !== text;
        lastTextRef.current = text;

        // Mark this text as animated
        hasAnimatedRef.current.add(text);

        // Only run animation for new, unseen text
        if (!isNewText && hasAnimatedRef.current.size > 1) {
            setDisplayedText(text);
            return;
        }

        const startTime = Date.now();
        let animationFrame: number;
        setIsAnimating(true);

        const animate = (): void => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (elapsed < duration) {
                // Generate random string of same length
                let randomStr = '';
                for (let i = 0; i < text.length; i++) {
                    // Gradually reveal the correct character
                    if (Math.random() < progress * 0.7) {
                        randomStr += text[i];
                    } else {
                        randomStr += characters.charAt(Math.floor(Math.random() * characters.length));
                    }
                }
                setDisplayedText(randomStr);
                setGlowIntensity(progress);
                animationFrame = requestAnimationFrame(animate);
            } else {
                setDisplayedText(text);
                setIsAnimating(false);
                setGlowIntensity(1);
            }
        };

        animate();

        return () => cancelAnimationFrame(animationFrame);
    }, [text, duration]);

    return (
        <span
            className={`slot-machine-text ${isAnimating ? 'animating' : 'complete'} text-right`}
            style={{
                '--glow-intensity': glowIntensity,
                textShadow: `
                    0 0 ${5 + glowIntensity * 10}px rgba(255, 255, 255, ${0.3 + glowIntensity * 0.4}),
                    0 0 ${10 + glowIntensity * 20}px rgba(168, 85, 247, ${0.2 + glowIntensity * 0.5}),
                    0 0 ${15 + glowIntensity * 30}px rgba(236, 72, 153, ${0.1 + glowIntensity * 0.3})
                `,
                fontWeight: 700,
                letterSpacing: '0.05em',
                verticalAlign: 'middle',
                lineHeight: 1,
                textAlign: 'right'
            } as React.CSSProperties}
        >
            {displayedText}
        </span>
    );
};

export default SlotMachineText;
