import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    addDays, firstDayOfMonth, formatLongDate, formatNavLabel, lastDayOfMonth, monthCells, monthOf,
    monthTitle, shiftMonth,
} from '../../utils/agendaDates';

interface Props {
    /** Data escolhida, AAAA-MM-DD. */
    value: string;
    today: string;
    /** Até onde as setas recuam. */
    arrowMin: string;
    /** Data mais antiga que o calendário aceita. */
    calendarMin: string;
    /** Data mais distante que as setas e o calendário aceitam. */
    max: string;
    onChange: (date: string) => void;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const arrowClass = 'grid h-10 w-10 shrink-0 place-items-center text-content-secondary transition-colors enabled:hover:bg-surface-hover enabled:hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-30';

/**
 * Filtro de data: setas para dias vizinhos e, no meio, o dia escolhido
 * ("Hoje" ou "ter, 03/11"). Clicar no texto abre um calendário.
 */
const DateNavigator: React.FC<Props> = ({ value, today, arrowMin, calendarMin, max, onChange }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(() => monthOf(value));
    const rootRef = useRef<HTMLDivElement>(null);
    const popoverId = useId();

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const canGoBack = value > arrowMin;
    const canGoForward = value < max;
    const canPrevMonth = firstDayOfMonth(view.year, view.month) > calendarMin;
    const canNextMonth = lastDayOfMonth(view.year, view.month) < max;

    const toggle = () => {
        if (!open) setView(monthOf(value));
        setOpen(v => !v);
    };

    const pick = (date: string) => {
        onChange(date);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className="relative">
            <div className="flex items-stretch overflow-hidden rounded-control border border-line bg-surface-raised">
                <button
                    type="button"
                    onClick={() => onChange(addDays(value, -1))}
                    disabled={!canGoBack}
                    aria-label="Dia anterior"
                    className={arrowClass}
                >
                    <ChevronLeft size={18} />
                </button>

                <button
                    type="button"
                    onClick={toggle}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-controls={open ? popoverId : undefined}
                    aria-label={`${formatLongDate(value)}. Escolher outra data`}
                    className="flex min-w-[8.5rem] items-center justify-center gap-2 border-x border-line-subtle px-3 text-sm font-semibold text-content-primary transition-colors hover:bg-surface-hover"
                >
                    <CalendarDays size={15} className="text-content-secondary" />
                    <span className="tabular-nums">{formatNavLabel(value, today)}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onChange(addDays(value, 1))}
                    disabled={!canGoForward}
                    aria-label="Próximo dia"
                    className={arrowClass}
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {open && (
                <div
                    id={popoverId}
                    role="dialog"
                    aria-label="Escolher data"
                    className="absolute left-0 top-[calc(100%+8px)] z-40 w-72 rounded-card border border-line bg-surface-raised p-3 shadow-pop"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setView(v => shiftMonth(v.year, v.month, -1))}
                            disabled={!canPrevMonth}
                            aria-label="Mês anterior"
                            className="grid h-8 w-8 place-items-center rounded-control text-content-secondary transition-colors enabled:hover:bg-surface-hover enabled:hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold text-content-primary">
                            {capitalize(monthTitle(view.year, view.month))}
                        </span>
                        <button
                            type="button"
                            onClick={() => setView(v => shiftMonth(v.year, v.month, 1))}
                            disabled={!canNextMonth}
                            aria-label="Próximo mês"
                            className="grid h-8 w-8 place-items-center rounded-control text-content-secondary transition-colors enabled:hover:bg-surface-hover enabled:hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 text-center">
                        {WEEKDAY_INITIALS.map((letter, index) => (
                            <span key={index} aria-hidden className="py-1 text-[11px] font-semibold text-content-muted">{letter}</span>
                        ))}
                        {monthCells(view.year, view.month).map((date, index) => {
                            if (!date) return <span key={`blank-${index}`} />;
                            const disabled = date < calendarMin || date > max;
                            const selected = date === value;
                            const isToday = date === today;
                            return (
                                <button
                                    key={date}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => pick(date)}
                                    aria-label={formatLongDate(date)}
                                    aria-pressed={selected}
                                    className={[
                                        'mx-auto grid h-9 w-9 place-items-center rounded-full text-sm tabular-nums transition-colors',
                                        selected
                                            ? 'bg-brand-primary font-bold text-nav-dark'
                                            : disabled
                                                ? 'cursor-not-allowed text-content-muted/40'
                                                : `text-content-primary hover:bg-surface-hover ${isToday ? 'ring-1 ring-brand-primary/60' : ''}`,
                                    ].join(' ')}
                                >
                                    {Number(date.slice(8, 10))}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-2 flex items-center justify-end border-t border-line-subtle pt-2">
                        <button
                            type="button"
                            onClick={() => pick(today)}
                            disabled={value === today}
                            className="rounded-control px-2.5 py-1 text-xs font-semibold text-brand-primary transition-colors enabled:hover:bg-surface-hover disabled:cursor-default disabled:opacity-40"
                        >
                            Ir para hoje
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateNavigator;
