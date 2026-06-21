import type { PlatformAdminRole } from '../types/api'

export type Capability =
  | 'merchants.read'
  | 'merchants.config'
  | 'merchants.suspend'
  | 'merchants.delete'
  | 'billing.read'
  | 'billing.manage'
  | 'support.manage'
  | 'admins.manage'

const ROLE_CAPABILITIES: Record<PlatformAdminRole, ReadonlySet<Capability>> = {
  OWNER: new Set<Capability>([
    'merchants.read',
    'merchants.config',
    'merchants.suspend',
    'merchants.delete',
    'billing.read',
    'billing.manage',
    'support.manage',
    'admins.manage',
  ]),
  OPERATIONS_ADMIN: new Set<Capability>(['merchants.read', 'merchants.config', 'support.manage']),
  FINANCE_ADMIN: new Set<Capability>(['merchants.read', 'billing.read', 'billing.manage']),
  SUPPORT_ADMIN: new Set<Capability>(['merchants.read', 'support.manage']),
}

export function can(role: PlatformAdminRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.has(capability) ?? false
}
