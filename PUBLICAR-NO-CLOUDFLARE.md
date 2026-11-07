# Agatha Gifts — atualização Cloudflare

URL oficial: https://agathagift.iamjohnlevi.workers.dev/

## Correção do login
O login Google usa `ADMIN_AUTH_REDIRECT_URL` no `app.js` apontando diretamente para o Cloudflare Workers.

No Supabase > Authentication > URL Configuration:
- Site URL: `https://agathagift.iamjohnlevi.workers.dev/`
- Redirect URLs: adicione `https://agathagift.iamjohnlevi.workers.dev/` (URL exata).

Não é necessário mudar a URL de callback do Google Cloud: ela continua apontando para o Supabase.

## Publicação segura
- Faça backup do repositório e banco antes de atualizar.
- No repositório GitHub usado pelo Cloudflare, publique **apenas** `index.html`, `styles.css` e `app.js` na raiz do site.
- Os arquivos `01_RESERVA_PRESENCIAL.sql`, `02_PROTECAO_RESERVAS.sql`, `supabase/` e documentos .md são arquivos de configuração de backend e não devem ser colocados na raiz pública do site.
- Para configurar a proteção Turnstile, substitua `CONFIGURE_SITE_KEY_AQUI` no `app.js` pela chave pública (Site Key). Configure o widget com hostname `agathagift.iamjohnlevi.workers.dev`. A chave secreta fica exclusivamente nas Edge Function Secrets do Supabase.
- Atualize `TURNSTILE_HOSTNAME=agathagift.iamjohnlevi.workers.dev` e `ALLOWED_ORIGINS=https://agathagift.iamjohnlevi.workers.dev` nas Secrets do Supabase.
- Confira `INSTALACAO-SEGURANCA.md` e execute as migrações SQL **somente se ainda não executadas**, após backup.
- Se as Edge Functions, migrações e Turnstile ainda não estiverem configurados, o envio de reservas não funcionará. Não abra o sistema de reservas ao público antes de testar.
- Após o push no GitHub, confirme o deploy no painel Cloudflare e teste login em janela anônima.

## Segurança
O aviso do Google Safe Browsing para a URL antiga do GitHub não é resolvido apenas pela mudança de hospedagem. A análise e eventual revisão pela Search Console são processos separados.
