import React from 'react';
import { Loader2 } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import type { ApiFixture } from '../../types/api-football';

interface Props {
    fixture: ApiFixture;
    /** Id do jogo cuja analise esta sendo criada agora. */
    creating: boolean;
    /** Trava os demais cards enquanto uma criacao esta em andamento. */
    disabled: boolean;
    onCreate: (fixture: ApiFixture) => void;
}

function formatKickoff(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${date} - ${time}`;
}

/** Um jogo futuro. Clicar cria uma analise ja com as escalacoes, quando houver. */
const UpcomingFixtureCard: React.FC<Props> = ({ fixture, creating, disabled, onCreate }) => {
    const home = fixture.teams.home;
    const away = fixture.teams.away;

    return (
        <button
            onClick={() => onCreate(fixture)}
            disabled={disabled}
            className="
                w-full rounded-control border border-line bg-surface-overlay p-3 text-left
                transition-colors hover:border-line-strong hover:bg-surface-hover
                disabled:cursor-not-allowed disabled:opacity-60
            "
        >
            <p className="mb-2 truncate text-center text-xs text-content-secondary">
                {fixture.league?.name || 'Competição'}
            </p>

            <div className="flex items-center justify-center gap-2">
                <TeamLogoImage logoUrl={home.logo} teamName={home.name} className="h-7 w-7 shrink-0" />

                <span className="shrink-0 text-xs font-semibold tabular-nums text-content-primary">
                    {creating
                        ? <Loader2 size={14} className="animate-spin" />
                        : formatKickoff(fixture.fixture.date)
                    }
                </span>

                <TeamLogoImage logoUrl={away.logo} teamName={away.name} className="h-7 w-7 shrink-0" />
            </div>

            <div className="mt-1.5 flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-center text-[11px] text-content-secondary">
                    {home.name}
                </span>
                <span className="min-w-0 flex-1 truncate text-center text-[11px] text-content-secondary">
                    {away.name}
                </span>
            </div>
        </button>
    );
};

export default UpcomingFixtureCard;
