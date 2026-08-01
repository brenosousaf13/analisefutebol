/**
 * Sanitizador de HTML para as anotacoes com formatacao.
 *
 * Por que existe: a anotacao e guardada como HTML e renderizada com
 * dangerouslySetInnerHTML, inclusive na pagina publica /s/:token. Sem limpar,
 * um `<script>` ou um `onerror=` colado no editor rodaria no navegador de quem
 * abrisse o link compartilhado.
 *
 * Estrategia de lista branca: o que nao esta previsto aqui e removido.
 * Roda no proprio DOM do navegador, sem dependencia nova.
 */

const ALLOWED_TAGS = new Set([
    'P', 'BR', 'DIV', 'SPAN',
    'B', 'STRONG', 'I', 'EM', 'U',
    'H1', 'H2', 'H3',
    'UL', 'OL', 'LI',
    'BLOCKQUOTE',
    'IMG',
    'A',
]);

/** Atributos liberados por tag. Qualquer outro (incluindo on*) e descartado. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
    IMG: new Set(['src', 'alt']),
    A: new Set(['href', 'target', 'rel']),
};

/** Aceita apenas origens de imagem seguras. `javascript:` e `data:` ficam de fora. */
function isSafeUrl(value: string, allowRelative: boolean): boolean {
    const v = value.trim();
    if (allowRelative && v.startsWith('/')) return true;
    return /^https?:\/\//i.test(v);
}

export function sanitizeNoteHtml(dirty: string | null | undefined): string {
    if (!dirty) return '';

    const doc = new DOMParser().parseFromString(`<div>${dirty}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return '';

    /**
     * Limpa os FILHOS antes do proprio no — a ordem importa.
     *
     * Ao desembrulhar uma tag proibida, os filhos dela sobem para o pai. Se o
     * pai ja tivesse sido percorrido, esses filhos promovidos escapariam sem
     * limpeza: `<marquee><img src=x onerror=alert(1)></marquee>` manteria o
     * onerror. Indo de baixo para cima, o que sobe ja esta limpo.
     */
    const clean = (node: Element) => {
        // Copia: a lista viva muda enquanto removemos e desembrulhamos nos.
        for (const child of Array.from(node.children)) clean(child);

        if (node === root) return;

        if (!ALLOWED_TAGS.has(node.tagName)) {
            // script/style vao embora com conteudo e tudo; o resto vira so o
            // que tinha dentro, para nao perder o texto do usuario.
            if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') node.remove();
            else node.replaceWith(...Array.from(node.childNodes));
            return;
        }

        const allowed = ALLOWED_ATTRS[node.tagName] ?? new Set<string>();
        for (const attr of Array.from(node.attributes)) {
            const name = attr.name.toLowerCase();

            // Tudo que nao esta na lista branca cai aqui, inclusive on*.
            if (!allowed.has(name)) {
                node.removeAttribute(attr.name);
                continue;
            }
            if (name === 'src' && !isSafeUrl(attr.value, true)) {
                node.remove();
                return;
            }
            if (name === 'href' && !isSafeUrl(attr.value, true)) {
                node.removeAttribute('href');
            }
        }

        // Link em outra aba sem rel da acesso a window.opener para o destino.
        if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
            node.setAttribute('rel', 'noopener noreferrer');
        }
    };

    clean(root);
    return root.innerHTML;
}

/** true quando a anotacao nao tem nada alem de espaco/tags vazias. */
export function isEmptyHtml(html: string | null | undefined): boolean {
    if (!html) return true;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const hasMedia = doc.body.querySelector('img') !== null;
    return !hasMedia && (doc.body.textContent ?? '').trim() === '';
}
