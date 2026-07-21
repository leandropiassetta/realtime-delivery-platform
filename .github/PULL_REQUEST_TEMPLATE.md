## Contexto

A implementação original foi desenvolvida coletivamente durante a formação de Desenvolvimento Web da Trybe. Esta PR preserva seu histórico e a tag `original-trybe-team-implementation`, sem atribuir funcionalidades antigas individualmente.

## Escopo da modernização

- migração de frontend e backend para TypeScript strict;
- React/Vite, Express/Prisma/MySQL e API `/api/v1`;
- fluxos completos de cliente, vendedor e administrador;
- OpenAPI em português, Docker Compose, CI e Dependabot.

## Segurança

- Argon2id no lugar de MD5;
- access token em memória e refresh token rotativo em cookie HttpOnly;
- RBAC, propriedade de pedidos, transações, totais no servidor e idempotência;
- Socket.IO autenticado com rooms privadas e eventos pós-commit.
- CSP e Permissions Policy no frontend e na documentação;
- produção exige HTTPS, cookies seguros e segredos JWT distintos e não locais;
- Actions e imagens fixadas por SHA/digest, com Trivy no CI para CVEs corrigíveis altas/críticas.

## Arquitetura e operação

Frontend servido por Nginx non-root, API Express, Socket.IO e Prisma sobre MySQL 8.4. `docker compose up --build` executa migrations e inicia a stack; o perfil `seed` carrega dados locais.

## Validação executada

- Backend: 18 testes unitários + 5 integrações Supertest.
- Frontend: 6 testes.
- Playwright: 10 cenários E2E.
- Cobertura crítica backend: 90% statements / 81,25% branches / 100% functions / 96,29% lines.
- Cobertura crítica frontend: 96,96% statements / 100% branches / 91,66% functions / 96,42% lines.
- Lint, typecheck, Prettier, builds, Compose e três auditorias npm com 0 vulnerabilidades.

## Screenshots

Consulte `docs/images` e a seção 18 do README.

## Limitações

Sem pagamento, estoque, recuperação de senha/MFA, gestão de catálogo ou deploy público. Socket.IO ainda usa adaptador em memória e a idempotência não possui expurgo automático.

## Referência original

https://github.com/leandropiasseta/realtime-delivery-platform/tree/original-trybe-team-implementation
