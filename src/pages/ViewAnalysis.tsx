import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronLeft, Download, Share2, Pencil, Loader2, X } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import TacticalField from '../components/TacticalField';
import TeamLogoImage from '../components/TeamLogoImage';
import TeamRosterCard from '../components/analysis/TeamRosterCard';
import { AnalysisTabs } from '../components/AnalysisTabs';
import { useIsMobile } from '../hooks/useIsMobile';
import { nameKey, type PlayerTally } from '../utils/playerTally';
import { downloadFieldImage, fieldFileName } from '../utils/captureField';
import { sanitizeNoteHtml, isEmptyHtml } from '../utils/sanitizeHtml';
import { formatShortDate } from '../utils/formatDate';
import { analysisService } from '../services/analysisService';
import { apiFootballService } from '../services/apiFootballService';
import type { AnalysisData, AnalysisBoard } from '../services/analysisService';
import type { Player } from '../types/Player';

type Possession = 'home' | 'away';

/** Evento de partida na forma minima que esta tela consome. */
interface TallyEvent {
    type?: string;
    player_name?: string;
    secondary_player_name?: string;
}

/** Campeonato e placar reais, vindos da API-Football. */
interface FixtureInfo {
    competition?: string;
    homeScore: number | null;
    awayScore: number | null;
}

/**
 * Estado de uma cena. A raiz da analise (aba "Principal") e cada board expoem
 * exatamente estes campos, entao os dois servem de fonte sem conversao.
 */
type SceneState = Pick<
    AnalysisBoard,
    | 'homePlayersDef' | 'homePlayersOff' | 'awayPlayersDef' | 'awayPlayersOff'
    | 'homeArrowsDef' | 'awayArrowsDef'
    | 'homeRectanglesDef' | 'awayRectanglesDef'
    | 'homeBallOff' | 'awayBallOff'
>;

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
    // Mesma quebra do editor: retrato no celular, paisagem no desktop.
    const isMobile = useIsMobile();

    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [possession, setPossession] = useState<Possession>('home');
    // null = aba "Principal" (o estado da raiz da analise), igual ao editor.
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [fixture, setFixture] = useState<FixtureInfo | null>(null);
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

    // Campeonato e placar reais do jogo. `getFixturesByIds` cacheia por 6h e e
    // a mesma chamada da Home, entao normalmente ja vem do cache.
    const fixtureId = analysis?.matchId;

    useEffect(() => {
        if (!fixtureId) return;
        let cancelled = false;

        apiFootballService.getFixturesByIds([fixtureId])
            .then(map => {
                const f = map.get(fixtureId);
                if (cancelled || !f) return;
                setFixture({
                    competition: f.league?.name,
                    homeScore: f.goals?.home ?? null,
                    awayScore: f.goals?.away ?? null,
                });
            })
            .catch(() => { /* cai no campeonato e no placar salvos */ });

        return () => { cancelled = true; };
    }, [fixtureId]);

    const loading = !analysis && !notFound;

    const boards = useMemo(() => analysis?.boards ?? [], [analysis]);

    // Cena visivel: o board selecionado ou a raiz da analise.
    const scene = useMemo<SceneState | null>(() => {
        if (!analysis) return null;
        return boards.find(b => b.id === activeBoardId) ?? analysis;
    }, [analysis, boards, activeBoardId]);

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
        if (!scene) return [];
        return possession === 'home' ? scene.homePlayersOff : scene.homePlayersDef;
    }, [scene, possession]);

    const awayOnField = useMemo<Player[]>(() => {
        if (!scene) return [];
        return possession === 'home' ? scene.awayPlayersDef : scene.awayPlayersOff;
    }, [scene, possession]);

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

    if (notFound || !analysis || !scene) {
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

    // Placar e campeonato: o que a API devolve manda; sem ela, o que ficou salvo.
    const homeScore = fixture?.homeScore ?? analysis.homeScore ?? null;
    const awayScore = fixture?.awayScore ?? analysis.awayScore ?? null;
    const hasScore = homeScore != null && awayScore != null;
    const competition = fixture?.competition || analysis.competition || '';

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

                    {/*
                        Grade 1fr / auto / 1fr: o confronto fica centralizado e
                        campeonato e data ladeiam a 10% da propria coluna — perto
                        do centro, em vez de colados nas pontas do cabecalho.
                    */}
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
                        <span
                            title={competition || undefined}
                            className="hidden min-w-0 justify-self-end truncate pr-[10%] text-sm text-content-secondary md:block"
                        >
                            {competition || '—'}
                        </span>

                        <div className="flex min-w-0 items-center justify-center gap-2">
                            <span className="hidden truncate text-sm font-medium text-content-primary sm:block">
                                {analysis.homeTeam}
                            </span>
                            <TeamLogoImage logoUrl={analysis.homeTeamLogo} teamName={analysis.homeTeam} className="h-6 w-6 shrink-0" />
                            <span className="shrink-0 rounded-md bg-surface-overlay px-2 py-1 text-xs font-bold tabular-nums text-content-primary">
                                {hasScore ? `${homeScore}-${awayScore}` : 'vs'}
                            </span>
                            <TeamLogoImage logoUrl={analysis.awayTeamLogo} teamName={analysis.awayTeam} className="h-6 w-6 shrink-0" />
                            <span className="hidden truncate text-sm font-medium text-content-primary sm:block">
                                {analysis.awayTeam}
                            </span>
                        </div>

                        <span className="hidden justify-self-start whitespace-nowrap pl-[10%] text-sm tabular-nums text-content-secondary md:block">
                            {formatShortDate(analysis.matchDate, '')}
                        </span>
                    </div>

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

                {/* Coluna central. Abas, campo e anotacao sao irmaos com w-full,
                    entao a anotacao tem exatamente a largura do campo. */}
                <div className="flex min-w-0 flex-col gap-3">
                    {/* Posse de bola */}
                    <div className="flex flex-col items-center gap-1.5">
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

                    {/* Abas de cena, so quando a analise tem mais de uma. Ficam
                        por fora do TacticalField: passadas por `tabsSlot` elas
                        ligam um pt-12 que come a altura da caixa. */}
                    {boards.length > 0 && (
                        <AnalysisTabs
                            boards={boards}
                            activeBoardId={activeBoardId}
                            onSwitchBoard={setActiveBoardId}
                            onAddBoard={() => { /* somente leitura */ }}
                            onUpdateBoardTitle={() => { /* somente leitura */ }}
                            onDeleteBoard={() => { /* somente leitura */ }}
                            readOnly
                        />
                    )}

                    {/* Campinho — mesma caixa da tela de edicao: a largura manda e
                        a altura sai da proporcao 105x68. Somente leitura. */}
                    <div
                        ref={fieldRef}
                        className="relative w-full overflow-hidden rounded-card border border-line bg-surface-raised shadow-card"
                        style={isMobile
                            ? { aspectRatio: '68 / 105' }
                            : { aspectRatio: '105 / 68', minHeight: 320 }}
                    >
                        <TacticalField
                            players={fieldPlayers}
                            onPlayerMove={() => { /* somente leitura */ }}
                            onPlayerClick={p => p.note && setOpenNote({ name: p.name, note: p.note })}
                            playerNotes={playerNotes}
                            readOnly
                            orientation={isMobile ? 'vertical' : 'horizontal'}
                            arrows={possession === 'home' ? scene.homeArrowsDef : scene.awayArrowsDef}
                            rectangles={possession === 'home' ? scene.homeRectanglesDef : scene.awayRectanglesDef}
                            ballPosition={possession === 'home' ? scene.homeBallOff : scene.awayBallOff}
                            playerScale={isMobile ? 1.5 : 0.85}
                            ballScale={0.7}
                        />
                    </div>

                    {/* ── Anotacao do time com a posse, so ela ── */}
                    <section>
                        <h2 className="mb-2 text-base font-bold text-content-primary">Anotações</h2>
                        <TeamNotesBox
                            teamName={possession === 'home' ? analysis.homeTeam : analysis.awayTeam}
                            teamColor={possession === 'home' ? analysis.homeTeamColor : analysis.awayTeamColor}
                            notes={possession === 'home' ? analysis.notasCasa : analysis.notasVisitante}
                            noteHtml={possession === 'home' ? analysis.homeNoteHtml : analysis.awayNoteHtml}
                        />
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
