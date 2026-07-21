import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
const output = new URL('../docs/images/', import.meta.url);
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();

async function login(email, password) {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/(customer|seller|admin)\//);
  await page.waitForLoadState('networkidle');
}

try {
  await page.goto(`${baseUrl}/login`);
  await page.screenshot({ path: new URL('login.png', output).pathname, fullPage: true });

  await login('customer@delivery.local', 'LocalDemoCustomer2026!');
  await page.screenshot({ path: new URL('catalog.png', output).pathname, fullPage: true });

  await page.getByRole('button', { name: 'Sair' }).click();
  await login('admin@delivery.local', 'LocalDemoAdmin2026!');
  await page.screenshot({ path: new URL('admin.png', output).pathname, fullPage: true });
} finally {
  await browser.close();
}
