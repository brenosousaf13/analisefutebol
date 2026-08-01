import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronLeft, Download, Share2, Pencil, Loader2, X } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import TacticalField from '../components/TacticalField';
import TeamLogoImage from '../components/TeamLogoImage';
import TeamRosterCard from '../components/analysis/TeamRosterCard';
import { nameKey, type PlayerTally } from '../utils/playerTally';
import { downloadFieldImage, fieldFileName } from '../utils/captureField';
import { sanitizeNoteHtml, isEmptyHtml } from '../utils/sanitizeHtml';
import { analysisService } from '../services/analysisService';
import type { AnalysisData } from '../services/analysisService';
import type { Player } from '../types/Player';

type Possession = 'home' | 'away';

/** Evento de partida na forma minima que esta tela consome. */
interface TallyEvent {
    type?: string;
    player_name?: string;
    secondary_player_name?: string;
}

function formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Botao de acao do cabecalho — so icone, com o rotulo no title/aria. */
const IconAction: React.FC<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}> = ({ label, onClick, disabled, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className="
            grid h-9 w-9 place-items-center rounded-control border border-line
            bg-surface-raised text-content-secondary transition-colors
            hover:border-line-strong hover:text-content-primary
            disabled:cursor-not-allowed disabled:opacity-50
        "
    >
        {children}
    </button>
);

/**
 * Quadro de anotacao coletiva de um time.
 *
 * Analises novas guardam HTML com formatacao (`noteHtml`); as antigas guardam
 * texto puro (`notes`). Enquanto as antigas nao forem migradas, os dois
 * caminhos precisam funcionar — o HTML tem prioridade quando existe.
 */
const TeamNotesBox: React.FC<{
    teamName: string; teamColor?: string; notes?: string; noteHtml?: string;
}> = ({ teamName, teamColor, notes, noteHtml }) => {
    const html = !isEmptyHtml(noteHtml) ? sanitizeNoteHtml(noteHtml) : null;

    return (
        <div className="rounded-card border border-line bg-surface-raised p-4 shadow-card">
            <h3
                className="mb-2 border-l-4 pl-2 text-sm font-bold text-content-primary"
                style={{ borderColor: teamColor || 'transparent' }}
            >
                {teamName}
            </h3>

            {html ? (
                // Sanitizado logo acima: sem isso, uma analise compartilhada por
                // link publico poderia executar script no navegador de quem abrisse.
                <div
                    className="note-content text-sm leading-relaxed text-content-secondary"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            ) : notes?.trim() ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">{notes}</p>
            ) : (
                <p className="text-sm italic text-content-muted">Sem anotações para este time.</p>
            )}
        </div>
    );
};

const ViewAnalysis: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [possession, setPossession] = useState<Possession>('home');
    const [openNote, setOpenNote] = useState<{ name: string; note: string } | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [sharing, setSharing] = useState(false);

    const fieldRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        analysisService.getAnalysis(id)
            .then(data => {
                if (cancelled) return;
                if (data) setAnalysis(data);
                else setNotFound(true);
            })
            .catch(() => { if (!cancelled) setNotFound(true); });

        return () => { cancelled = true; };
    }, [id]);

    const loading = !analysis && !notFound;

    // Gols e assistencias por jogador. Os eventos guardam o nome, nao o id,
    // entao a associacao e feita por nome normalizado.
    const tallies = useMemo(() => {
        const map = new Map<string, PlayerTally>();
        if (!analysis?.events) return map;

        const bump = (name: string | undefined, field: keyof PlayerTally) => {
            if (!name?.trim()) return;
            const key = nameKey(name);
            const current = map.get(key) ?? { goals: 0, assists: 0 };
            current[field] += 1;
            map.set(key, current);
        };

        for (const raw of analysis.events as TallyEvent[]) {
            if (raw?.type !== 'goal') continue;
            bump(raw.player_name, 'goals');
            bump(raw.secondary_player_name, 'assists');
        }
        return map;
    }, [analysis]);

    // Mesma semantica do editor: quem tem a posse aparece na fase ofensiva,
    // o adversario na defensiva.
    const homeOnField = useMemo<Player[]>(() => {
        if (!analysis) return [];
        return possession === 'home' ? analysis.homePlayersOff : analysis.homePlayersDef;
    }, [analysis, possession]);

    const awayOnField = useMemo<Player[]>(() => {
        if (!analysis) return [];
        return possession === 'home' ? analysis.awayPlayersDef : analysis.awayPlayersOff;
    }, [analysis, possession]);

    const fieldPlayers = useMemo<Player[]>(() => {
        if (!analysis) return [];
        const paint = (list: Player[], color: string, bg?: string) =>
            list.map(p => ({ ...p, color, backgroundColor: bg, borderColor: color }));

        return [
            ...paint(homeOnField, analysis.homeTeamColor, analysis.homeTeamBgColor),
            ...paint(awayOnField, analysis.awayTeamColor, analysis.awayTeamBgColor),
        ];
    }, [analysis, homeOnField, awayOnField]);

    const playerNotes = useMemo(() => {
        const acc: Record<number, string> = {};
        for (const p of fieldPlayers) if (p.note) acc[p.id] = p.note;
        return acc;
    }, [fieldPlayers]);

    const handleShare = useCallback(async () => {
        if (!id) return;
        setSharing(true);
        try {
            const token = await analysisService.generateShareLink(id);
            const url = `${window.location.origin}/s/${token}`;
            await navigator.clipboard.writeText(url);
            toast.success('Link copiado para a área de transferência.');
        } catch {
            toast.error('Não foi possível gerar o link de compartilhamento.');
        } finally {
            setSharing(false);
        }
    }, [id]);

    const handleDownload = useCallback(async () => {
        if (!fieldRef.current || !analysis) return;
        setDownloading(true);
        try {
            const posseDe = possession === 'home' ? analysis.homeTeam : analysis.awayTeam;
            await downloadFieldImage(
                fieldRef.current,
                fieldFileName(analysis.homeTeam, analysis.awayTeam, posseDe),
            );
        } catch {
            toast.error('Não foi possível gerar a imagem do campinho.');
        } finally {
            setDownloading(false);
        }
    }, [analysis, possession]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-content-muted">
                    <Loader2 size={16} className="animate-spin" />
                    Carregando análise…
                </div>
            </AppLayout>
        );
    }

    if (notFound || !analysis) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-md rounded-card border border-line bg-surface-raised px-6 py-16 text-center shadow-card">
                    <h1 className="mb-2 text-xl font-bold text-content-primary">Análise não encontrada</h1>
                    <p className="mb-6 text-sm text-content-secondary">
                        Ela pode ter sido removida ou o link está incorreto.
                    </p>
                    <button
                        onClick={() => navigate('/biblioteca')}
                        className="rounded-control bg-brand-primary px-4 py-2 text-sm font-semibold text-nav-dark"
                    >
                        Ir para a biblioteca
                    </button>
                </div>
            </AppLayout>
        );
    }

    const hasScore = analysis.homeScore != null && analysis.awayScore != null;

    return (
        <AppLayout bare edgeToggle>
            {/* ── Cabecalho da analise ── */}
            <header className="sticky top-0 z-20 border-b border-line bg-surface-base/90 px-4 py-3 backdrop-blur lg:px-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="Voltar"
                        title="Voltar"
                        className="shrink-0 rounded-control p-1.5 text-content-secondary transition-colors hover:bg-surface-overlay hover:text-content-primary"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <span className="hidden shrink-0 truncate text-sm text-content-secondary md:block">
                        {analysis.competition || '—'}
                    </span>

                    <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                        <span className="hidden truncate text-sm font-medium text-content-primary sm:block">
                            {analysis.homeTeam}
                        </span>
                        <TeamLogoImage logoUrl={analysis.homeTeamLogo} teamName={analysis.homeTeam} className="h-6 w-6 shrink-0" />
                        <span className="shrink-0 rounded-md bg-surface-overlay px-2 py-1 text-xs font-bold tabular-nums text-content-primary">
                            {hasScore ? `${analysis.homeScore}-${analysis.awayScore}` : 'vs'}
                        </span>
                        <TeamLogoImage logoUrl={analysis.awayTeamLogo} teamName={analysis.awayTeam} className="h-6 w-6 shrink-0" />
                        <span className="hidden truncate text-sm font-medium text-content-primary sm:block">
                            {analysis.awayTeam}
                        </span>
                    </div>

                    <span className="hidden shrink-0 text-sm tabular-nums text-content-secondary md:block">
                        {formatDate(analysis.matchDate)}
                    </span>

                    <div className="flex shrink-0 items-center gap-2">
                        <IconAction label="Baixar imagem do campinho" onClick={handleDownload} disabled={downloading}>
                            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        </IconAction>
                        <IconAction label="Compartilhar análise" onClick={handleShare} disabled={sharing}>
                            {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                        </IconAction>
                        <IconAction label="Editar análise" onClick={() => navigate(`/analysis-complete/saved/${analysis.id}`)}>
                            <Pencil size={16} />
                        </IconAction>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:p-6 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
                <TeamRosterCard
                    teamName={analysis.homeTeam}
                    teamLogo={analysis.homeTeamLogo}
                    coachName={analysis.homeCoach}
                    teamColor={analysis.homeTeamColor}
                    players={homeOnField}
                    tallies={tallies}
                    onPlayerClick={p => p.note && setOpenNote({ name: p.name, note: p.note })}
                />

                <div className="min-w-0">
                    {/* Posse de bola */}
                    <div className="mb-3 flex flex-col items-center gap-1.5">
                        <span className="text-xs font-semibold text-content-secondary">Posse de bola</span>
                        <div className="inline-flex rounded-full border border-line bg-surface-overlay p-0.5">
                            {(['home', 'away'] as Possession[]).map(side => {
                                const label = side === 'home' ? analysis.homeTeam : analysis.awayTeam;
                                const active = possession === side;
                                return (
                                    <button
                                        key={side}
                                        onClick={() => setPossession(side)}
                                        aria-pressed={active}
                                        className={`
                                            max-w-[150px] truncate rounded-full px-4 py-1.5 text-xs font-semibold transition-colors
                                            ${active
                                                ? 'bg-brand-primary text-nav-dark'
                                                : 'text-content-secondary hover:text-content-primary'
                                            }
                                        `}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Campinho — somente leitura, sem a bolinha de anotacao */}
                    <div ref={fieldRef} className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
                        <TacticalField
                            players={fieldPlayers}
                            onPlayerMove={() => { /* somente leitura */ }}
                            onPlayerClick={p => p.note && setOpenNote({ name: p.name, note: p.note })}
                            playerNotes={playerNotes}
                            readOnly
                            arrows={possession === 'home' ? analysis.homeArrowsDef : analysis.awayArrowsDef}
                            rectangles={possession === 'home' ? analysis.homeRectanglesDef : analysis.awayRectanglesDef}
                            ballPosition={possession === 'home' ? analysis.homeBallOff : analysis.awayBallOff}
                            playerScale={0.85}
                        />
                    </div>

                    {/* ── Anotacoes coletivas, um quadro por time ── */}
                    <section className="mt-4">
                        <h2 className="mb-2 text-base font-bold text-content-primary">Anotações</h2>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <TeamNotesBox
                                teamName={analysis.homeTeam}
                                teamColor={analysis.homeTeamColor}
                                notes={analysis.notasCasa}
                                noteHtml={analysis.homeNoteHtml}
                            />
                            <TeamNotesBox
                                teamName={analysis.awayTeam}
                                teamColor={analysis.awayTeamColor}
                                notes={analysis.notasVisitante}
                                noteHtml={analysis.awayNoteHtml}
                            />
                        </div>
                    </section>
                </div>

                <TeamRosterCard
                    teamName={analysis.awayTeam}
                    teamLogo={analysis.awayTeamLogo}
                    coachName={analysis.awayCoach}
                    teamColor={analysis.awayTeamColor}
                    players={awayOnField}
                    tallies={tallies}
                    onPlayerClick={p => p.note && setOpenNote({ name: p.name, note: p.note })}
                />
            </div>

            {/* Anotacao individual do jogador */}
            {openNote && (
                <div
                    className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={() => setOpenNote(null)}
                >
                    <div
                        className="w-full max-w-md rounded-card border border-line bg-surface-raised p-5 shadow-pop"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <h3 className="text-base font-bold text-content-primary">{openNote.name}</h3>
                            <button
                                onClick={() => setOpenNote(null)}
                                aria-label="Fechar"
                                className="rounded-control p-1 text-content-muted transition-colors hover:text-content-primary"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">
                            {openNote.note}
                        </p>
                    </div>
                </div>
            )}

            <Toaster position="bottom-right" />
        </AppLayout>
    );
};

export default ViewAnalysis;
