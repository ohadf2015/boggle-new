/**
 * Get combo colors based on level - NEO-BRUTALIST FLAT COLORS with hard shadows
 * Extracted from GridComponent for better maintainability
 */
export function getComboColors(level) {
    // Show combo bonus as +N (capped at +5 for scoring, but visual can go higher)
    const bonus = Math.min(level, 5); // Actual bonus caps at 5
    const bonusText = `+${bonus}`;

    if (level === 0) {
        // No combo - Electric Yellow (Neo-Brutalist primary)
        return {
            bg: 'bg-neo-yellow',
            border: 'border-neo-black',
            shadow: 'shadow-hard',
            text: null, // Don't show +0
            flicker: false
        };
    } else if (level === 1) {
        // +1 - Orange
        return {
            bg: 'bg-neo-orange',
            border: 'border-neo-black',
            shadow: 'shadow-hard-lg',
            text: bonusText,
            flicker: false
        };
    } else if (level === 2) {
        // +2 - Red
        return {
            bg: 'bg-neo-red',
            border: 'border-neo-black',
            shadow: 'shadow-hard-lg',
            text: bonusText,
            flicker: false,
            textColor: 'text-neo-white'
        };
    } else if (level === 3) {
        // +3 - Pink
        return {
            bg: 'bg-neo-pink',
            border: 'border-neo-black',
            shadow: 'shadow-hard-lg',
            text: bonusText,
            flicker: false,
            textColor: 'text-neo-white'
        };
    } else if (level === 4) {
        // +4 - Purple
        return {
            bg: 'bg-neo-purple',
            border: 'border-neo-black',
            shadow: 'shadow-hard-xl',
            text: bonusText,
            flicker: false,
            textColor: 'text-neo-white'
        };
    } else if (level === 5) {
        // +5 (max bonus) - Cyan
        return {
            bg: 'bg-neo-cyan',
            border: 'border-neo-black',
            shadow: 'shadow-hard-xl',
            text: bonusText,
            flicker: false
        };
    } else if (level === 6) {
        // +5 (visual level 6) - Lime
        return {
            bg: 'bg-neo-lime',
            border: 'border-neo-black',
            shadow: 'shadow-hard-xl',
            text: bonusText,
            flicker: false
        };
    } else if (level === 7) {
        // +5 (visual level 7) - Rainbow with hard shadow
        return {
            bg: 'rainbow-gradient',
            border: 'border-neo-black border-4',
            shadow: 'shadow-hard-xl',
            text: bonusText,
            flicker: false,
            isRainbow: true,
            textColor: 'text-neo-white'
        };
    } else if (level === 8) {
        // +5 (visual level 8) - Rainbow with strobe
        return {
            bg: 'rainbow-gradient',
            border: 'border-neo-black border-4',
            shadow: 'shadow-hard-2xl',
            text: bonusText,
            flicker: true,
            isRainbow: true,
            strobe: true,
            textColor: 'text-neo-white'
        };
    } else {
        // Level 9+ : Full rainbow with intense strobe (bonus still +5)
        return {
            bg: 'rainbow-gradient',
            border: 'border-neo-black border-5',
            shadow: 'shadow-hard-2xl',
            text: bonusText,
            flicker: true,
            isRainbow: true,
            strobe: true,
            intenseStrobe: true,
            textColor: 'text-neo-white'
        };
    }
}

/**
 * Get heat map style - glowing thermal overlay effect (red-pink-orange-yellow scheme)
 */
export function getHeatMapStyle(row, col, heatMapData) {
    if (!heatMapData || !heatMapData.cellUsageCounts) return null;
    const key = `${row},${col}`;
    const count = heatMapData.cellUsageCounts[key] || 0;
    if (count === 0) return null;

    const maxCount = heatMapData.maxCount || 1;
    const t = count / maxCount; // 0 to 1

    // Heat map: dark red -> red -> pink/magenta -> orange -> yellow -> white-hot
    let r, g, b;

    if (t < 0.2) {
        const p = t / 0.2;
        r = Math.round(120 + p * 135);
        g = 0;
        b = Math.round(p * 30);
    } else if (t < 0.4) {
        const p = (t - 0.2) / 0.2;
        r = 255;
        g = Math.round(p * 50);
        b = Math.round(30 + p * 100);
    } else if (t < 0.6) {
        const p = (t - 0.4) / 0.2;
        r = 255;
        g = Math.round(50 + p * 100);
        b = Math.round(130 - p * 130);
    } else if (t < 0.8) {
        const p = (t - 0.6) / 0.2;
        r = 255;
        g = Math.round(150 + p * 105);
        b = 0;
    } else {
        const p = (t - 0.8) / 0.2;
        r = 255;
        g = 255;
        b = Math.round(p * 180);
    }

    return { r, g, b, t };
}

export default getComboColors;
