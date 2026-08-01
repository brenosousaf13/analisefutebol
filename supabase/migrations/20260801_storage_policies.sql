-- Policies de escrita do bucket `zona14` (Storage).
--
-- O bucket ja foi criado como PUBLIC, o que libera a LEITURA das imagens pela
-- URL publica — necessario para que uma analise compartilhada por token
-- consiga exibir as imagens das anotacoes.
--
-- A escrita continua fechada: storage.objects tem RLS ligado por padrao e o
-- bucket foi criado com 0 policies, entao sem o que esta abaixo todo upload
-- falha com "new row violates row-level security policy".
--
-- Convencao de caminho: analyses/<user_id>/<arquivo>
-- A primeira pasta e o id do usuario, e e isso que as policies conferem —
-- assim ninguem sobrescreve nem apaga arquivo de outro.

drop policy if exists "Usuario envia imagem na sua pasta" on storage.objects;
create policy "Usuario envia imagem na sua pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'zona14'
    and (storage.foldername(name))[1] = 'analyses'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Usuario atualiza a propria imagem" on storage.objects;
create policy "Usuario atualiza a propria imagem"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'zona14'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Usuario apaga a propria imagem" on storage.objects;
create policy "Usuario apaga a propria imagem"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'zona14'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Leitura: o bucket ser publico ja resolve o acesso via URL publica.
-- Esta policy cobre o acesso pela API do Storage (listagem/download autenticado).
drop policy if exists "Leitura publica do bucket zona14" on storage.objects;
create policy "Leitura publica do bucket zona14"
  on storage.objects for select
  using ( bucket_id = 'zona14' );
