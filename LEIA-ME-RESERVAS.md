# Agatha Gifts — reservas presenciais

1. Faça backup do banco e do repositório GitHub.
2. Execute `01_RESERVA_PRESENCIAL.sql` no SQL Editor do Supabase.
3. Confirme que as funções `create_reservation` e `set_reservation_status` foram criadas e as funções antigas de Pix perderam a permissão EXECUTE.
4. Publique `index.html`, `styles.css` e `app.js` no repositório oficial (sem publicar o SQL).
5. Faça uma reserva com produto de teste, confira a baixa do estoque, cancele e confira a reposição; confirme outra reserva como retirada.
6. Não solicite revisão ao Google antes de verificar o código publicado, scripts externos, histórico do Git e a segurança da conta/repositório. A mudança para reservas não garante a remoção do alerta.

O site não coleta pagamento. O total exibido é apenas o valor dos produtos, a pagar presencialmente na retirada. A reserva reduz o estoque imediatamente. Não há expiração automática de reservas. A finalização pode sofrer spam; implemente rate limiting/CAPTCHA antes de ampla divulgação. Pedidos antigos com status `pending` ainda podem ser tratados pelo painel. Os campos Pix legados permanecem armazenados no banco para preservar dados, mas a leitura pública é revogada.
