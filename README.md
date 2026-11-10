# Lojinha da Ágatha | primeira versão

Site responsivo, com prioridade para celular, vitrine de produtos, sacola, pedido via WhatsApp e painel administrativo.

## Como abrir
1. Descompacte `lojinha_da_agatha.zip`.
2. Abra a pasta `lojinha_da_agatha`.
3. Clique duas vezes em `index.html` para testar no navegador.

## Como publicar no GitHub Pages
1. Crie um repositório no GitHub, por exemplo `lojinha-da-agatha`.
2. Envie **os arquivos que estão dentro desta pasta** para a raiz do repositório: `index.html`, `styles.css`, `app.js` e `README.md`.
3. No GitHub, abra **Settings → Pages**.
4. Em “Build and deployment”, selecione “Deploy from a branch”, escolha `main` e `/ (root)`, e salve.
5. Aguarde a publicação e abra o endereço apresentado pelo GitHub Pages.

## Painel administrativo
- Na loja, toque em **Área do responsável** no rodapé.
- Senha inicial de demonstração: `agatha2026`.
- **Antes de publicar**, abra `app.js` e altere `ADMIN_PASSWORD` para uma senha própria.

No painel você pode cadastrar/editar/excluir produtos, ajustar estoque, acompanhar pedidos e configurar WhatsApp e chave Pix.

## Importante: limites desta primeira versão
Esta é uma **versão inicial demonstrativa**. Os dados ficam no `localStorage` do navegador. Isso significa:
- Produtos, configurações e pedidos não sincronizam entre aparelhos ou navegadores.
- Limpar os dados do navegador pode apagar os registros.
- A senha do painel está no código JavaScript e não é proteção real contra alguém que examine o site.
- O pedido abre o WhatsApp com o resumo e a chave Pix; o pagamento precisa ser conferido manualmente pelo responsável.
- O estoque é atualizado no navegador que registrou o pedido, sem reserva segura contra compras simultâneas.

**Não use esta versão para receber pagamentos ou pedidos reais em produção ainda.** Para a próxima etapa, conectar um backend como Supabase (banco de dados, autenticação de responsável e atualização segura de estoque). A chave Pix deve pertencer e ser administrada por um adulto responsável.

## Privacidade e segurança das crianças
O site não pede nome, escola, endereço ou telefone da criança. O pedido é iniciado por um adulto que declara ser maior de 18 anos e autorizar a compra. Essa declaração não comprova idade por si só. O responsável deve acompanhar a comunicação, pagamento e entrega.


## Como trocar os quatro produtos de demonstração
Abra `app.js` e procure por `products:[` dentro do bloco `seed`. Ali estão os quatro exemplos iniciais:
- Pulseira arco-íris
- Pulseira de coração
- Kit de pulseirinhas
- Gloss brilhante

Edite `name`, `category`, `price`, `stock` e `description` para colocar os produtos reais da Ágatha. O campo `image` aceita, por enquanto, um emoji como imagem provisória. Quando tiver as fotos, podemos adaptar o cadastro para selecionar e enviar imagens de verdade pelo painel.

Se você já abriu a loja antes no mesmo navegador, os exemplos antigos podem continuar aparecendo porque o navegador guarda os dados locais. Para começar do zero, limpe os dados do site/localStorage do navegador ou teste em uma janela anônima.


## Upload de fotos e vídeos (demonstração)
O painel administrativo agora inclui o campo **Foto ou vídeo do produto**, com pré-visualização antes de salvar. Aceita imagens e vídeos MP4, WebM ou MOV, limitados a 1 MB por arquivo nesta versão. A mídia é armazenada no navegador (localStorage), portanto fica apenas naquele aparelho/navegador. Para que todos os clientes vejam as mídias e para sincronizar vários aparelhos, será necessário integrar armazenamento online e banco de dados, por exemplo Supabase Storage.


Banco de Dados:

Subase

https://supabase.com/dashboard/org/iahupdhazhpedwxtnnud
