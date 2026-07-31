import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';

/**
 * Placeholder. O Campinho ainda vai ser definido — a rota existe para que o item
 * de menu leve a algum lugar honesto em vez de cair no catch-all.
 */
const Campinho: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AppLayout>
            <div className="mx-auto max-w-lg rounded-card border border-line bg-surface-raised px-6 py-16 text-center shadow-card">
                <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-surface-overlay text-brand-primary">
                    <LayoutGrid size={26} />
                </span>

                <h1 className="mb-2 text-2xl font-bold tracking-tight text-content-primary">Campinho</h1>
                <p className="mb-6 text-sm leading-relaxed text-content-secondary">
                    Esta área ainda está por vir. Quando estiver pronta, ela aparece aqui.
                </p>

                <button
                    onClick={() => navigate('/')}
                    className="rounded-control bg-brand-primary px-4 py-2 text-sm font-semibold text-nav-dark transition-opacity hover:opacity-90"
                >
                    Voltar para a home
                </button>
            </div>
        </AppLayout>
    );
};

export default Campinho;
