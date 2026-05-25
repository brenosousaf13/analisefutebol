import { useState } from 'react';
import { getProxiedLogoUrl } from '../utils/logoUrl';

interface TeamLogoImageProps {
    logoUrl?: string | null;
    teamName?: string;
    className?: string;
}

function getInitials(name?: string): string {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function TeamLogoImage({ logoUrl, teamName, className = 'w-16 h-16' }: TeamLogoImageProps) {
    const [failed, setFailed] = useState(false);
    const proxied = getProxiedLogoUrl(logoUrl);

    if (!proxied || failed) {
        return (
            <div className={`${className} rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-sm leading-none select-none">
                    {getInitials(teamName)}
                </span>
            </div>
        );
    }

    return (
        <img
            src={proxied}
            alt={teamName}
            className={`${className} object-contain`}
            onError={() => setFailed(true)}
        />
    );
}
