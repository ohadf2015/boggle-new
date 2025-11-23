import React, { useState, useEffect } from 'react';

const SlotMachineText = ({ text, duration = 1000 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isAnimating, setIsAnimating] = useState(true);
    const [glowIntensity, setGlowIntensity] = useState(0);

    // Include Hebrew characters for better support
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789אבגדהוזחטיכלמנסעפצקרשת!@#$%^&*()';

    useEffect(() => {
        let startTime = Date.now();
        let animationFrame;
        setIsAnimating(true);

        const animate = () => {
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
            className={`slot-machine-text ${isAnimating ? 'animating' : 'complete'}`}
            style={{
                '--glow-intensity': glowIntensity,
                textShadow: `
                    0 0 ${5 + glowIntensity * 10}px rgba(255, 255, 255, ${0.3 + glowIntensity * 0.4}),
                    0 0 ${10 + glowIntensity * 20}px rgba(168, 85, 247, ${0.2 + glowIntensity * 0.5}),
                    0 0 ${15 + glowIntensity * 30}px rgba(236, 72, 153, ${0.1 + glowIntensity * 0.3})
                `,
                fontWeight: 700,
                letterSpacing: '0.05em'
            }}
        >
            {displayedText}
        </span>
    );
};

export default SlotMachineText;
