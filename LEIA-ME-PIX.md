# Agatha Gifts — Checkout Pix (confirmação manual)

## Antes de publicar
1. Faça backup do banco e do repositório atual.
2. No Supabase do projeto **lojinha-da-agatha**, abra SQL Editor e execute **01_CHECKOUT_PIX.sql** uma única vez. Confira o resultado antes de continuar. O SQL cria `store_settings`, a função transacional `create_pix_order` e a função administrativa `set_pix_order_status`.
3. Confirme que RLS está **habilitado** em `products`, `orders`, `order_items`, `stock_movements` e `admin_users`; confira a definição e o `search_path` da função `is_store_admin()`.
4. No painel administrativo da loja, na aba **Loja e Pix**, configure a chave Pix do responsável e o nome do titular. As configurações agora são salvas no banco, e a chave fica pública aos compradores.
5. Atualize o repositório GitHub Pages `levi-b-code/Agathagift` com os arquivos deste pacote, preservando backup/commit anterior. `01_CHECKOUT_PIX.sql` pode permanecer no repositório (não contém credenciais), mas não é executado pelo GitHub Pages.
6. Faça uma compra de baixo valor e verifique no Supabase as tabelas `orders`, `order_items`, `stock_movements` e o estoque em `products`. Confirme/cancele pedidos somente após conferir os fatos reais.

## Funcionamento
- Checkout recebe nome e telefone do adulto responsável; dados pessoais ficam protegidos pelas políticas RLS existentes.
- A função SQL valida o carrinho, trava as linhas de produtos, recalcula valores, cria o pedido e reserva o estoque atomicamente.
- O cliente vê o número do pedido, o total e a chave Pix. **Não há Pix Copia e Cola EMV, QR Code dinâmico, cobrança bancária nem confirmação automática.**
- O administrador marca `paid` somente após verificar o crédito no banco. Ao cancelar um pedido pendente, o estoque é devolvido.
- Pedidos pendentes **não expiram automaticamente**. Cancelamentos e devoluções posteriores ao pagamento exigem procedimento separado.

## Segurança e limitações antes de produção
- A função pública de criação de pedidos pode sofrer spam/abuso. Para loja pública em produção, coloque rate limiting, CAPTCHA e controle de abuso numa Edge Function ou gateway antes de habilitar volume de pedidos.
- Sem confirmação automática do banco, a interface não deve afirmar que o pagamento foi concluído.
- O banco guarda dados pessoais do responsável. Configure política de privacidade, retenção e tratamento de dados conforme a LGPD.
- Não coloque `service_role`, `secret key` nem Client Secret Google no site.
- A função pressupõe as tabelas e colunas já fornecidas pelo usuário e políticas RLS de acesso admin; valide em seu projeto antes de publicar.
- Evite excluir produtos associados a pedidos. Considere desativá-los (`is_active=false`) em vez de excluir, para preservar histórico.
- Não há testes de ponta a ponta contra o Supabase real; teste antes de aceitar pedidos.
