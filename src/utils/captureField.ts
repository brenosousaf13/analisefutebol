/**
 * Baixa o campinho visivel como PNG.
 *
 * O alvo e o elemento marcado com `data-field-capture` dentro do TacticalField,
 * para a imagem sair so com o campo — sem toolbar, colunas de time ou cabecalho.
 *
 * O html2canvas entra por import dinamico: sao ~200 kB que so fazem sentido
 * baixar quando o usuario realmente clica em exportar.
 */
export async function downloadFieldImage(
    target: HTMLElement | null,
    fileName: string,
): Promise<void> {
    const node = target ?? document.querySelector<HTMLElement>('[data-field-capture]');
    if (!node) throw new Error('Campo não encontrado para captura');

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(node, {
        backgroundColor: '#0B1111',
        scale: 2,
        useCORS: true,
    });

    const link = document.createElement('a');
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

/** Nome de arquivo seguro a partir do confronto. */
export function fieldFileName(homeTeam: string, awayTeam: string, suffix?: string): string {
    const slug = [homeTeam, 'x', awayTeam, suffix]
        .filter(Boolean)
        .join('-')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    return `${slug || 'campinho'}.png`;
}
