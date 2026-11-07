# Agatha Gifts — Reservas presenciais protegidas

## Alterações
- Reserva anônima **não chama mais diretamente** `create_reservation`. A função é restrita ao papel `service_role`.
- Uma Supabase Edge Function `reserve-product` valida **Cloudflare Turnstile no servidor**, origem permitida, hostname e ação do desafio.
- Limite transacional: até **3 tentativas verificadas por IP a cada 30 minutos** e **2 por telefone a cada 24 horas**. Identificadores ficam em hash com sal; entradas antigas são apagadas pela tarefa de expiração.
- Reservas abertas expiram após **24 horas** e o estoque é devolvido quando a rotina agendada executa.
- A vitrine continua sem Pix e sem cobrança online. O cliente paga presencialmente na retirada.

## IMPORTANTE: antes de publicar
1. Faça backup do banco e repositório.
2. Execute `01_RESERVA_PRESENCIAL.sql` (se ainda não executado). Depois execute `02_PROTECAO_RESERVAS.sql` no SQL Editor do Supabase. **Não inverta a ordem.**
3. Em Cloudflare Turnstile, crie um widget para o domínio de publicação. Guarde a **Site Key (pública)** e a **Secret Key (privada)**. Na linha `TURNSTILE_SITE_KEY` do `app.js`, substitua `CONFIGURE_SITE_KEY_AQUI` pela Site Key. Nunca coloque a Secret Key no JavaScript ou no GitHub.
4. Instale Supabase CLI e faça login. Dentro da pasta do projeto: `supabase login`, `supabase link --project-ref jfseknlktcbcfkmpctzd` (confirme o ID no seu painel), `supabase functions deploy reserve-product --no-verify-jwt`.
5. No painel do Supabase, em **Edge Functions → Secrets**, configure:
   - `TURNSTILE_SECRET_KEY`: chave secreta do widget
   - `TURNSTILE_HOSTNAME`: somente o hostname público, por exemplo `levi-b-code.github.io` ou `agathagift.pages.dev` (sem `https://` nem `/`)
   - `ALLOWED_ORIGINS`: origem exata, por exemplo `https://levi-b-code.github.io` ou `https://agathagift.pages.dev` (sem barra final). Pode separar origens por vírgula.
   - `RESERVATION_HASH_SALT`: string aleatória longa (32+ caracteres), gerada por gerenciador seguro de senhas.
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizadas pelo ambiente Supabase Edge Functions; confira no painel. Nunca envie a service role key ao navegador.
6. Habilite a extensão `pg_cron` no Supabase. Execute **uma vez** o `cron.schedule` comentado no final de `02_PROTECAO_RESERVAS.sql` e confirme o job em Database → Cron Jobs. Sem o agendamento, **as reservas NÃO expiram automaticamente**.
7. Faça um teste controlado com um produto real de estoque pequeno: criar reserva, conferir redução do estoque; cancelar no admin, conferir reposição; criar outra reserva, simular expiração em ambiente seguro, conferir reposição. Confira logs da Edge Function, permissões RLS, logs do cron e tratamento de erro.
8. Somente depois publique os arquivos estáticos `index.html`, `styles.css` e `app.js` no GitHub Pages ou Cloudflare Pages. Não publique os arquivos SQL, a pasta `supabase/`, segredos nem relatórios internos como arquivos públicos.

## Pontos de atenção
- O bloqueio por IP pode afetar famílias em redes compartilhadas; ajuste os limites se necessário. Não substitui monitoramento, alertas e mecanismos adicionais contra abuso distribuído.
- Turnstile verifica o hostname do site. Ao migrar de domínio, atualize o widget, `TURNSTILE_HOSTNAME`, `ALLOWED_ORIGINS`, a URL do Supabase Auth e os Redirect URLs.
- A expiração é baseada em `created_at` e no estado `reserved`; não marque como retirada uma reserva já expirada.
- A interface usa o horário de 24 horas como informação; a expiração efetiva depende do job `pg_cron`.
- Confira as versões antigas de RPCs de Pix ou pedidos que possam ter EXECUTE para `anon`/`authenticated`; o SQL anterior revoga apenas assinaturas conhecidas.
- A função de reserva original é SECURITY DEFINER e deve ter proprietário e permissões auditados. `service_role` é altamente privilegiado; mantenha segredo exclusivamente na Edge Function.
- Não há confirmação automática de pagamento; a confirmação é presencial e manual.
- O alerta de phishing do Google **não será automaticamente removido**. Revise conteúdo, histórico de commits, dependências e páginas publicadas e só então solicite revisão no Google Search Console.
- Este pacote passou por revisão estática e verificação de sintaxe JavaScript; **não foi testado com seu banco de produção nem com as chaves reais do Turnstile**.
