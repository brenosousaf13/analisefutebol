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
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 text-emerald-950 dark:text-emerald-400">
                            <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
                            Painel Administrativo
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Acompanhe os usuários registrados e suas atividades na plataforma.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchStats}
                            disabled={loading}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 p-2.5 rounded-lg active:scale-95 transition-all shadow-sm"
                            title="Atualizar dados"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:max-w-md">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nome, e-mail, telefone ou CPF..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Users size={16} />
                        <span className="font-semibold">{filteredStats.length}</span> usuários encontrados
                    </div>
                </div>

                {/* Content */}
                {error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Acesso Negado ou Erro</h3>
                        <p className="text-red-600 dark:text-red-400 max-w-md mx-auto">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                            Voltar para o Início
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Usuário</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Contatos</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">Documento</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Análises</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-right">Cadastrado em</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-right hidden xl:table-cell">Último Acesso</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                                <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                                <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                                <td className="px-6 py-4 text-center"><div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                                <td className="px-6 py-4 text-right"><div className="h-4 w-24 ml-auto bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                                <td className="px-6 py-4 text-right hidden xl:table-cell"><div className="h-4 w-24 ml-auto bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredStats.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                Nenhum usuário encontrado com os filtros atuais.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStats.map((user) => (
                                            <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{user.full_name || 'Sem nome'}</span>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <Mail size={12} />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                        <Smartphone size={14} className="text-emerald-500" />
                                                        {user.phone || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono text-xs">
                                                        <FileText size={14} className="text-slate-400" />
                                                        {user.cpf || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.analysis_count > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                                        {user.analysis_count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                                                    {formatDate(user.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs hidden xl:table-cell">
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
