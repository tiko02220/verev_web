export interface ProgramTypeConfig {
  type: string
  tierThresholdBasis: string
  tierSilverThreshold: number
  tierGoldThreshold: number
  tierVipThreshold: number
  checkInVisitsRequired: number
  checkInRewardPoints: number
  checkInRewardName: string
  purchaseFrequencyBasis: string
  purchaseFrequencyCount: number
  purchaseFrequencySpendTarget: number
  purchaseFrequencyWindowDays: number
  purchaseFrequencyRewardPoints: number
  referralReferrerRewardPoints: number
  referralRefereeRewardPoints: number
  referralCodePrefix: string
}

export interface ProgramConfigFields extends ProgramTypeConfig {
  name: string
  scope: string
  storeId: string | null
}

const REFERRAL_CODE_PREFIX_MIN = 2

export function programConfigError(form: ProgramConfigFields): string | null {
  if (form.name.trim().length === 0) return 'Name is required.'
  if (form.type !== 'TIER' && form.scope === 'BRANCH' && !form.storeId) return 'Select a branch for a branch-scoped program.'
  if (form.type === 'TIER') {
    if (form.tierSilverThreshold < 0 || form.tierGoldThreshold < 0 || form.tierVipThreshold < 0) return 'Tier thresholds cannot be negative.'
    if (!(form.tierSilverThreshold < form.tierGoldThreshold && form.tierGoldThreshold < form.tierVipThreshold)) {
      return 'Tier thresholds must strictly increase: Silver < Gold < VIP.'
    }
  }
  if (form.type === 'DIGITAL_STAMP' && form.checkInVisitsRequired <= 0) return 'Visits required must be greater than zero.'
  if (form.type === 'PURCHASE_FREQUENCY') {
    if (form.purchaseFrequencyBasis === 'COUNT' && form.purchaseFrequencyCount <= 0) return 'Purchase count must be greater than zero.'
    if (form.purchaseFrequencyBasis === 'SPEND' && form.purchaseFrequencySpendTarget <= 0) return 'Spend target must be greater than zero.'
    if (form.purchaseFrequencyWindowDays <= 0) return 'Window (days) must be greater than zero.'
  }
  if (form.type === 'REFERRAL' && form.referralCodePrefix.trim().length < REFERRAL_CODE_PREFIX_MIN) {
    return 'Referral code prefix must be at least 2 characters.'
  }
  return null
}
