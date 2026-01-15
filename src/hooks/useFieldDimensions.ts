import { useState, useEffect, useRef } from 'react';

export const useFieldDimensions = (aspectRatio: number = 1.54) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculateDimensions = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const availableWidth = container.clientWidth;
            const availableHeight = container.clientHeight;

            let fieldWidth: number;
            let fieldHeight: number;

            // Calculate based on keeping the aspect ratio
            if (availableHeight / availableWidth > aspectRatio) {
                // Limited by width
                fieldWidth = availableWidth * 0.95; // 95% of available width
                fieldHeight = fieldWidth * aspectRatio;
            } else {
                // Limited by height
                fieldHeight = availableHeight * 0.95; // 95% of available height
                fieldWidth = fieldHeight / aspectRatio;
            }

            setDimensions({ width: fieldWidth, height: fieldHeight });
        };

        calculateDimensions();
        // ResizeObserver is better for element resize, window 'resize' is good fallback
        const resizeObserver = new ResizeObserver(() => {
            calculateDimensions();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', calculateDimensions);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', calculateDimensions);
        };
    }, [aspectRatio]);

    return { dimensions, containerRef };
};
