import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
    coachName: string;
    teamName: string;
    note: string;
    readOnly?: boolean;
    onSave: (note: string) => void;
    onClose: () => void;
}

export default function CoachNotesModal({ coachName, teamName, note, readOnly = false, onSave, onClose }: Props) {
    const titleId = useId();
    const [content, setContent] = useState(note);

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-[#0d1414] shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
                    <div>
                        <h2 id={titleId} className="font-semibold text-white">T: {coachName || 'Não informado'}</h2>
                        <p className="mt-1 text-xs text-gray-400">{teamName}</p>
                    </div>
                    <button type="button" aria-label="Fechar anotações do técnico" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X size={20} /></button>
                </div>
                <div className="min-h-0 overflow-y-auto p-4">
                    <label htmlFor={`${titleId}-note`} className="mb-2 block text-sm text-gray-300">Anotações sobre o técnico</label>
                    <textarea
                        autoFocus
                        id={`${titleId}-note`}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        readOnly={readOnly}
                        placeholder={readOnly ? 'Nenhuma anotação sobre este técnico.' : 'Escreva suas observações sobre o técnico…'}
                        rows={8}
                        className="w-full resize-y rounded-lg border border-gray-700 bg-black/20 p-3 text-sm text-gray-200 outline-none focus:border-accent-green"
                    />
                    {!readOnly && <p className="mt-2 text-xs text-gray-500">Use “Salvar análise” na barra de ferramentas para guardar suas alterações.</p>}
                </div>
                <div className="flex justify-end gap-2 border-t border-white/10 p-4">
                    <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-white/5">{readOnly ? 'Fechar' : 'Cancelar'}</button>
                    {!readOnly && <button type="button" onClick={() => onSave(content)} className="rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Aplicar anotação</button>}
                </div>
            </section>
        </div>, document.body,
    );
}
