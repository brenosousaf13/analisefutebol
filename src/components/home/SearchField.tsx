import React from 'react';
import { Search, X } from 'lucide-react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    /** Largura a partir de `sm`; no celular o campo ocupa a linha toda. */
    widthClass?: string;
}

/** Campo de busca instantânea: a lista reage a cada letra, sem esperar nem consultar a API. */
const SearchField: React.FC<Props> = ({ value, onChange, placeholder = 'Pesquisar equipe', autoFocus, widthClass = 'sm:w-72' }) => (
    <div className={`relative w-full min-w-0 ${widthClass}`}>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-control border border-line bg-surface-raised pl-9 pr-9 text-sm text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-line-strong focus:ring-2 focus:ring-brand-primary/25"
        />
        {value && (
            <button
                type="button"
                onClick={() => onChange('')}
                aria-label="Limpar pesquisa"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-content-muted transition-colors hover:bg-surface-hover hover:text-content-primary"
            >
                <X size={14} />
            </button>
        )}
    </div>
);

export default SearchField;
