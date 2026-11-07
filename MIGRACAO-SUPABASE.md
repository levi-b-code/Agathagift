# Agatha Gifts — migração, fase 1

## O que foi conectado
- A vitrine consulta `public.products` no Supabase; produtos demonstrativos não são publicados.
- Administradores autenticados podem cadastrar, editar e excluir produtos usando as políticas RLS já configuradas.
- Fotos e vídeos novos são enviados ao bucket público `product-media`; URLs são registradas em `media_urls`.
- A sacola permanece temporária no navegador.

## Limites desta entrega
- **Pedidos/checkout estão desativados** para não registrar pedidos falsos, cobrar preços manipulados ou descontar estoque só no navegador. A próxima fase requer uma função de servidor transacional para validar produtos, calcular totais e controlar estoque.
- Configurações de WhatsApp/Pix ainda ficam no navegador (`localStorage`), não sincronizadas. Não são um sistema de pagamentos.
- Produtos antigos do `localStorage` **não são importados automaticamente**: é necessário cadastrá-los no painel. Isso evita publicar produtos fictícios sem revisão.
- Mídias antigas armazenadas como data URL não foram migradas; reenvie arquivos pelo painel.
- O campo de emoji continua visível no formulário por compatibilidade visual, mas não é persistido porque a tabela não possui essa coluna.
- Remover um produto não apaga automaticamente arquivos antigos do Storage.

## Antes de publicar
1. Faça backup do site atual e da lista de produtos locais.
2. Verifique se `products` e `storage.objects` têm RLS habilitado e políticas apropriadas.
3. Verifique se o bucket `product-media` existe e permite upload por administradores autenticados; limite de arquivo e MIME type dependem da configuração do bucket/projeto.
4. Confirme que o Google OAuth retorna o mesmo UID registrado em `admin_users`.
5. Publique os arquivos no GitHub Pages e teste login, cadastro, upload, edição, exclusão e vitrine em janela anônima.
6. Nunca inclua a `service_role` ou o Client Secret Google no repositório.

## Próxima fase
Criar função RPC/Edge Function para checkout com validação de preço e estoque no servidor, inserção atômica em `orders` e `order_items`, e acesso aos dados de clientes restrito aos administradores.
