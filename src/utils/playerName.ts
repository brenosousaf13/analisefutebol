/**
 * Nome do jogador como ele aparece no marcador dentro do campo.
 *
 * Regras (definidas no wireframe da tela de edicao):
 * - sempre em caixa alta
 * - com dois ou mais nomes, o primeiro e abreviado: "Lucas Fernandes" -> "L. FERNANDES"
 * - o sobrenome NUNCA e cortado; quem chama e responsavel por nao truncar
 *
 * Nomes de uma palavra so ficam inteiros ("RONALDO"). Particulas ("de", "da",
 * "dos", "e"...) sao descartadas para nao virarem a inicial errada.
 */
const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'della', 'van', 'von', 'di']);

export function fieldDisplayName(name: string | undefined | null): string {
    const raw = (name ?? '').trim();
    if (!raw) return '';

    const parts = raw.split(/\s+/).filter(p => !PARTICLES.has(p.toLowerCase()));
    if (parts.length === 0) return raw.toUpperCase();
    if (parts.length === 1) return parts[0].toUpperCase();

    const first = parts[0];
    const rest = parts.slice(1).join(' ');
    return `${first[0].toUpperCase()}. ${rest.toUpperCase()}`;
}
