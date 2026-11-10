import React, { useId, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import { MIN_TEAM_SEARCH_CHARS, useTeamSearch } from '../../hooks/useTeamSearch';
import type { TeamOption } from '../../types/teamOption';
import { countryLabel } from '../../utils/leagueDisplay';

interface Props {
    label: string;
    value: TeamOption | null;
    onChange: (team: TeamOption | null) => void;
    /** Time já escolhido do outro lado: não pode ser escolhido de novo. */
    excludeId?: number;
    disabled?: boolean;
    autoFocus?: boolean;
}

const MAX_VISIBLE = 30;

const TeamLine: React.FC<{ team: TeamOption }> = ({ team }) => (
    <>
        <TeamLogoImage logoUrl={team.logo} teamName={team.name} className="h-7 w-7 shrink-0" />
        <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-content-primary">{team.name}</span>
            <span className="block truncate text-[11px] text-content-secondary">
                {team.national ? 'Seleção' : countryLabel(team.country)}
            </span>
        </span>
    </>
);

/** Escolha de um time: digitou 3 letras, os resultados aparecem logo abaixo do campo. */
const TeamPicker: React.FC<Props> = ({ label, value, onChange, excludeId, disabled, autoFocus }) => {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputId = useId();
    const { tooShort, loading, teams, error } = useTeamSearch(query);
    const options = teams.slice(0, MAX_VISIBLE);
    const hasQuery = query.trim().length > 0;

    const pick = (team: TeamOption) => {
        if (team.id === excludeId) return;
        onChange(team);
        setQuery('');
        setActive(0);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(i => Math.min(i + 1, options.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const team = options[active];
            if (team) pick(team);
        }
    };

    return (
        <div className="min-w-0">
            <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-content-secondary">{label}</label>

            {value ? (
                <div className="flex h-12 items-center gap-3 rounded-control border border-line-strong bg-surface-raised px-3">
                    <TeamLine team={value} />
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        disabled={disabled}
                        aria-label={`Trocar ${label.toLowerCase()}`}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-content-muted transition-colors enabled:hover:bg-surface-hover enabled:hover:text-content-primary disabled:opacity-40"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <>
                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                        <input
                            id={inputId}
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setActive(0); }}
                            onKeyDown={onKeyDown}
                            placeholder="Digite o nome do time"
                            autoComplete="off"
                            spellCheck={false}
                            autoFocus={autoFocus}
                            disabled={disabled}
                            role="combobox"
                            aria-expanded={hasQuery}
                            aria-controls={`${inputId}-list`}
                            className="h-12 w-full rounded-control border border-line bg-surface-raised pl-9 pr-9 text-sm text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-line-strong focus:ring-2 focus:ring-brand-primary/25"
                        />
                        {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-content-muted" />}
                    </div>

                    {hasQuery && (
                        <ul
                            id={`${inputId}-list`}
                            role="listbox"
                            aria-label={`Times para ${label.toLowerCase()}`}
                            className="mt-1.5 max-h-56 overflow-y-auto overscroll-contain rounded-control border border-line bg-surface-raised p-1"
                        >
                            {tooShort && (
                                <li className="px-3 py-2.5 text-xs text-content-muted">Digite pelo menos {MIN_TEAM_SEARCH_CHARS} letras.</li>
                            )}
                            {!tooShort && error && (
                                <li className="px-3 py-2.5 text-xs text-amber-300">Não foi possível buscar os times. Tente de novo.</li>
                            )}
                            {!tooShort && !error && !loading && options.length === 0 && (
                                <li className="px-3 py-2.5 text-xs text-content-muted">Nenhum time encontrado.</li>
                            )}
                            {!tooShort && !error && options.length === 0 && loading && (
                                <li className="px-3 py-2.5 text-xs text-content-muted">Buscando…</li>
                            )}
                            {options.map((team, index) => {
                                const blocked = team.id === excludeId;
                                return (
                                    <li key={team.id} role="option" aria-selected={index === active} aria-disabled={blocked}>
                                        <button
                                            type="button"
                                            disabled={blocked}
                                            onClick={() => pick(team)}
                                            onMouseEnter={() => setActive(index)}
                                            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${index === active ? 'bg-surface-hover' : ''}`}
                                        >
                                            <TeamLine team={team} />
                                            {blocked && <span className="text-[10px] text-content-muted">já escolhido</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
};

export default TeamPicker;
