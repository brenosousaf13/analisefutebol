import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, RefreshCw, Smartphone, Mail, FileText, AlertCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserStat {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    cpf: string;
    created_at: string;
    last_sign_in_at: string | null;
    analysis_count: number;
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<UserStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

            if (error) throw error;

            setStats(data || []);
        } catch (err: any) {
            console.error('Error fetching admin stats:', err);
            setError(err.message || 'Erro ao carregar dados. Verifique se você tem permissão de administrador.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const filteredStats = stats.filter(user =>
        (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.phone || '').includes(searchTerm) ||
        (user.cpf || '').includes(searchTerm)
    );

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-app-bg text-gray-200 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                            <Shield className="h-8 w-8 text-brand-primary" />
                            Painel Administrativo
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Acompanhe os usuários registrados e suas atividades na plataforma.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchStats}
                            disabled={loading}
                            className="bg-card-bg border border-gray-700 text-gray-400 hover:text-brand-primary hover:border-brand-primary/50 p-2.5 rounded-lg active:scale-95 transition-all shadow-sm"
                            title="Atualizar dados"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="bg-card-bg p-4 rounded-xl shadow-lg border border-gray-800 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:max-w-md">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nome, e-mail, telefone ou CPF..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0B1111] border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-brand-primary text-white placeholder-gray-600 transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users size={16} />
                        <span className="font-semibold text-brand-primary">{filteredStats.length}</span> usuários encontrados
                    </div>
                </div>

                {/* Content */}
                {error ? (
                    <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-8 text-center">
                        <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-red-400 mb-2">Acesso Negado ou Erro</h3>
                        <p className="text-red-300 max-w-md mx-auto">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 px-4 py-2 bg-card-bg border border-red-900/30 text-red-400 rounded-lg hover:bg-red-900/10 transition-colors"
                        >
                            Voltar para o Início
                        </button>
                    </div>
                ) : (
                    <div className="bg-card-bg rounded-xl shadow-lg border border-gray-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0B1111] border-b border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-gray-400">Usuário</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 hidden md:table-cell">Contatos</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 hidden lg:table-cell">Documento</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 text-center">Análises</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 text-right">Cadastrado em</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 text-right hidden xl:table-cell">Último Acesso</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-800 rounded"></div></td>
                                                <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 w-40 bg-gray-800 rounded"></div></td>
                                                <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 w-24 bg-gray-800 rounded"></div></td>
                                                <td className="px-6 py-4 text-center"><div className="h-4 w-8 mx-auto bg-gray-800 rounded"></div></td>
                                                <td className="px-6 py-4 text-right"><div className="h-4 w-24 ml-auto bg-gray-800 rounded"></div></td>
                                                <td className="px-6 py-4 text-right hidden xl:table-cell"><div className="h-4 w-24 ml-auto bg-gray-800 rounded"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredStats.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                Nenhum usuário encontrado com os filtros atuais.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStats.map((user) => (
                                            <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-white group-hover:text-brand-primary transition-colors">{user.full_name || 'Sem nome'}</span>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                                            <Mail size={12} />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <Smartphone size={14} className="text-emerald-500" />
                                                        {user.phone || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <div className="flex items-center gap-2 text-gray-400 font-mono text-xs">
                                                        <FileText size={14} className="text-gray-600" />
                                                        {user.cpf || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.analysis_count > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                                                        {user.analysis_count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap text-gray-500 text-xs">
                                                    {formatDate(user.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap text-gray-500 text-xs hidden xl:table-cell">
                                                    {formatDate(user.last_sign_in_at)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
