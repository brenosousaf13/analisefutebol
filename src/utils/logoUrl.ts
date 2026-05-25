export function getProxiedLogoUrl(logoUrl: string | undefined | null): string | undefined {
    if (!logoUrl) return undefined;
    if (!logoUrl.includes('media.api-sports.io')) return logoUrl;

    if (import.meta.env.DEV) {
        const path = logoUrl.replace('https://media.api-sports.io', '');
        return `/api-football-media${path}`;
    }

    return `/api/proxy-logo?url=${encodeURIComponent(logoUrl)}`;
}
