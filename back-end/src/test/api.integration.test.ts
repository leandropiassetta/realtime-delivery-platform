import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const integration = describe.runIf(process.env.RUN_INTEGRATION === 'true');
const app = createApp();
const suffix = randomUUID();
const customerEmail = `integration-${suffix}@example.local`;
const otherEmail = `integration-other-${suffix}@example.local`;
const password = 'IntegrationCustomer2026!';
const createdEmails = [customerEmail, otherEmail];

type SessionBody = { data: { user: { role: string }; accessToken: string } };
type ErrorBody = { error: { code: string; requestId: string } };
type IdListBody = { data: Array<{ id: number }> };
type OrderBody = { data: { id: number; totalPrice: string } };

const cookieValue = (response: request.Response): string => {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  if (!header?.[0]) throw new Error('Cookie de refresh ausente.');
  return header[0].split(';')[0] ?? '';
};

integration('API com MySQL', () => {
  let accessToken = '';
  let otherAccessToken = '';
  let orderId = 0;

  test('health usa o envelope público', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    const body = response.body as { data: { status: string } };
    expect(body.data.status).toBe('ok');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  test('cadastro cria somente cliente e cookie protegido', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Cliente Integração', email: customerEmail, password })
      .expect(201);

    const body = response.body as SessionBody;
    const refreshCookie =
      (response.headers['set-cookie'] as unknown as string[] | undefined)?.[0] ?? '';
    expect(body.data.user.role).toBe('customer');
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Lax');
    accessToken = body.data.accessToken;

    const invalidRole = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Tentativa Seller',
        email: `role-${suffix}@example.local`,
        password,
        role: 'seller',
      })
      .expect(422);
    const error = invalidRole.body as ErrorBody;
    expect(error.error.code).toBe('VALIDATION_ERROR');
    expect(error.error.requestId).toBeTruthy();
  });

  test('refresh rotaciona token e reutilização revoga a família', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: customerEmail, password })
      .expect(200);
    const originalCookie = cookieValue(login);

    const rotation = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', originalCookie)
      .expect(200);
    const replacementCookie = cookieValue(rotation);
    expect(replacementCookie).not.toBe(originalCookie);

    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', originalCookie)
      .expect(401);
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', replacementCookie)
      .expect(401);
  });

  test('checkout calcula preço e repete com a mesma chave', async () => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const products = await request(app).get('/api/v1/products').set(headers).expect(200);
    const sellers = await request(app).get('/api/v1/users/sellers').set(headers).expect(200);
    const productBody = products.body as IdListBody;
    const sellerBody = sellers.body as IdListBody;
    const body = {
      sellerId: sellerBody.data[0]?.id,
      deliveryAddress: 'Rua da Integração',
      deliveryNumber: '24',
      items: [{ productId: productBody.data[0]?.id, quantity: 2 }],
    };
    const key = randomUUID();

    const first = await request(app)
      .post('/api/v1/orders')
      .set(headers)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    const replay = await request(app)
      .post('/api/v1/orders')
      .set(headers)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    expect(replay.headers['idempotency-replayed']).toBe('true');
    const firstBody = first.body as OrderBody;
    const replayBody = replay.body as OrderBody;
    expect(replayBody.data.id).toBe(firstBody.data.id);
    expect(firstBody.data.totalPrice).toMatch(/^\d+\.\d{2}$/);
    orderId = firstBody.data.id;
  });

  test('propriedade oculta pedido de outro cliente', async () => {
    const registration = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Outro Cliente', email: otherEmail, password })
      .expect(201);
    const registrationBody = registration.body as SessionBody;
    otherAccessToken = registrationBody.data.accessToken;

    const response = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);
    const error = response.body as ErrorBody;
    expect(error.error.code).toBe('NOT_FOUND');
  });
});

afterAll(async () => {
  if (process.env.RUN_INTEGRATION !== 'true') return;
  const users = await prisma.user.findMany({
    where: { email: { in: createdEmails } },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);
  const orders = await prisma.order.findMany({
    where: { customerId: { in: userIds } },
    select: { id: true },
  });
  const orderIds = orders.map(({ id }) => id);
  await prisma.$transaction([
    prisma.idempotencyKey.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
    prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
  await prisma.$disconnect();
});
