export interface ApiMeta {
  requestId: string
  timestamp: string
}

export interface ApiErrorBody {
  code: number | null
  message: string
  details?: unknown
}

export interface ApiEnvelope<T> {
  data: T | null
  meta: ApiMeta
  error: ApiErrorBody | null
}

export type PlatformAdminRole = 'OWNER' | 'OPERATIONS_ADMIN' | 'FINANCE_ADMIN' | 'SUPPORT_ADMIN'

export interface PlatformAdmin {
  id: string
  email: string
  fullName: string
  role: PlatformAdminRole
  status: string
}

export interface AdminLoginResponse {
  accessToken: string
  admin: PlatformAdmin
}

export type OrganizationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
export type OrganizationAccessState = 'ACTIVE' | 'READ_ONLY_GRACE' | 'SUSPENDED' | 'CANCELLED'

export interface MerchantSummary {
  organizationId: string
  slug: string
  displayName: string
  status: string
  accessState: string
  planCode: string | null
  storeCount: number
  staffCount: number
  customerCount: number
  createdAt: string
}

export interface MerchantOverview {
  storeCount: number
  staffCount: number
  customerCount: number
  activeProgramCount: number
  activeCampaignCount: number
  transactionCount: number
  pointsOutstanding: number
}

export interface AdminStore {
  id: string
  name: string
  active: boolean
  category: string
  address: string
  contactInfo: string
  workingHours: string
}

export interface UpdateStoreRequest {
  name: string
  address: string
  contactInfo: string
  category: string
  workingHours: string
}

export const STAFF_ROLES = ['OWNER', 'STORE_MANAGER', 'CASHIER', 'STAFF'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export interface AdminProgram {
  id: string
  name: string
  type: string
  active: boolean
  createdAt: string
}

export interface AdminCampaign {
  id: string
  name: string
  promotionType: string
  promotionValue: number
  active: boolean
  startDate: string
  endDate: string
}

export interface AdminTransaction {
  id: string
  customerId: string
  transactionType: string
  status: string
  amount: number
  pointsEarned: number
  pointsRedeemed: number
  occurredAt: string
}

export interface AdminLedgerEntry {
  id: string
  customerId: string
  transactionId: string
  entryType: string
  pointsDelta: number
  balanceAfter: number
  reasonCode: string
  createdAt: string
}

export interface PlatformDashboard {
  totalMerchants: number
  activeMerchants: number
  suspendedMerchants: number
  pendingMerchants: number
  totalStores: number
  totalStaff: number
  totalCustomers: number
  totalTransactions: number
  pointsOutstanding: number
}

export interface AuditEntry {
  id: string
  actorType: string
  action: string
  entityType: string
  entityId: string
  organizationId: string | null
  reasonText: string
  createdAt: string
}

export interface AdminStaff {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  role: string
  active: boolean
}

export interface UpdateAccessStateRequest {
  accessState: OrganizationAccessState
  reasonText?: string
}

export type DeletionMode = 'ANONYMIZE' | 'RAW_PURGE'

export interface DeleteMerchantRequest {
  mode: DeletionMode
  confirmation: string
}

export interface AdminCustomer {
  customerId: string
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  loyaltyId: string
  currentPoints: number
  totalVisits: number
  totalSpent: number
  loyaltyTier: string
  status: string
  lastVisitAt: string | null
  enrolledAt: string
}

export interface MerchantDetail {
  organizationId: string
  slug: string
  legalName: string
  displayName: string
  industry: string
  phone: string
  email: string
  status: string
  accessState: string
  defaultCurrencyCode: string
  defaultTimezone: string
  ownerUserId: string | null
  planCode: string | null
}
