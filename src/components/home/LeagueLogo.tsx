import React, { useState } from 'react';
import LeagueFlag from './LeagueFlag';
import { getProxiedLogoUrl } from '../../utils/logoUrl';
import type { ApiFixture } from '../../types/api-football';

/**
 * Logo do campeonato, quando a API fornece. Em fundo claro porque vários
 * escudos de liga são escuros e sumiriam sobre o tema escuro.
 * Sem logo (ou se ela falhar), cai na bandeira do país.
 */
const LeagueLogo: React.FC<{ league: ApiFixture['league'] }> = ({ league }) => {
    const [failed, setFailed] = useState(false);
    const src = getProxiedLogoUrl(league.logo);

    if (!src || failed) {
        return (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface-overlay text-content-secondary">
                <LeagueFlag flag={league.flag} country={league.country} />
            </span>
        );
    }

    return (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white/90 p-1.5">
            <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
                onError={() => setFailed(true)}
            />
        </span>
    );
};

export default LeagueLogo;
