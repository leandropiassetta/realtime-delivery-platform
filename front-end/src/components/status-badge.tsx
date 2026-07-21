import { statusLabel } from '../lib/format';
import type { OrderStatus } from '../types';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{statusLabel[status]}</span>;
}
