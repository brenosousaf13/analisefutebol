import { useState, useEffect, useRef } from 'react';

interface Option {
    label: string;
    value: string;
    icon?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder: string;
    className?: string;
}

function SearchableSelect({ options, value, onChange, placeholder, className = '' }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm cursor-pointer flex items-center justify-between min-h-[42px]"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedOption ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                        {selectedOption.icon && <img src={selectedOption.icon} alt="" className="w-5 h-5 object-contain flex-shrink-0" />}
                        <span className="truncate text-gray-800 text-sm">{selectedOption.label}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">{placeholder}</span>
                )}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-auto">
                    <div className="p-2 sticky top-0 bg-white border-b border-gray-50">
                        <input
                            type="text"
                            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.value}
                                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50 ${value === opt.value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                            >
                                {opt.icon && <img src={opt.icon} alt="" className="w-5 h-5 object-contain" />}
                                <span>{opt.label}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-sm text-gray-400 text-center">Nenhuma opção encontrada</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchableSelect;
