import { useState } from 'react';
import { Globe2 } from 'lucide-react';
import { getProxiedLogoUrl } from '../../utils/logoUrl';

/** Usa o código da bandeira da API, inclusive subdivisões como gb-eng. */
export default function LeagueFlag({ flag, country }: { flag?: string | null; country: string }) {
    const [sourceIndex, setSourceIndex] = useState(0);
    const code = flag?.match(/\/([a-z]{2}(?:-[a-z]+)?)\.svg(?:\?.*)?$/i)?.[1].toLowerCase();
    const sources = [code ? `https://flagcdn.com/${code}.svg` : undefined, getProxiedLogoUrl(flag)].filter(Boolean);
    const source = sources[sourceIndex];

    if (!source) return <Globe2 size={13} aria-label={country || 'Internacional'} className="shrink-0" />;
    return <img src={source} alt={country} title={country} loading="lazy" decoding="async"
        className="h-3 w-4 shrink-0 rounded-[2px] object-contain"
        onError={() => setSourceIndex(index => index + 1)} />;
}
