import React from 'react';
import { Loader2 } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import type { ApiFixture } from '../../types/api-football';
import { fixtureTimeLabel, isFixtureFinished, isFixtureLive } from '../../utils/fixtureStatus';

interface Props {
    fixture: ApiFixture;
    /** Os onze titulares dos dois times já foram publicados (só antes do jogo). */
    lineupsConfirmed: boolean;
    /** A análise deste jogo está sendo criada agora. */
    creating: boolean;
    /** Outra análise está sendo criada: bloqueia novos cliques. */
    disabled: boolean;
    onSelect: (fixture: ApiFixture) => void;
}

const TeamRow: React.FC<{ name: string; logo: string }> = ({ name, logo }) => (
    <span className="flex h-7 min-w-0 items-center gap-3">
        <TeamLogoImage logoUrl={logo} teamName={name} className="h-7 w-7 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-content-primary" title={name}>{name}</span>
    </span>
);

/** Card de uma partida: times à esquerda, horário (ou placar) à direita. Clicar cria a análise. */
const FixtureCard: React.FC<Props> = ({ fixture: f, lineupsConfirmed, creating, disabled, onSelect }) => {
    const finished = isFixtureFinished(f);
    const live = isFixtureLive(f);
    const label = fixtureTimeLabel(f);
    const isClock = /^\d/.test(label);
    const elapsed = f.fixture.status.elapsed;

    return (
        <button
            type="button"
            onClick={() => onSelect(f)}
            disabled={disabled}
            aria-label={`Analisar ${f.teams.home.name} contra ${f.teams.away.name}`}
            title="Criar análise deste jogo"
            className="relative flex h-full w-full flex-col justify-center gap-3 rounded-control border border-line bg-surface-raised px-4 py-4 text-left transition-colors hover:border-brand-primary/50 hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <span className="flex items-stretch gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-3">
                    <TeamRow name={f.teams.home.name} logo={f.teams.home.logo} />
                    <TeamRow name={f.teams.away.name} logo={f.teams.away.logo} />
                </span>

                <span aria-hidden className="w-px self-stretch bg-line" />

                {finished || live ? (
                    <span className="flex w-12 shrink-0 flex-col gap-3 text-center text-base font-bold tabular-nums text-content-primary">
                        <span className="grid h-7 place-items-center">{f.goals?.home ?? '–'}</span>
                        <span className="grid h-7 place-items-center">{f.goals?.away ?? '–'}</span>
                    </span>
                ) : (
                    <span className={`grid w-12 shrink-0 place-items-center text-center font-bold tabular-nums text-content-primary ${isClock ? 'text-sm' : 'text-[11px] leading-tight'}`}>
                        {label}
                    </span>
                )}
            </span>

            {(finished || live || lineupsConfirmed) && (
                <span className="flex flex-wrap gap-1.5 text-[10px] font-semibold leading-4">
                    {finished && <span className="rounded-md bg-yellow-400/15 px-2 py-0.5 text-yellow-300">Encerrada</span>}
                    {live && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-red-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            AGORA{elapsed ? ` · ${elapsed}'` : ''}
                        </span>
                    )}
                    {lineupsConfirmed && <span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-emerald-300">Escalações confirmadas</span>}
                </span>
            )}

            {creating && (
                <span className="absolute inset-0 grid place-items-center rounded-control bg-surface-base/70" role="status" aria-label="Criando análise">
                    <Loader2 size={20} className="animate-spin text-brand-primary" />
                </span>
            )}
        </button>
    );
};

export default FixtureCard;
