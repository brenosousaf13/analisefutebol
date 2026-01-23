
// Helper for responsive player sizing
// Helper for responsive player sizing
export const getPlayerSize = (fieldWidth: number): number => {
    // Player occupies ~5% of field width (reduced from 7%)
    const baseSize = fieldWidth * 0.05;
    // Limits
    const minSize = 20;
    const maxSize = 40;
    return Math.max(minSize, Math.min(maxSize, baseSize));
};

export const getFontSize = (playerSize: number) => ({
    number: playerSize * 0.4,
    name: playerSize * 0.28,
});

// Convert pixel coordinate to percentage (0-100)
export const pixelToPercent = (
    value: number,
    limit: number
): number => {
    return (value / limit) * 100;
};

// Convert percentage (0-100) to pixel coordinate
export const percentToPixel = (
    percent: number,
    limit: number
): number => {
    return (percent / 100) * limit;
};

// Get position in pixels from percentage object
// Input: { x: 50, y: 50 } (percentage)
// Output: { x: 100, y: 200 } (pixels)
export const getPixelPosition = (
    position: { x: number, y: number },
    fieldWidth: number,
    fieldHeight: number
) => {
    return {
        x: percentToPixel(position.x, fieldWidth),
        y: percentToPixel(position.y, fieldHeight)
    };
};
