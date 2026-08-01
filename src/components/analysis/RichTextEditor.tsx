import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bold, Heading1, Heading2, List, ListOrdered, ImagePlus, Loader2,
} from 'lucide-react';
import { sanitizeNoteHtml } from '../../utils/sanitizeHtml';
import { uploadNoteImage, UploadError } from '../../services/storageService';

interface Props {
    value: string;
    onChange: (html: string) => void;
    /** Nome do time, exibido logo acima do campo. */
    teamName: string;
    teamColor?: string;
    placeholder?: string;
    readOnly?: boolean;
    onError?: (message: string) => void;
}

type Command = 'bold' | 'h1' | 'h2' | 'ul' | 'ol';

const ToolbarButton: React.FC<{
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, active, disabled, onClick, children }) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        // onMouseDown em vez de onClick: o clique tiraria o foco do
        // contentEditable e a selecao se perderia antes do comando rodar.
        onMouseDown={e => { e.preventDefault(); onClick(); }}
        className={`
            grid h-8 w-8 place-items-center rounded transition-colors
            ${active ? 'bg-accent-green text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}
            disabled:cursor-not-allowed disabled:opacity-40
        `}
    >
        {children}
    </button>
);

/**
 * Editor de texto com formatacao para as anotacoes do time.
 *
 * Usa contentEditable + document.execCommand. O execCommand esta marcado como
 * deprecated, mas continua funcionando em todos os navegadores atuais e evita
 * trazer uma dependencia de editor (tiptap/lexical) so por bold, headers,
 * listas e imagem. Se um dia quebrar, o caminho e trocar por tiptap — o
 * formato guardado (HTML) ja e compativel.
 */
const RichTextEditor: React.FC<Props> = ({
    value, onChange, teamName, teamColor, placeholder = 'Escreva a análise do time…',
    readOnly = false, onError,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [active, setActive] = useState<Record<Command, boolean>>({
        bold: false, h1: false, h2: false, ul: false, ol: false,
    });

    // Só escreve no DOM quando o valor vindo de fora diverge do que esta na
    // tela. Reescrever a cada tecla jogaria o cursor para o inicio.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const incoming = sanitizeNoteHtml(value);
        if (el.innerHTML !== incoming) el.innerHTML = incoming;
    }, [value]);

    const refreshActive = useCallback(() => {
        if (readOnly) return;
        const block = document.queryCommandValue('formatBlock')?.toLowerCase();
        setActive({
            bold: document.queryCommandState('bold'),
            h1: block === 'h1',
            h2: block === 'h2',
            ul: document.queryCommandState('insertUnorderedList'),
            ol: document.queryCommandState('insertOrderedList'),
        });
    }, [readOnly]);

    const emit = useCallback(() => {
        if (ref.current) onChange(sanitizeNoteHtml(ref.current.innerHTML));
    }, [onChange]);

    const run = (command: Command) => {
        const el = ref.current;
        if (!el || readOnly) return;
        el.focus();

        switch (command) {
            case 'bold':
                document.execCommand('bold');
                break;
            case 'h1':
            case 'h2': {
                const block = document.queryCommandValue('formatBlock')?.toLowerCase();
                const target = command.toUpperCase();
                // Clicar de novo no mesmo header volta para paragrafo.
                document.execCommand('formatBlock', false, block === command ? 'P' : target);
                break;
            }
            case 'ul':
                document.execCommand('insertUnorderedList');
                break;
            case 'ol':
                document.execCommand('insertOrderedList');
                break;
        }

        emit();
        refreshActive();
    };

    const insertImage = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadNoteImage(file);
            ref.current?.focus();
            document.execCommand('insertImage', false, url);
            emit();
        } catch (err) {
            onError?.(err instanceof UploadError ? err.message : 'Falha ao enviar a imagem.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col rounded-lg border border-gray-700 bg-[#0f1515]">
            {/* Nome do time da anotacao, logo acima do campo de texto */}
            <div className="flex items-center justify-between gap-2 border-b border-gray-700 px-3 py-2">
                <span
                    className="border-l-4 pl-2 text-sm font-bold text-white"
                    style={{ borderColor: teamColor || 'transparent' }}
                >
                    {teamName}
                </span>

                {!readOnly && (
                    <div className="flex items-center gap-0.5">
                        <ToolbarButton label="Negrito" active={active.bold} onClick={() => run('bold')}>
                            <Bold size={15} />
                        </ToolbarButton>
                        <ToolbarButton label="Título 1" active={active.h1} onClick={() => run('h1')}>
                            <Heading1 size={15} />
                        </ToolbarButton>
                        <ToolbarButton label="Título 2" active={active.h2} onClick={() => run('h2')}>
                            <Heading2 size={15} />
                        </ToolbarButton>
                        <ToolbarButton label="Lista" active={active.ul} onClick={() => run('ul')}>
                            <List size={15} />
                        </ToolbarButton>
                        <ToolbarButton label="Lista numerada" active={active.ol} onClick={() => run('ol')}>
                            <ListOrdered size={15} />
                        </ToolbarButton>
                        <ToolbarButton
                            label="Inserir imagem"
                            disabled={uploading}
                            onClick={() => fileRef.current?.click()}
                        >
                            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                        </ToolbarButton>
                    </div>
                )}
            </div>

            <div
                ref={ref}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={`Anotações de ${teamName}`}
                data-placeholder={placeholder}
                onInput={emit}
                onBlur={emit}
                onKeyUp={refreshActive}
                onMouseUp={refreshActive}
                // Cola como texto puro: colar de outro site traria HTML sujo.
                onPaste={e => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                }}
                className="note-editor min-h-[140px] flex-1 overflow-y-auto px-3 py-2.5 text-sm leading-relaxed text-gray-200 outline-none"
            />

            <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void insertImage(file);
                    e.target.value = '';
                }}
            />
        </div>
    );
};

export default RichTextEditor;
