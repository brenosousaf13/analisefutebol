import { useState, useEffect } from 'react';
import { apiFootballService } from '../services/apiFootballService';
import type { ApiCountry, ApiTeam } from '../types/api-football';
import { Loader2, Search, ChevronDown, Check } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface TeamSelectionProps {
    label: string;
    onSelect: (team: ApiTeam) => void;
}

export default function TeamSelection({ label, onSelect }: TeamSelectionProps) {
    // Data State
    const [countries, setCountries] = useState<ApiCountry[]>([]);
    const [teams, setTeams] = useState<ApiTeam[]>([]);

    // Selection State
    const [selectedCountry, setSelectedCountry] = useState<string | null>('Brazil'); // Default to Brazil for convenience
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

    // UI State
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);

    // Debounce search term to avoid too many requests
    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        loadCountries();
    }, []);

    useEffect(() => {
        // Trigger search when country is selected and search term is valid (>= 3 chars)
        if (selectedCountry && debouncedSearch.length >= 3) {
            searchTeams(selectedCountry, debouncedSearch);
        } else if (debouncedSearch.length < 3) {
            setTeams([]);
        }
    }, [selectedCountry, debouncedSearch]);

    async function loadCountries() {
        setLoadingCountries(true);
        try {
            const data = await apiFootballService.getCountries();
            setCountries(data);
        } catch (error) {
            console.error('Error loading countries:', error);
        } finally {
            setLoadingCountries(false);
        }
    }

    async function searchTeams(country: string, search: string) {
        console.log(`[UI] Triggering search for: ${search} in ${country}`);
        setLoadingTeams(true);
        try {
            const data = await apiFootballService.searchTeams(country, search);
            console.log(`[UI] Teams found (raw): ${data.length}`);

            // Client-side filtering by country
            const filteredData = data.filter(t => t.team.country === country);
            console.log(`[UI] Teams found (filtered by ${country}): ${filteredData.length}`);

            setTeams(filteredData);
        } catch (error) {
            console.error('[UI] Error searching teams:', error);
        } finally {
            setLoadingTeams(false);
        }
    }

    function handleTeamSelect(team: ApiTeam) {
        setSelectedTeam(team.team.id);
        onSelect(team);
        setSearchTerm(team.team.name);
        setTeams([]); // Clear results after selection
    }

    return (
        <div className="bg-[#242938] rounded-xl p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">{label}</h3>

            <div className="space-y-4">
                {/* Country Selection */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-500">País</label>
                    <div className="relative">
                        <select
                            className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg px-3 py-2 text-white appearance-none focus:border-green-500 focus:outline-none"
                            value={selectedCountry || ''}
                            onChange={(e) => {
                                setSelectedCountry(e.target.value);
                                setTeams([]);
                                setSelectedTeam(null);
                                setSearchTerm('');
                            }}
                            disabled={loadingCountries}
                        >
                            <option value="">Selecione o país...</option>
                            {countries.map((c) => (
                                <option key={c.name} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {loadingCountries ? (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-green-500" />
                        ) : (
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Team Search */}
                <div className="space-y-1 relative">
                    <label className="text-xs text-gray-500">Clube</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder={selectedCountry ? "Digite o nome do time..." : "Selecione um país primeiro"}
                            className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-green-500 focus:outline-none disabled:opacity-50"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (selectedTeam) setSelectedTeam(null); // Deselect if user types again
                            }}
                            disabled={!selectedCountry}
                        />
                        {loadingTeams && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-green-500" />
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {teams.length > 0 && !selectedTeam && (
                        <div className="absolute z-10 w-full mt-1 bg-[#1a1f2e] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                            {teams.map((t) => (
                                <button
                                    key={t.team.id}
                                    onClick={() => handleTeamSelect(t)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-[#242938] transition border-b border-gray-800 last:border-0 text-left"
                                >
                                    <img src={t.team.logo} alt={t.team.name} className="w-8 h-8 object-contain" />
                                    <div>
                                        <p className="font-semibold text-white text-sm">{t.team.name}</p>
                                        <p className="text-xs text-gray-500">{t.venue.city}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Team Preview */}
                {selectedTeam && (
                    <div className="mt-2 flex items-center justify-center p-4 bg-[#1a1f2e] rounded-lg border border-green-500/30 animate-fadeIn">
                        {(() => (
                            <>
                                <Check className="w-5 h-5 text-green-500 mr-2" />
                                <span className="text-green-500 text-sm font-medium">Time selecionado</span>
                            </>
                        ))()}
                    </div>
                )}
            </div>
        </div>
    );
}
