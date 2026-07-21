import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const unique = Date.now();
const customerEmail = `e2e-customer-${unique}@example.local`;
const customerPassword = 'E2eCustomer2026!';
let orderId = 0;
let foreignOrderId = 0;

async function signOut(page: Page) {
  const button = page.getByRole('button', { name: 'Sair' });
  if (await button.isVisible().catch(() => false)) await button.click();
  await page.context().clearCookies();
}

async function loginUi(page: Page, email: string, password: string) {
  await page.goto('/');
  await signOut(page);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/(customer|seller|admin)\//);
}

async function loginApi(request: APIRequestContext, email: string, password: string) {
  const response = await request.post('/api/v1/auth/login', { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data as { user: { id: number }; accessToken: string };
}

test('1. cadastro e login de cliente', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Nome').fill('Cliente de Teste E2E');
  await page.getByLabel('E-mail').fill(customerEmail);
  await page.getByLabel('Senha').fill(customerPassword);
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await expect(page).toHaveURL(/customer\/products/);
  await signOut(page);
  await loginUi(page, customerEmail, customerPassword);
  await expect(page).toHaveURL(/customer\/products/);
});

test('2. carrinho e checkout', async ({ page }) => {
  await loginUi(page, 'customer@delivery.local', 'LocalDemoCustomer2026!');
  const add = page.getByRole('button', { name: /Adicionar uma unidade/ }).first();
  await add.click();
  await page.getByRole('link', { name: 'Revisar pedido' }).click();
  await page.getByLabel('Vendedor').selectOption({ index: 1 });
  await page.getByLabel('Endereço').fill('Rua dos Testes');
  await page.getByLabel('Número').fill('42');
  await page.getByRole('button', { name: 'Finalizar pedido' }).click();
  await expect(page).toHaveURL(/customer\/orders\/\d+/);
  orderId = Number(page.url().split('/').pop());
  await expect(page.getByText('Pendente')).toBeVisible();
});

test('3. criação única com idempotência', async ({ request }) => {
  const session = await loginApi(request, customerEmail, customerPassword);
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const sellers = await request.get('/api/v1/users/sellers', { headers });
  const products = await request.get('/api/v1/products', { headers });
  const body = {
    sellerId: (await sellers.json()).data[0].id,
    deliveryAddress: 'Avenida Idempotente',
    deliveryNumber: '100',
    items: [{ productId: (await products.json()).data[0].id, quantity: 2 }],
  };
  const key = crypto.randomUUID();
  const first = await request.post('/api/v1/orders', {
    headers: { ...headers, 'Idempotency-Key': key },
    data: body,
  });
  const second = await request.post('/api/v1/orders', {
    headers: { ...headers, 'Idempotency-Key': key },
    data: body,
  });
  expect(first.status()).toBe(201);
  expect(second.status()).toBe(201);
  expect(second.headers()['idempotency-replayed']).toBe('true');
  foreignOrderId = (await first.json()).data.id;
  expect((await second.json()).data.id).toBe(foreignOrderId);
});

test('4. vendedor visualiza somente pedido associado', async ({ page }) => {
  await loginUi(page, 'seller@delivery.local', 'LocalDemoSeller2026!');
  await expect(page.getByText(`Pedido #${String(orderId).padStart(4, '0')}`)).toBeVisible();
});

test('5. vendedor atualiza status', async ({ page }) => {
  await loginUi(page, 'seller@delivery.local', 'LocalDemoSeller2026!');
  await page.goto(`/seller/orders/${orderId}`);
  await page.getByRole('button', { name: 'Iniciar preparo' }).click();
  await expect(page.getByText('Preparando').first()).toBeVisible();
});

test('6. cliente recebe atualização em tempo real', async ({ browser }) => {
  const customerContext = await browser.newContext();
  const sellerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  const sellerPage = await sellerContext.newPage();
  await loginUi(customerPage, 'customer@delivery.local', 'LocalDemoCustomer2026!');
  await customerPage.goto(`/customer/orders/${orderId}`);
  await loginUi(sellerPage, 'seller@delivery.local', 'LocalDemoSeller2026!');
  await sellerPage.goto(`/seller/orders/${orderId}`);
  await sellerPage.getByRole('button', { name: 'Enviar para entrega' }).click();
  await expect(customerPage.getByText('Em trânsito').first()).toBeVisible();
  await customerContext.close();
  await sellerContext.close();
});

test('7. cliente confirma recebimento', async ({ page }) => {
  await loginUi(page, 'customer@delivery.local', 'LocalDemoCustomer2026!');
  await page.goto(`/customer/orders/${orderId}`);
  await page.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(page.getByText('Entregue').first()).toBeVisible();
});

test('8. administrador cria e desativa usuário', async ({ page }) => {
  await loginUi(page, 'admin@delivery.local', 'LocalDemoAdmin2026!');
  await page.getByLabel('Nome').fill('Vendedor Gerenciado E2E');
  await page.getByLabel('E-mail').fill(`managed-${unique}@example.local`);
  await page.getByLabel('Senha inicial').fill('ManagedSeller2026!');
  await page.getByLabel('Papel').selectOption('seller');
  await page.getByRole('button', { name: 'Criar usuário' }).click();
  const row = page.getByRole('row').filter({ hasText: `managed-${unique}@example.local` });
  await expect(row).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Desativar' }).click();
  await expect(row.getByText('Desativado')).toBeVisible();
});

test('9. usuário sem permissão é bloqueado', async ({ page }) => {
  await loginUi(page, customerEmail, customerPassword);
  await page.goto('/admin/manage');
  await expect(page).toHaveURL(/forbidden/);
});

test('10. pedido de outra pessoa não pode ser consultado', async ({ request }) => {
  const session = await loginApi(request, 'customer@delivery.local', 'LocalDemoCustomer2026!');
  const response = await request.get(`/api/v1/orders/${foreignOrderId}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  expect(response.status()).toBe(404);
});
