import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';
import TeamPicker from './TeamPicker';
import { createAnalysisFromTeams } from '../../services/customMatchService';
import { TRACKED_LEAGUES } from '../../data/trackedLeagues';
import type { TeamOption } from '../../types/teamOption';

const OTHER = '__other';

const fieldClass = 'h-12 w-full rounded-control border border-line bg-surface-raised px-3 text-sm text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-line-strong focus:ring-2 focus:ring-brand-primary/25 disabled:opacity-60 [color-scheme:dark]';

interface Props {
    open: boolean;
    onClose: () => void;
    /** Hoje (AAAA-MM-DD), data sugerida. */
    today: string;
}

const ModalBody: React.FC<Omit<Props, 'open'>> = ({ onClose, today }) => {
    const navigate = useNavigate();
    const [home, setHome] = useState<TeamOption | null>(null);
    const [away, setAway] = useState<TeamOption | null>(null);
    const [competition, setCompetition] = useState('');
    const [otherCompetition, setOtherCompetition] = useState('');
    const [date, setDate] = useState(today);
    const [time, setTime] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !creating) onClose(); };
        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose, creating]);

    const groups = useMemo(() => {
        const byGroup = new Map<string, typeof TRACKED_LEAGUES[number][]>();
        for (const league of TRACKED_LEAGUES) {
            const list = byGroup.get(league.group);
            if (list) list.push(league); else byGroup.set(league.group, [league]);
        }
        return [...byGroup.entries()];
    }, []);

    const competitionName = competition === OTHER ? otherCompetition.trim() : competition;
    const ready = !!home && !!away && home.id !== away.id && competitionName.length > 0 && date.length === 10;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ready || creating || !home || !away) return;
        setCreating(true);
        try {
            const { analysisId, missingSquads } = await createAnalysisFromTeams({
                home, away, competition: competitionName, date, time: time || undefined,
            });
            if (missingSquads.length > 0) {
                toast(`Elenco de ${missingSquads.join(' e ')} indisponível na API — os jogadores precisarão ser adicionados à mão.`, { icon: '⚠️', duration: 6000 });
            }
            navigate(`/analysis-complete/saved/${analysisId}`);
        } catch {
            toast.error('Não foi possível criar a análise.');
            setCreating(false);
        }
    };

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="create-match-title" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={creating ? undefined : onClose} aria-hidden />

            <form
                onSubmit={submit}
                className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-card border border-line bg-surface-base shadow-pop"
            >
                <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
                    <div>
                        <h2 id="create-match-title" className="text-xl font-bold tracking-tight text-content-primary">Criar partida</h2>
                        <p className="mt-1 text-sm text-content-secondary">
                            Escolha os dois times, a competição e a data. O campo começa vazio e os elencos completos ficam à disposição para você escolher os titulares.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={creating}
                        aria-label="Fechar"
                        className="rounded-control p-2 text-content-secondary transition-colors enabled:hover:bg-surface-overlay enabled:hover:text-content-primary disabled:opacity-40"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2 sm:px-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <TeamPicker label="Time da casa" value={home} onChange={setHome} excludeId={away?.id} disabled={creating} autoFocus />
                        <TeamPicker label="Time visitante" value={away} onChange={setAway} excludeId={home?.id} disabled={creating} />
                    </div>

                    <div className="mt-4">
                        <label htmlFor="create-match-competition" className="mb-1.5 block text-xs font-semibold text-content-secondary">Competição</label>
                        <select
                            id="create-match-competition"
                            value={competition}
                            onChange={e => setCompetition(e.target.value)}
                            disabled={creating}
                            className={fieldClass}
                        >
                            <option value="">Selecione a competição</option>
                            {groups.map(([group, leagues]) => (
                                <optgroup key={group} label={group}>
                                    {leagues.map(league => <option key={league.id} value={league.name}>{league.name}</option>)}
                                </optgroup>
                            ))}
                            <option value={OTHER}>Outra competição…</option>
                        </select>
                        {competition === OTHER && (
                            <input
                                type="text"
                                value={otherCompetition}
                                onChange={e => setOtherCompetition(e.target.value)}
                                placeholder="Nome da competição"
                                aria-label="Nome da competição"
                                maxLength={80}
                                disabled={creating}
                                className={`${fieldClass} mt-2`}
                            />
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="create-match-date" className="mb-1.5 block text-xs font-semibold text-content-secondary">Data</label>
                            <input id="create-match-date" type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={creating} className={fieldClass} />
                        </div>
                        <div>
                            <label htmlFor="create-match-time" className="mb-1.5 block text-xs font-semibold text-content-secondary">Horário (opcional)</label>
                            <input id="create-match-time" type="time" value={time} onChange={e => setTime(e.target.value)} disabled={creating} className={fieldClass} />
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-line-subtle px-5 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={creating}
                        className="rounded-control px-4 py-2.5 text-sm font-semibold text-content-secondary transition-colors enabled:hover:text-content-primary disabled:opacity-40"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!ready || creating}
                        className="inline-flex items-center gap-2 rounded-control bg-brand-primary px-5 py-2.5 text-sm font-bold text-nav-dark transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {creating && <Loader2 size={15} className="animate-spin" />}
                        {creating ? 'Criando…' : 'Criar análise'}
                    </button>
                </div>
            </form>
        </div>
    );
};

/** "Criar partida": dois times, competição e data → análise com campo vazio e elencos completos. */
const CreateMatchModal: React.FC<Props> = ({ open, ...rest }) => (open ? <ModalBody {...rest} /> : null);

export default CreateMatchModal;
