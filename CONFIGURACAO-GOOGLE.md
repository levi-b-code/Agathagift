# Integração Google — Agatha Gifts

## O que foi alterado
- Removida a senha demonstrativa `agatha2026` do código e da interface.
- Botão **Entrar com Google** usa Supabase Auth e retorna para `https://levi-b-code.github.io/Agathagift/`.
- O painel só é exibido após consulta a `public.admin_users` pelo `user_id` da sessão autenticada.
- A vitrine, sacola e o layout original foram preservados.

## Verificações obrigatórias antes de publicar
1. Em `app.js`, confira `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` com **Settings > API Keys** do seu projeto. A chave publishable é pública; nunca use `service_role` ou chave secreta no site.
2. Em Supabase > Authentication > URL Configuration, Site URL deve ser `https://levi-b-code.github.io/Agathagift/`; Redirect URLs devem permitir esse endereço.
3. Em Supabase > Authentication > Providers > Google, mantenha o provedor ativo, Client ID e Client Secret configurados. Nunca publique o Client Secret no GitHub.
4. A tabela `public.admin_users` deve permitir ao usuário autenticado consultar **somente o próprio registro** via RLS (ou disponibilizar uma função RPC segura que devolva a permissão). Sem essa leitura, a interface negará acesso, mesmo a um administrador válido.
5. Confirme que o `user_id` em `admin_users` é o UID da identidade autenticada pelo Google. O mesmo e-mail NÃO garante o mesmo UID se as identidades não estiverem vinculadas.
6. Se o Google OAuth estiver em modo de teste, inclua sua conta na lista de usuários de teste no Google Cloud.

## Limitação de segurança importante
Esta entrega implementa o **login e controle visual do painel**, mas **NÃO** migra os dados da loja para Supabase. Produtos, pedidos, Pix, mídias e estoque continuam no `localStorage` do navegador, que pode ser modificado por qualquer pessoa com acesso ao navegador e não sincroniza entre dispositivos. A checagem JavaScript do painel não é barreira de segurança para esses dados. Não use como loja real antes de migrar produtos/pedidos/configurações para tabelas Supabase com RLS e implementar operações de estoque e pedidos no servidor.

## Publicação
Substitua `index.html` e `app.js` no repositório GitHub Pages, mantendo `styles.css` e `README.md`. Faça backup da versão anterior e teste primeiro em navegador anônimo. Após publicar, abra o site, vá a **Área do responsável**, clique em **Entrar com Google** e confirme o retorno ao painel. Não é possível testar o OAuth completo offline.
