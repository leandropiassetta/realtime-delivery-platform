export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Realtime Delivery Platform API',
    version: '2.0.0',
    description:
      'API em português para autenticação, catálogo, usuários, pedidos e atualizações em tempo real.',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Autenticação' },
    { name: 'Produtos' },
    { name: 'Usuários' },
    { name: 'Pedidos' },
    { name: 'Operação' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refresh_token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'requestId'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {},
              requestId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'role'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['customer', 'seller', 'administrator'] },
          active: { type: 'boolean' },
        },
      },
      Product: {
        type: 'object',
        required: ['id', 'name', 'price', 'imagePath'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          price: { type: 'string', pattern: '^\\d+\\.\\d{2}$', example: '7.50' },
          imagePath: { type: 'string', example: '/images/heineken_600ml.jpg' },
        },
      },
      OrderItemInput: {
        type: 'object',
        required: ['productId', 'quantity'],
        additionalProperties: false,
        properties: {
          productId: { type: 'integer', minimum: 1 },
          quantity: { type: 'integer', minimum: 1, maximum: 99 },
        },
      },
      Order: {
        type: 'object',
        required: ['id', 'customer', 'seller', 'totalPrice', 'status', 'items'],
        properties: {
          id: { type: 'integer' },
          customer: { $ref: '#/components/schemas/User' },
          seller: { $ref: '#/components/schemas/User' },
          totalPrice: { type: 'string', example: '24.98' },
          deliveryAddress: { type: 'string' },
          deliveryNumber: { type: 'string' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PREPARING', 'IN_TRANSIT', 'DELIVERED'],
            description: 'Pendente → Preparando → Em trânsito → Entregue.',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          items: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['Autenticação'],
        summary: 'Cadastrar cliente',
        description: 'O papel é sempre customer e uma sessão é iniciada.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Cliente e sessão criados.' },
          '409': { description: 'E-mail existente.' },
          '422': { description: 'Dados inválidos.' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Entrar',
        responses: {
          '200': { description: 'Access token no corpo e refresh token em cookie HttpOnly.' },
          '401': { description: 'Credenciais inválidas.' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Autenticação'],
        summary: 'Renovar sessão com rotação',
        security: [{ refreshCookie: [] }],
        responses: {
          '200': { description: 'Tokens rotacionados.' },
          '401': { description: 'Refresh inválido, expirado ou reutilizado.' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Autenticação'],
        summary: 'Encerrar sessão atual',
        security: [{ refreshCookie: [] }],
        responses: { '204': { description: 'Sessão revogada.' } },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['Produtos'],
        summary: 'Listar catálogo ativo',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Produtos ativos.' },
          '403': { description: 'Exclusivo para clientes.' },
        },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Usuários'],
        summary: 'Listar usuários',
        description: 'Exclusivo para administradores.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Usuários e estado de acesso.' },
          '403': { description: 'Papel insuficiente.' },
        },
      },
      post: {
        tags: ['Usuários'],
        summary: 'Criar cliente ou vendedor',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Usuário criado.' },
          '403': { description: 'Papel insuficiente.' },
        },
      },
    },
    '/api/v1/users/{id}': {
      delete: {
        tags: ['Usuários'],
        summary: 'Desativar usuário e revogar sessões',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '204': { description: 'Usuário desativado.' },
          '409': { description: 'Administrador não pode ser desativado.' },
        },
      },
    },
    '/api/v1/users/sellers': {
      get: {
        tags: ['Usuários'],
        summary: 'Listar vendedores ativos',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Vendedores disponíveis no checkout.' } },
      },
    },
    '/api/v1/orders': {
      get: {
        tags: ['Pedidos'],
        summary: 'Listar pedidos visíveis ao usuário autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Cliente recebe os próprios pedidos; vendedor, somente os associados.',
          },
        },
      },
      post: {
        tags: ['Pedidos'],
        summary: 'Finalizar pedido de forma idempotente',
        description: 'O cliente e os preços são determinados pelo servidor.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sellerId', 'deliveryAddress', 'deliveryNumber', 'items'],
                properties: {
                  sellerId: { type: 'integer' },
                  deliveryAddress: { type: 'string' },
                  deliveryNumber: { type: 'string' },
                  items: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/components/schemas/OrderItemInput' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Pedido criado ou repetição segura do pedido existente.' },
          '409': { description: 'Chave reutilizada com outro conteúdo.' },
          '422': { description: 'Produto ou vendedor inválido.' },
        },
      },
    },
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Consultar pedido autorizado',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Detalhes do pedido.' },
          '404': { description: 'Pedido ausente ou não pertencente ao usuário.' },
        },
      },
    },
    '/api/v1/orders/{id}/status': {
      patch: {
        tags: ['Pedidos'],
        summary: 'Aplicar a próxima transição permitida',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Status persistido e evento emitido.' },
          '409': { description: 'Salto, regressão ou concorrência inválida.' },
        },
      },
    },
    '/api/v1/health': {
      get: {
        tags: ['Operação'],
        summary: 'Liveness',
        responses: { '200': { description: 'Processo ativo.' } },
      },
    },
    '/api/v1/readiness': {
      get: {
        tags: ['Operação'],
        summary: 'Readiness do MySQL',
        responses: {
          '200': { description: 'Banco disponível.' },
          '503': { description: 'Banco indisponível.' },
        },
      },
    },
  },
} as const;
