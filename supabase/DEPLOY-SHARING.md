# Atualização segura dos links compartilhados

Correção preparada a partir do inventário real exportado em 03/10/2026.

## Ordem de publicação

1. No SQL Editor do Supabase, executar `migrations/20261003_01_shared_analysis_rpc.sql`.
2. Conferir pela API que `get_shared_analysis_v1` está disponível. Um UUID não utilizado deve retornar `null`. Com um token existente, conferir que a resposta contém apenas a análise correspondente e seus elementos.
3. Publicar o aplicativo que usa esse RPC na branch `main` e aguardar a confirmação da Vercel.
4. Validar um link existente e um link inválido. Conferir notas formatadas, conteúdo antigo, cenas e posições do campo.
5. Executar `migrations/20261003_02_close_shared_table_reads.sql`.
6. Repetir as verificações públicas: listar tabelas diretamente sem login deve falhar; o link válido deve continuar funcionando. Validar leitura e edição com duas contas do aplicativo.

A preparação da etapa 1 mantém as policies atuais. Por isso, isoladamente ela não corrige a listagem pública. O fechamento depende do aplicativo já publicado com o novo leitor; sua existência no banco é verificada pela etapa 2, mas a confirmação de publicação ainda deve ser feita por quem executa o procedimento.

As migrations executam dentro de uma transação, não alteram tokens existentes e não excluem registros. Um erro na própria migration deve provocar rollback. O RPC é somente leitura, exige o UUID exato do compartilhamento, usa search_path vazio e devolve uma lista explícita de campos. Novas colunas privadas não passam a ser compartilhadas automaticamente.

## Verificação local

`npm run test:sharing` usa PostgreSQL 17 em memória (PGlite), dados fictícios e um fixture das colunas, constraints e policies observadas no inventário. A suíte não lê `.env` nem se conecta ao Supabase.

Os testes reproduzem a listagem indevida, validam a ordem das migrations, a leitura por token, o isolamento entre proprietários, edição autorizada, recusa de TRUNCATE, revogação e compatibilidade de dados antigos, incluindo `_meta`, HTML e coordenadas percentuais.

Rodar também `npm run build` e comparar o lint dos arquivos alterados com o baseline. Os três arquivos delicados mantêm 8 erros e 9 avisos. O novo conversor tem zero erros e avisos; os 8 erros prévios do analysisService permanecem.

## Recuperação

Antes de aplicar, registrar as policies e grants existentes (já exportados no inventário local) e confirmar o resultado de cada etapa. Isso é um registro da estrutura/permissões, não um backup do conteúdo dos usuários.

Se a preparação falhar, corrigir o erro e reaplicar; o aplicativo publicado ainda usa o caminho anterior. Se o novo aplicativo falhar antes do fechamento, pode-se voltar à versão anterior do aplicativo, pois as policies antigas continuam presentes. Após o fechamento, manter a leitura por token e corrigir o leitor; não reabrir a listagem pública como recuperação automática.

## Escopo pendente

- Aplicação e validação das duas migrations no Supabase real.
- Testes com duas contas reais e inspeção da página no navegador.
- O bucket de imagens continua público, conforme o modelo existente. Esta mudança limita consultas às análises; não torna privados os arquivos já publicados por URL.
- A função administrativa foi identificada como SECURITY DEFINER com EXECUTE público. Sua checagem interna ainda não foi lida; não afirmar exposição de dados de cadastro sem essa conferência. Lucas escolheu concluir os links primeiro.
- O salvamento transacional será a próxima correção após concluir esta implantação.
