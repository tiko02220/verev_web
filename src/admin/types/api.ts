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

export interface CreateStoreRequest {
  name: string
  address: string
  contactInfo: string
  category: string
  workingHours: string
}

export const STAFF_ROLES = ['OWNER', 'STORE_MANAGER', 'CASHIER', 'STAFF'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export interface StaffPermissions {
  viewAnalytics: boolean
  managePrograms: boolean
  processTransactions: boolean
  manageStaff: boolean
}

export interface CreateStaffRequest {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  role: string
  permissions: StaffPermissions
  primaryStoreId: string
  storeIds: string[]
}

export interface CreatedStaffResponse {
  staff: AdminStaff
  temporaryPassword: string
}

export interface TemporaryPasswordResponse {
  temporaryPassword: string
}

export interface UpdateCustomerRequest {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
}

export interface PointsAdjustmentRequest {
  pointsDelta: number
  reason: string
}

export interface PointsAdjustmentResponse {
  organizationPoints: number
  networkPoints: number
  transactionId: string
}

export interface UpdateProgramRequest {
  name: string
}

export interface AdminProgramResponseModel {
  id: string
  name: string
  type: string
  active: boolean
}

export const PROGRAM_TYPES = ['DIGITAL_STAMP', 'TIER', 'PURCHASE_FREQUENCY', 'REFERRAL'] as const
export type ProgramType = (typeof PROGRAM_TYPES)[number]

export const PROGRAM_SCOPES = ['BRANCH', 'GLOBAL'] as const
export type ProgramScope = (typeof PROGRAM_SCOPES)[number]

export const TIER_THRESHOLD_BASES = ['POINTS', 'SPEND'] as const
export type TierThresholdBasis = (typeof TIER_THRESHOLD_BASES)[number]

export interface CreateProgramRequest {
  name: string
  type: string
  scope: string
  active: boolean
  tierSilverThreshold: number
  tierGoldThreshold: number
  tierVipThreshold: number
  tierThresholdBasis: string
  checkInVisitsRequired: number
  checkInRewardPoints: number
  checkInRewardName: string
  purchaseFrequencyCount: number
  purchaseFrequencyWindowDays: number
  purchaseFrequencyRewardPoints: number
  referralReferrerRewardPoints: number
  referralRefereeRewardPoints: number
  storeId: string
}

export interface AdminRewardSummary {
  id: string
  storeId: string
  name: string
  description: string
  pointsRequired: number
  rewardType: string
  catalogType: string
  activeStatus: boolean
  inventoryTracked: boolean
  availableQuantity: number
  imageUri: string
}

export interface UpdateCampaignRequest {
  name: string
  startDate: string
  endDate: string
  promotionValue: number
}

export interface AdminCampaignResponseModel {
  id: string
  name: string
  promotionType: string
  promotionValue: number
  active: boolean
  startDate: string
  endDate: string
}

export interface VoidTransactionRequest {
  reason: string
}

export interface AdminTransactionSummary {
  id: string
  customerId: string
  transactionType: string
  status: string
  amount: number
  pointsEarned: number
  pointsRedeemed: number
  occurredAt: string
}

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
  giveawayType: string
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

export interface BillingSubscription {
  planCode: string
  displayName: string
  monthlyPrice: number
  currencyCode: string
  billingCycle: string
  status: string
  autoRenew: boolean
  renewalDate: string
  active: boolean
}

export interface BillingInvoice {
  id: string
  title: string
  periodLabel: string
  amount: number
  currencyCode: string
  status: string
  issuedDate: string
}

export interface BillingSummary {
  openInvoiceCount: number
  openInvoiceAmount: number
  paidInvoiceAmount30d: number
  currentMonthlyPrice: number | null
  nextRenewalDate: string | null
}

export interface MerchantBilling {
  organizationId: string
  accessState: string
  currentSubscription: BillingSubscription | null
  invoices: BillingInvoice[]
  summary: BillingSummary
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

export interface NotificationSettings {
  emailEnabled: boolean
  telegramEnabled: boolean
  emails: string[]
  telegramChatIds: string[]
}

export interface ModerationPromotion {
  campaignId: string
  organizationId: string
  merchantName: string
  storeName: string
  name: string
  description: string
  imageUri: string
  promotionType: string
  promotionValue: number
  startDate: string
  endDate: string
  minimumPurchaseAmount: number
  usageLimit: number
  visibility: string
  audienceAll: boolean
  audienceGender: string
  audienceAgeMin: number | null
  audienceAgeMax: number | null
  audienceTierName: string
  createdAt: string
}

export interface ModerationCardDesign {
  storeId: string
  organizationId: string
  merchantName: string
  cardName: string
  logoUrl: string
  cardBackgroundUrl: string
  primaryColor: string
  secondaryColor: string
  updatedAt: string
}

export interface AppUpdateConfig {
  platform: string
  latestVersion: string
  forceVersion: string
  suggestedVersion: string
  storeUrl: string
  updatedAt: string
}

export interface UpsertAppUpdateRequest {
  latestVersion: string
  forceVersion: string
  suggestedVersion: string
  storeUrl: string
}

export const PLATFORM_ADMIN_ROLES = ['OWNER', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'] as const
export type PlatformAdminRoleName = (typeof PLATFORM_ADMIN_ROLES)[number]

export interface PlatformAdminUser {
  id: string
  email: string
  fullName: string
  role: string
  status: string
  lastLoginAt: string | null
  createdAt: string
}

export interface CreateAdminRequest {
  email: string
  fullName: string
  role: string
  password: string
}

export interface AdminApproval {
  id: string
  requestType: string
  status: string
  reasonText: string
  createdAt: string
  expiresAt: string | null
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

export interface UpdateProfileRequest {
  legalName: string
  displayName: string
  industry: string
  email: string
  phone: string
  defaultCurrencyCode: string
  defaultTimezone: string
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

export interface PlatformCustomerSummary {
  customerId: string
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  loyaltyId: string
  enrolledDate: string
  organizationCount: number
}

export interface PlatformCustomerLedgerEntry {
  id: string
  transactionId: string
  pointsDelta: number
  reasonCode: string
  createdAt: string
}

export interface PlatformCustomerOrgAffiliation {
  organizationId: string
  organizationName: string
  currentPoints: number
  lifetimePointsEarned: number
  lifetimePointsRedeemed: number
  loyaltyTier: string
  status: string
  totalVisits: number
  totalSpent: number
  lastVisitAt: string | null
  enrolledAt: string
  recentLedger: PlatformCustomerLedgerEntry[]
}

export interface PlatformCustomerIdentity {
  customerId: string
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  gender: string
  birthDate: string
  loyaltyId: string
  enrolledDate: string
}

export interface PlatformCustomerDetail {
  customer: PlatformCustomerIdentity
  organizations: PlatformCustomerOrgAffiliation[]
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
