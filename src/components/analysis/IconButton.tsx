import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
    icon: React.ReactNode;
    /** Texto do balaozinho em hover. Tambem vira o rotulo acessivel. */
    label: string;
    onClick: () => void;
    isActive?: boolean;
    isLoading?: boolean;
    badge?: boolean;
    /** 'up' para botoes na barra inferior, 'down' para os do topo. */
    tooltipSide?: 'up' | 'down';
}

/**
 * Botao so-icone com balaozinho em hover.
 *
 * O tooltip e CSS puro (group-hover) em vez de `title`, porque o nativo demora
 * ~1s para aparecer e nao segue o tema.
 */
const IconButton: React.FC<Props> = ({
    icon, label, onClick, isActive = false, isLoading = false, badge = false, tooltipSide = 'down',
}) => (
    <div className="group relative shrink-0">
        <button
            type="button"
            onClick={onClick}
            disabled={isLoading}
            aria-label={label}
            aria-pressed={isActive}
            className={`
                relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                transition-all duration-200
                ${isActive
                    ? 'bg-accent-green text-white shadow-lg'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }
                ${isLoading ? 'cursor-wait opacity-50' : ''}
            `}
        >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
            {badge && !isLoading && (
                <span className="absolute right-0 top-0 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-nav-dark bg-orange-500" />
            )}
        </button>

        <span
            role="tooltip"
            className={`
                pointer-events-none absolute left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap
                rounded-md border border-white/10 bg-nav-dark px-2 py-1
                text-[11px] font-medium text-white opacity-0 shadow-xl
                transition-opacity duration-150 group-hover:opacity-100 lg:block
                ${tooltipSide === 'down' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]'}
            `}
        >
            {label}
        </span>
    </div>
);

export default IconButton;
