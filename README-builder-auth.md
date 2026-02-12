# Builder + Auth + Multi-tenant (resumo)

## Variaveis de ambiente

- `DATABASE_URL` (ou `POSTGRES_URL`) - conexao Postgres/Supabase
- `JWT_SECRET` - segredo do JWT usado em `/api/auth/*`
- `CREDENTIALS_SECRET` - chave para criptografar credenciais por usuario (recomendado)
- `SEALPAY_API_URL` - fallback global opcional para desenvolvimento
- `SEALPAY_API_KEY` - fallback global opcional para desenvolvimento
- (Opcional legado) `ADMIN_PASSWORD` - nao necessario com novo auth, manter apenas se quiser fallback antigo

## Testes manuais

1. Signup/Login
- `POST /api/auth/signup` com `{ "email": "user1@teste.com", "password": "123456" }`
- `POST /api/auth/login` com as mesmas credenciais
- acessar `/admin/` e logar com email/senha

2. Abrir Builder
- acessar `/admin/builder.html`
- confirmar carregamento de temas no dropdown `Modelos`

3. Tema + cores + preview ao vivo
- selecionar tema no dropdown
- clicar `Aplicar`
- alterar cores/fonte/arredondamento
- validar que o iframe atualiza imediatamente (postMessage)

4. Publicar e persistir
- clicar `Publicar`
- badge deve voltar para `Sem alteracoes`
- abrir `/checkout/:slug` e confirmar layout salvo

5. Isolamento entre 2 usuarios
- criar `user2` com outro email
- logar com `user1`, criar/editar produto e aparencia
- logar com `user2`, confirmar que itens/carrinhos/pedidos/aparencia nao mostram dados do `user1`
- abrir checkout de slug do `user1` e validar que usa aparencia do dono daquele slug

6. Credenciais de pagamento por usuario
- no Builder, abrir `Pagamentos`
- preencher `API URL` e `API Key` da conta SealPay do usuario
- salvar
- confirmar que checkout desse usuario gera Pix com a propria conta
