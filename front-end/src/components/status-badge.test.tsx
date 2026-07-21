import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('traduz status técnico para português', () => {
    render(<StatusBadge status="IN_TRANSIT" />);
    expect(screen.getByText('Em trânsito')).toHaveClass('status-in_transit');
  });
});
