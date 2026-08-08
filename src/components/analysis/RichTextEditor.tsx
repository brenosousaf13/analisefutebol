import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bold, Heading1, Heading2, List, ListOrdered, ImagePlus, Loader2,
} from 'lucide-react';
import { sanitizeNoteHtml } from '../../utils/sanitizeHtml';
import { uploadNoteImage, UploadError } from '../../services/storageService';
import TeamLogoImage from '../TeamLogoImage';

interface Props {
    value: string;
    onChange: (html: string) => void;
    /** Nome do time, exibido logo acima do campo. */
    teamName: string;
    teamColor?: string;
    /** Escudo do time, no lugar da tarja colorida antes do nome. */
    teamLogo?: string;
    placeholder?: string;
    readOnly?: boolean;
    onError?: (message: string) => void;
}

type Command = 'bold' | 'h1' | 'h2' | 'ul' | 'ol';

/**
 * Atalhos de markdown reconhecidos no inicio da linha, disparados no espaco.
 * `imagem` nao e um `Command`: abre o seletor de arquivo.
 */
const SHORTCUTS: Record<string, Command | 'image'> = {
    '#': 'h1',
    '##': 'h2',
    '-': 'ul',
    '*': 'ul',
    '1.': 'ol',
    '/imagem': 'image',
};

/**
 * Liga/desliga o placeholder.
 *
 * Antes era `.note-editor:empty`, mas o editor guarda um `<p>` vazio para os
 * atalhos de titulo funcionarem — com um filho dentro, `:empty` nunca mais
 * casaria e o placeholder sumiria de vez.
 */
function syncPlaceholder(el: HTMLElement) {
    const empty = !el.textContent?.trim() && !el.querySelector('img');
    el.dataset.empty = empty ? 'true' : 'false';
}

/** Nós que, vindo antes do texto, significam que ele comeca uma linha nova. */
const LINE_STARTERS = new Set(['BR', 'DIV', 'P', 'H1', 'H2', 'UL', 'OL', 'BLOCKQUOTE']);

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
    value, onChange, teamName, teamColor, teamLogo,
    placeholder = 'Escreva a análise do time…',
    readOnly = false, onError,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [active, setActive] = useState<Record<Command, boolean>>({
        bold: false, h1: false, h2: false, ul: false, ol: false,
    });

    /**
     * Editor vazio ganha um paragrafo vazio.
     *
     * Sem nenhum elemento de bloco o texto fica solto dentro do proprio
     * contentEditable, e o `formatBlock` nao tem o que converter: os atalhos
     * `#` e `##` apagavam o marcador e nao viravam titulo nenhum. As listas nao
     * sofriam disso porque o `insertUnorderedList` cria a propria estrutura.
     */
    const ensureBlock = useCallback(() => {
        const el = ref.current;
        if (!el || readOnly) return;
        if (el.innerHTML !== '' && el.innerHTML !== '<br>') return;

        el.innerHTML = '<p><br></p>';
        syncPlaceholder(el);

        const paragraph = el.firstElementChild;
        if (!paragraph || document.activeElement !== el) return;
        const range = document.createRange();
        range.setStart(paragraph, 0);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, [readOnly]);

    // Só escreve no DOM quando o valor vindo de fora diverge do que esta na
    // tela. Reescrever a cada tecla jogaria o cursor para o inicio.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const incoming = sanitizeNoteHtml(value);
        if (el.innerHTML !== incoming) el.innerHTML = incoming;
        syncPlaceholder(el);
        ensureBlock();
    }, [value, ensureBlock]);

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
        if (!ref.current) return;
        syncPlaceholder(ref.current);
        onChange(sanitizeNoteHtml(ref.current.innerHTML));
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

    /**
     * Atalhos de markdown, disparados quando o espaco e digitado logo depois do
     * marcador. Apaga o marcador e aplica o formato.
     *
     * So vale no inicio da linha, e "inicio da linha" e decidido pelo irmao
     * anterior do nó de texto: nada antes, ou um `<br>` / outro bloco. Sem essa
     * checagem, um "- " no meio de uma frase viraria lista.
     */
    const applyShortcut = (): boolean => {
        const el = ref.current;
        const selection = window.getSelection();
        if (!el || !selection?.isCollapsed || selection.rangeCount === 0) return false;

        const caret = selection.getRangeAt(0);
        const node = caret.startContainer;
        if (node.nodeType !== Node.TEXT_NODE || !el.contains(node)) return false;

        const command = SHORTCUTS[(node.textContent ?? '').slice(0, caret.startOffset)];
        if (!command) return false;

        const prev = node.previousSibling;
        if (prev && !LINE_STARTERS.has(prev.nodeName)) return false;

        const marker = document.createRange();
        marker.setStart(node, 0);
        marker.setEnd(node, caret.startOffset);
        marker.deleteContents();

        if (command === 'image') {
            emit();
            fileRef.current?.click();
        } else {
            run(command);
        }
        return true;
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
            {/* Escudo e nome do time no lugar da tarja colorida. */}
            <div className="flex items-center gap-2 border-b border-gray-700 px-3 py-2">
                <span
                    className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded"
                    style={{ backgroundColor: teamColor ? `${teamColor}22` : 'transparent' }}
                >
                    <TeamLogoImage logoUrl={teamLogo} teamName={teamName} className="h-5 w-5" />
                </span>
                <span className="truncate text-sm font-bold text-white">{teamName}</span>
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
                onFocus={ensureBlock}
                onKeyDown={e => {
                    if (readOnly) return;
                    // Ctrl/Cmd+B: o contentEditable ja faz, mas o estado da barra
                    // so acompanha se passarmos pelo mesmo caminho dos botoes.
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                        e.preventDefault();
                        run('bold');
                        return;
                    }
                    if (e.key === ' ' && applyShortcut()) e.preventDefault();
                }}
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

            {/* Barra de formatacao dentro da caixa de texto, no rodape. */}
            {!readOnly && (
                <div className="flex items-center gap-0.5 border-t border-gray-700 px-2 py-1">
                    <ToolbarButton label="Negrito (Ctrl+B)" active={active.bold} onClick={() => run('bold')}>
                        <Bold size={15} />
                    </ToolbarButton>
                    <ToolbarButton label="Título 1 (# + espaço)" active={active.h1} onClick={() => run('h1')}>
                        <Heading1 size={15} />
                    </ToolbarButton>
                    <ToolbarButton label="Título 2 (## + espaço)" active={active.h2} onClick={() => run('h2')}>
                        <Heading2 size={15} />
                    </ToolbarButton>
                    <ToolbarButton label="Lista (- + espaço)" active={active.ul} onClick={() => run('ul')}>
                        <List size={15} />
                    </ToolbarButton>
                    <ToolbarButton label="Lista numerada (1. + espaço)" active={active.ol} onClick={() => run('ol')}>
                        <ListOrdered size={15} />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Inserir imagem (/imagem + espaço)"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                    >
                        {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                    </ToolbarButton>
                </div>
            )}

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
