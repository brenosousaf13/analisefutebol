# Restrição mínima do painel administrativo

## Evidência

O corpo de `get_admin_dashboard_stats()` foi exportado em 31/10/2026. Antes de retornar cadastros, a função confere o e-mail de `auth.jwt()` na tabela `public.admin_users`. A exportação não comprova exposição de cadastros: a autorização interna já existe.

O ajuste preserva essa função e os administradores cadastrados. Restringe sua chamada a sessões autenticadas, fixa seu `search_path` e retira dos clientes o acesso direto à lista de administradores. O aplicativo só consulta o painel pela função; não há fluxo no código para gerenciar `admin_users` diretamente. A manutenção dessa lista continua pelo banco/servidor com privilégios adequados.

## Aplicação

1. Executar `migrations/20261031_01_restrict_admin_access.sql` no SQL Editor do mesmo projeto Supabase.
2. Confirmar a mensagem de sucesso. As alterações estão numa única transação: se houver erro, corrigir a causa antes de repetir a execução. Não confirmar como concluída uma execução com erro.
3. Conferir pela API sem sessão: consultar `admin_users` ou chamar `get_admin_dashboard_stats()` deve receber erro de permissão. Não registrar conteúdo de cadastros nos relatórios.
4. Validar o painel com uma sessão de administrador já cadastrado e confirmar a recusa com uma conta comum. A autorização por e-mail depende também da configuração de autenticação do Supabase; não basta simular uma sessão no navegador.

A publicação no GitHub não executa esta migration. Ela precisa ser aplicada no Supabase. Não altera análises, notas, cadastros ou os registros de `admin_users`. Não exige alteração de tela nem criação de chaves.

## Verificações

`npm run test:admin` usa o corpo exportado da função num PostgreSQL 17 em memória, sem dados reais. Testa recusa de visitante e usuário comum, rejeição de um papel de administrador em metadados editáveis, preservação do acesso legítimo, remoção da autorização e bloqueio de leitura/escrita direta na lista. Inclui permissões públicas e permissões concedidas à coluna de e-mail. Confere que o corpo da função não foi reescrito e que a migration pode ser repetida.

Os testes não certificam a configuração de autenticação ou as permissões ativas do Supabase após a execução; essas verificações permanecem explícitas no passo de aplicação.
