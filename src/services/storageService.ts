import { supabase } from '../lib/supabase';

const BUCKET = 'zona14';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — o bucket aceita 50, mas imagem de
// anotacao nao precisa disso e o HTML fica pesado de carregar.

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

export class UploadError extends Error {}

/**
 * Sobe uma imagem de anotacao e devolve a URL publica.
 *
 * O caminho segue `analyses/<user_id>/<arquivo>` porque as policies de Storage
 * conferem a segunda pasta contra o auth.uid() — ver
 * supabase/migrations/20260801_storage_policies.sql.
 */
export async function uploadNoteImage(file: File): Promise<string> {
    if (!ALLOWED.includes(file.type)) {
        throw new UploadError('Formato não suportado. Use PNG, JPG, WEBP, GIF ou AVIF.');
    }
    if (file.size > MAX_BYTES) {
        throw new UploadError('Imagem muito grande. O limite é 5 MB.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new UploadError('Sessão expirada. Entre novamente para enviar imagens.');

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `analyses/${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '31536000', upsert: false });

    if (error) {
        // Sem as policies do bucket, o Storage devolve violacao de RLS.
        if (/row-level security|policy/i.test(error.message)) {
            throw new UploadError(
                'O bucket ainda não tem permissão de escrita. Rode a migration 20260801_storage_policies.sql.',
            );
        }
        throw new UploadError(error.message);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}
