import { describe, expect, it } from 'vitest';
import { formatDecimalMoney, formatMoney, roleHome, statusLabel } from './format';

describe('formatters', () => {
  it('formata valores em real', () => {
    expect(formatMoney(750)).toContain('7,50');
    expect(formatDecimalMoney('21.60')).toContain('21,60');
  });

  it('mapeia status e rotas por papel', () => {
    expect(statusLabel.DELIVERED).toBe('Entregue');
    expect(roleHome('customer')).toBe('/customer/products');
    expect(roleHome('seller')).toBe('/seller/orders');
    expect(roleHome('administrator')).toBe('/admin/manage');
  });
});
