# Revisão do código — Agatha Gifts

## Correções realizadas
- Corrigido bug que impedia editar produtos existentes (ID oculto não era preenchido).
- Corrigida confirmação de retirada que usava comparação incorreta de status.
- Removidos produtos fictícios, leitura/gravação de produtos e pedidos em localStorage.
- Verificação administrativa agora usa `is_store_admin()` (não depende da política SELECT em `admin_users`). A função precisa conceder EXECUTE ao papel authenticated.
- URL de retorno OAuth usa o endereço de hospedagem atual, compatível com GitHub Pages ou Cloudflare Pages (ambos precisam estar autorizados em Redirect URLs).
- URLs de mídia limitadas ao bucket público esperado no Supabase, evitando inserção de recursos arbitrários na vitrine.
- Upload restrito a formatos e tamanho previstos; validação adicional no navegador não substitui políticas do Storage.
- Função SQL de reserva valida UUID e telefone; cancelamento só atua em reservas `reserved` (evita devolver estoque de pedidos legados `pending`).
- Mantidos preços e reserva de estoque no PostgreSQL, sob transação e bloqueio de linhas.
- Removida a opção de Pix da interface.

## Pendências IMPORTANTES antes de publicar
1. **Abuso de reservas:** a função `create_reservation` está acessível anonimamente. É necessário implantar proteção anti-bot *validada no servidor*, limitação de taxa e política de expiração para impedir bloqueio malicioso de estoque. Esta versão **não** implementa esse controle.
2. **Funções legadas:** conferir `pg_proc` e revogar/remover todas as versões de funções Pix e outras RPCs públicas antigas. O SQL cobre apenas duas assinaturas conhecidas.
3. **Segurança:** revisar triggers, grants, RLS habilitado, políticas de Storage e o dono das funções SECURITY DEFINER.
4. **Dados pessoais:** definir prazo de retenção e política de privacidade para nomes e telefones.
5. **OAuth:** cadastrar URL de hospedagem em Supabase Redirect URLs.
6. **Google Safe Browsing:** nenhuma alteração garante remoção do alerta de phishing; auditar o site publicado e solicitar revisão na Search Console após corrigir problemas.
7. **Testes reais:** não houve execução contra o Supabase de produção; testar fluxo de reserva, cancelamento, estoque concorrente e acesso administrativo em ambiente controlado.

## Implantação
Não publique diretamente em produção antes de resolver o item 1 e validar o SQL. Faça backup do banco e do GitHub.
