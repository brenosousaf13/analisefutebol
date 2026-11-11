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

/** Escudo grande com o nome embaixo, centralizados. */
const TeamColumn: React.FC<{ name: string; logo: string }> = ({ name, logo }) => (
    <span className="flex min-w-0 flex-col items-center gap-2 text-center">
        <TeamLogoImage logoUrl={logo} teamName={name} className="h-14 w-14 shrink-0" />
        <span className="line-clamp-2 w-full break-words text-sm font-semibold leading-tight text-content-primary" title={name}>{name}</span>
    </span>
);

/**
 * Card de uma partida: escudo e nome do mandante à esquerda, do visitante à direita e, no
 * meio, o placar (jogo ao vivo ou encerrado) ou o horário, com a situação logo abaixo.
 * Clicar no card cria a análise.
 */
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
            className="relative grid h-full w-full grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-control border border-line bg-surface-raised px-4 py-5 text-left transition-colors hover:border-brand-primary/50 hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <TeamColumn name={f.teams.home.name} logo={f.teams.home.logo} />

            <span className="flex min-w-[4.5rem] flex-col items-center gap-2 self-center text-center">
                {finished || live ? (
                    <span className="text-2xl font-bold tabular-nums text-content-primary">
                        {f.goals?.home ?? '–'} <span className="text-content-muted">–</span> {f.goals?.away ?? '–'}
                    </span>
                ) : (
                    <span className={`font-bold tabular-nums text-content-primary ${isClock ? 'text-2xl' : 'text-sm'}`}>{label}</span>
                )}

                {live && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-red-300">
                        <span className="h-2 w-2 rounded-full border-2 border-red-400" />
                        {elapsed ? `${elapsed}'` : 'AGORA'}
                    </span>
                )}
                {finished && <span className="text-[11px] font-semibold text-yellow-300">Encerrada</span>}
                {lineupsConfirmed && <span className="text-[10px] font-semibold leading-tight text-emerald-300">Escalações confirmadas</span>}
            </span>

            <TeamColumn name={f.teams.away.name} logo={f.teams.away.logo} />

            {creating && (
                <span className="absolute inset-0 grid place-items-center rounded-control bg-surface-base/70" role="status" aria-label="Criando análise">
                    <Loader2 size={20} className="animate-spin text-brand-primary" />
                </span>
            )}
        </button>
    );
};

export default FixtureCard;
