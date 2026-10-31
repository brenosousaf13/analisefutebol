# Salvamento integral das análises

## Objetivo e escopo

Evitar a persistência de um estado parcial quando uma das operações de salvamento falha. Substitui a sequência de requisições independentes por `save_analysis_v1`, uma função PostgreSQL chamada uma vez pelo aplicativo.

Não cria tabelas nem colunas. Mantém o modelo de análises, as coordenadas percentuais e o funcionamento existente do campo. A chave da API não faz parte desta entrega, conforme decisão de Lucas.

## Ordem de aplicação

1. Executar `migrations/20261031_02_atomic_analysis_save.sql` no SQL Editor. A migration apenas instala a função; não salva nem modifica análises existentes.
2. Confirmar a instalação. O endpoint deve existir e recusar chamadas anônimas. O sucesso do SQL Editor confirma que a função foi criada; uma chamada anônima recusada não valida gravações autenticadas.
3. Publicar o aplicativo deste commit na `main` e aguardar a Vercel.
4. Reabrir o aplicativo para carregar a nova versão. Criar uma análise de teste, salvar, recarregar, editar uma cena e salvar novamente. Conferir notas, desenhos e compartilhamento.

A publicação no GitHub não executa a migration. O novo aplicativo exige a função instalada e nunca retorna ao salvamento antigo como fallback. A versão publicada anteriormente pode continuar funcionando enquanto a função é instalada.

## Garantias e compatibilidade

- Função `SECURITY INVOKER`, somente para `authenticated`; usa `auth.uid()`, propriedade explícita e as policies de RLS já existentes. Não recebe do cliente autorização para trocar proprietário.
- Uma exceção em qualquer fase aborta a chamada inteira. A criação que falha não deixa análises/cenas órfãs; a edição que falha mantém os registros da versão anterior.
- A linha da análise é bloqueada durante a gravação para que duas chamadas novas não misturem etapas. Não há histórico de versões nem resolução de conflitos: salvamentos completos posteriores podem substituir edições anteriores.
- Campos opcionais omitidos mantêm os valores anteriores; campos explícitos vazios continuam permitindo apagar uma nota. O cliente não altera criação, proprietário ou token público.
- Anotações nos formatos anteriores e metadados `_meta` de vídeo continuam preservados.
- Cenas usam UUIDs explícitos; não são associadas aos elementos pela posição de uma resposta. Cenas existentes mantêm suas identidades; cenas novas locais têm mapeamento determinístico; duplicar uma análise cria identidades distintas.
- Jogadores continuam sem duplicação por ID dentro de cada time/fase/cena. Textos de campo e tags legadas não gerenciados pelo editor são preservados; excluir uma cena ainda exclui seus elementos por cascata, intencionalmente.
- Leituras incompletas de cenas, jogadores ou desenhos agora falham. O editor principal volta à Biblioteca e informa o erro, em vez de permitir a edição de um carregamento parcial.
- Os rascunhos existentes só são removidos pelo editor após receber a confirmação de salvamento, como no fluxo anterior.

Uma queda de conexão depois do commit pode impedir a chegada da confirmação ao navegador, embora a gravação completa tenha ocorrido. Nesse caso, reabrir a análise para verificar antes de repetir. Não se promete desfazer uma transação que já tenha sido confirmada pelo banco. Se a resposta for erro, o aplicativo mantém suas alterações locais/rascunho; não há repetição automática de escrita.

## Verificações

`npm run test:saving` executa a função real em PostgreSQL 17 em memória, com fixture da estrutura observada e registros fictícios. Inclui falhas impostas por triggers em atualização, criação/remoção de cenas, exclusão de elementos e inserções até a última tabela; compara todos os registros anteriores após a recusa. Valida isolamento entre proprietários, ausência de órfãos, elementos de outras cenas, cópias, notas, vídeo e o serviço real usando somente um RPC.

As suítes existentes de administração, compartilhamento e jogadores também devem passar, além do TypeScript, build e comparação do lint. Os testes não se conectam à produção nem substituem a conferência de uma sessão autenticada real após a publicação.
