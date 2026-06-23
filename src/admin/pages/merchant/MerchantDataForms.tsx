import { useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '../../lib/apiClient'
import { humanize } from '../../lib/format'
import {
  useAdjustRewardInventory,
  useCampaignDetail,
  useCreateCampaign,
  useCreateReward,
  useMerchantRewards,
  useMerchantStores,
  useProgramDetail,
  useRewardDetail,
  useUpdateCampaignFull,
  useUpdateLoyaltySettings,
  useUpdateProgramConfig,
  useUpdateReward,
} from '../../api/merchants'
import { Button, Spinner, Switch, TextField } from '../../components/ui/primitives'
import { Modal } from '../../components/ui/Dialog'
import { programConfigError } from './programForm'
import type { ProgramTypeConfig } from './programForm'
import { PROGRAM_SCOPES, PROGRAM_TYPES, PURCHASE_FREQUENCY_BASES, TIER_THRESHOLD_BASES } from '../../types/api'
import type {
  AdminCampaign,
  AdminCampaignDetail,
  AdminCampaignFullRequest,
  AdminCreateRewardRequest,
  AdminLoyaltyPointsSettings,
  AdminProgram,
  AdminProgramDetail,
  AdminRewardDetail,
  AdminRewardSummary,
  AdminUpdateLoyaltyPointsSettingsRequest,
  AdminUpdateProgramConfigRequest,
  AdminUpdateRewardRequest,
} from '../../types/api'

const REWARD_TYPES = ['FREE_PRODUCT', 'DISCOUNT_COUPON', 'GIFT_ITEM', 'SPECIAL_PROMOTION'] as const
const REWARD_CATALOG_TYPES = ['REWARD', 'COUPON'] as const
const REWARD_SCOPES = ['GLOBAL', 'BRANCH'] as const
const COUPON_BENEFIT_TYPES = ['DISCOUNT_PERCENT', 'BONUS_POINTS', 'REWARD'] as const
const GIVEAWAY_TYPES = ['BONUS_POINTS', 'DISCOUNT_PERCENT', 'REWARD', 'COUPON'] as const
const SEND_MODES = ['IMMEDIATE', 'SCHEDULED'] as const
const AUDIENCE_GENDERS = ['ALL', 'MALE', 'FEMALE'] as const

const FAR_FUTURE_YEARS = 50

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function farFutureIso(startIso: string): string {
  const base = startIso.trim().length > 0 ? new Date(startIso) : new Date()
  const safe = Number.isNaN(base.getTime()) ? new Date() : base
  safe.setFullYear(safe.getFullYear() + FAR_FUTURE_YEARS)
  return safe.toISOString().slice(0, 10)
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <FieldShell label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/15"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {humanize(option)}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function StoreSelectField({ merchantId, value, onChange }: { merchantId: string; value: string; onChange: (value: string) => void }) {
  const { data } = useMerchantStores(merchantId)
  const stores = data ?? []
  return (
    <FieldShell label="Branch">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/15"
      >
        <option value="">Select a branch…</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

function RewardSelectField({ merchantId, value, onChange }: { merchantId: string; value: string; onChange: (value: string) => void }) {
  const { data } = useMerchantRewards(merchantId)
  const rewards = data ?? []
  return (
    <FieldShell label="Linked reward">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/15"
      >
        <option value="">Select a reward…</option>
        {rewards.map((reward) => (
          <option key={reward.id} value={reward.id}>
            {reward.name}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

function NumberField({ label, value, onChange, min, errorText }: { label: string; value: number; onChange: (next: number) => void; min?: number; errorText?: string }) {
  return (
    <TextField
      label={label}
      type="number"
      inputMode="numeric"
      min={min}
      value={value === 0 ? '' : String(value)}
      errorText={errorText}
      onChange={(event) => {
        const parsed = Number(event.target.value)
        onChange(Number.isFinite(parsed) ? parsed : 0)
      }}
    />
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function FormError({ text }: { text: string | null }) {
  if (!text) return null
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{text}</p>
}

export function ProgramTypeFields<T extends ProgramTypeConfig>({
  form,
  set,
  numberMin,
}: {
  form: T
  set: <K extends keyof T>(field: K, value: T[K]) => void
  numberMin: boolean
}) {
  const min = numberMin ? 0 : undefined
  if (form.type === 'TIER') {
    return (
      <>
        <SelectField label="Threshold basis" value={form.tierThresholdBasis} options={TIER_THRESHOLD_BASES} onChange={(value) => set('tierThresholdBasis', value as T['tierThresholdBasis'])} />
        <NumberField label="Silver threshold" value={form.tierSilverThreshold} min={min} onChange={(value) => set('tierSilverThreshold', value as T['tierSilverThreshold'])} />
        <NumberField label="Gold threshold" value={form.tierGoldThreshold} min={min} onChange={(value) => set('tierGoldThreshold', value as T['tierGoldThreshold'])} />
        <NumberField label="VIP threshold" value={form.tierVipThreshold} min={min} onChange={(value) => set('tierVipThreshold', value as T['tierVipThreshold'])} />
      </>
    )
  }
  if (form.type === 'DIGITAL_STAMP') {
    return (
      <>
        <NumberField label="Visits required" value={form.checkInVisitsRequired} min={min} onChange={(value) => set('checkInVisitsRequired', value as T['checkInVisitsRequired'])} />
        <NumberField label="Reward points" value={form.checkInRewardPoints} min={min} onChange={(value) => set('checkInRewardPoints', value as T['checkInRewardPoints'])} />
        <TextField label="Reward name" value={form.checkInRewardName} onChange={(event) => set('checkInRewardName', event.target.value as T['checkInRewardName'])} />
      </>
    )
  }
  if (form.type === 'PURCHASE_FREQUENCY') {
    return (
      <>
        <SelectField label="Frequency basis" value={form.purchaseFrequencyBasis} options={PURCHASE_FREQUENCY_BASES} onChange={(value) => set('purchaseFrequencyBasis', value as T['purchaseFrequencyBasis'])} />
        {form.purchaseFrequencyBasis === 'COUNT' ? (
          <NumberField label="Purchase count" value={form.purchaseFrequencyCount} min={min} onChange={(value) => set('purchaseFrequencyCount', value as T['purchaseFrequencyCount'])} />
        ) : (
          <NumberField label="Spend target" value={form.purchaseFrequencySpendTarget} min={min} onChange={(value) => set('purchaseFrequencySpendTarget', value as T['purchaseFrequencySpendTarget'])} />
        )}
        <NumberField label="Window (days)" value={form.purchaseFrequencyWindowDays} min={min} onChange={(value) => set('purchaseFrequencyWindowDays', value as T['purchaseFrequencyWindowDays'])} />
        <NumberField label="Reward points" value={form.purchaseFrequencyRewardPoints} min={min} onChange={(value) => set('purchaseFrequencyRewardPoints', value as T['purchaseFrequencyRewardPoints'])} />
      </>
    )
  }
  if (form.type === 'REFERRAL') {
    return (
      <>
        <NumberField label="Referrer reward points" value={form.referralReferrerRewardPoints} min={min} onChange={(value) => set('referralReferrerRewardPoints', value as T['referralReferrerRewardPoints'])} />
        <NumberField label="Referee reward points" value={form.referralRefereeRewardPoints} min={min} onChange={(value) => set('referralRefereeRewardPoints', value as T['referralRefereeRewardPoints'])} />
        <TextField label="Referral code prefix" value={form.referralCodePrefix} onChange={(event) => set('referralCodePrefix', event.target.value as T['referralCodePrefix'])} placeholder="e.g. VRV" />
      </>
    )
  }
  return null
}

const EMPTY_REWARD: AdminCreateRewardRequest = {
  scope: 'GLOBAL',
  storeId: null,
  name: '',
  description: '',
  pointsRequired: 0,
  rewardType: 'FREE_PRODUCT',
  catalogType: 'REWARD',
  imageUri: null,
  expirationDate: null,
  usageLimit: 1,
  availableQuantity: 0,
  activeStatus: true,
  couponCode: null,
  couponBenefitType: null,
  couponDiscountPercent: null,
  couponBonusPoints: null,
  couponRewardId: null,
}

function rewardDetailToForm(reward: AdminRewardDetail): AdminCreateRewardRequest {
  return {
    scope: reward.scope === 'BRANCH' || reward.storeId ? 'BRANCH' : 'GLOBAL',
    storeId: reward.storeId,
    name: reward.name,
    description: reward.description,
    pointsRequired: reward.pointsRequired,
    rewardType: reward.rewardType,
    catalogType: reward.catalogType,
    imageUri: reward.imageUri || null,
    expirationDate: reward.expirationDate || null,
    usageLimit: reward.usageLimit,
    availableQuantity: reward.availableQuantity,
    activeStatus: reward.activeStatus,
    couponCode: reward.couponCode,
    couponBenefitType: reward.couponBenefitType,
    couponDiscountPercent: reward.couponDiscountPercent,
    couponBonusPoints: reward.couponBonusPoints,
    couponRewardId: reward.couponRewardId,
  }
}

function rewardFormError(form: AdminCreateRewardRequest, isCreate: boolean): string | null {
  if (form.name.trim().length === 0) return 'Name is required.'
  if (isCreate && form.scope === 'BRANCH' && !form.storeId) return 'Select a branch for a branch-scoped reward.'
  if (form.usageLimit < 1) return 'Usage limit must be at least 1.'
  if (form.availableQuantity < 0) return 'Available quantity cannot be negative.'
  if (form.expirationDate && form.expirationDate < todayIso()) return 'Expiration date must be today or in the future.'
  if (form.catalogType === 'COUPON') {
    if (!form.couponCode || form.couponCode.trim().length === 0) return 'Coupon code is required.'
    if (form.couponBenefitType === 'DISCOUNT_PERCENT' && (form.couponDiscountPercent ?? 0) <= 0) return 'Enter a discount percentage.'
    if (form.couponBenefitType === 'BONUS_POINTS' && (form.couponBonusPoints ?? 0) <= 0) return 'Enter the bonus points amount.'
    if (form.couponBenefitType === 'REWARD' && !form.couponRewardId) return 'Select the linked reward.'
  }
  return null
}

export function RewardFormDialog({
  merchantId,
  open,
  reward,
  onClose,
}: {
  merchantId: string
  open: boolean
  reward: AdminRewardSummary | null
  onClose: () => void
}) {
  const isCreate = reward === null
  const createMutation = useCreateReward(merchantId)
  const updateMutation = useUpdateReward(merchantId)
  const detailQuery = useRewardDetail(merchantId, open && reward ? reward.id : null)
  const detail = detailQuery.data
  const [form, setForm] = useState<AdminCreateRewardRequest>(EMPTY_REWARD)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seed, setSeed] = useState<string | null>(null)

  if (open && isCreate && seed !== 'create') {
    setSeed('create')
    setForm(EMPTY_REWARD)
    setErrorText(null)
  }
  if (open && detail && seed !== detail.id) {
    setSeed(detail.id)
    setForm(rewardDetailToForm(detail))
    setErrorText(null)
  }
  if (!open && seed !== null) setSeed(null)

  function set<K extends keyof AdminCreateRewardRequest>(field: K, value: AdminCreateRewardRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const loadingDetail = !isCreate && detailQuery.isLoading
  const validation = rewardFormError(form, isCreate)
  const pending = createMutation.isPending || updateMutation.isPending

  function save() {
    if (validation) {
      setErrorText(validation)
      return
    }
    setErrorText(null)
    const couponFields = form.catalogType === 'COUPON'
      ? {
          couponCode: form.couponCode,
          couponBenefitType: form.couponBenefitType,
          couponDiscountPercent: form.couponBenefitType === 'DISCOUNT_PERCENT' ? form.couponDiscountPercent : null,
          couponBonusPoints: form.couponBenefitType === 'BONUS_POINTS' ? form.couponBonusPoints : null,
          couponRewardId: form.couponBenefitType === 'REWARD' ? form.couponRewardId : null,
        }
      : { couponCode: null, couponBenefitType: null, couponDiscountPercent: null, couponBonusPoints: null, couponRewardId: null }

    if (reward) {
      const request: AdminUpdateRewardRequest = {
        storeId: form.storeId,
        name: form.name.trim(),
        description: form.description,
        pointsRequired: form.pointsRequired,
        rewardType: form.rewardType,
        catalogType: form.catalogType,
        imageUri: form.imageUri,
        expirationDate: form.expirationDate,
        usageLimit: form.usageLimit,
        availableQuantity: form.availableQuantity,
        activeStatus: form.activeStatus,
        ...couponFields,
        expectedVersion: detail?.version ?? 0,
      }
      updateMutation.mutate(
        { rewardId: reward.id, request },
        { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Update failed')) },
      )
      return
    }
    const request: AdminCreateRewardRequest = {
      ...form,
      name: form.name.trim(),
      storeId: form.scope === 'BRANCH' ? form.storeId : null,
      ...couponFields,
    }
    createMutation.mutate(request, { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Create failed')) })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? 'Add reward' : 'Edit reward'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button isLoading={pending} disabled={validation !== null || loadingDetail} onClick={save}>
            {isCreate ? 'Create reward' : 'Save changes'}
          </Button>
        </>
      }
    >
      {loadingDetail ? (
        <div className="py-10">
          <Spinner label="Loading reward…" />
        </div>
      ) : (
      <div className="flex flex-col gap-3">
        {isCreate ? <SelectField label="Scope" value={form.scope} options={REWARD_SCOPES} onChange={(value) => set('scope', value)} /> : null}
        {isCreate && form.scope === 'BRANCH' ? (
          <StoreSelectField merchantId={merchantId} value={form.storeId ?? ''} onChange={(value) => set('storeId', value || null)} />
        ) : null}
        <TextField label="Name" value={form.name} onChange={(event) => set('name', event.target.value)} />
        <TextField label="Description" value={form.description} onChange={(event) => set('description', event.target.value)} />
        <SelectField label="Reward type" value={form.rewardType} options={REWARD_TYPES} onChange={(value) => set('rewardType', value)} />
        <SelectField label="Catalog type" value={form.catalogType} options={REWARD_CATALOG_TYPES} onChange={(value) => set('catalogType', value)} />
        <TextField label="Image URL" value={form.imageUri ?? ''} onChange={(event) => set('imageUri', event.target.value || null)} placeholder="https://…" />
        {form.imageUri ? (
          <img src={form.imageUri} alt="Reward preview" className="h-28 w-full rounded-xl border border-slate-200 object-cover" />
        ) : null}
        <NumberField label="Points required" value={form.pointsRequired} min={0} onChange={(value) => set('pointsRequired', value)} />
        <NumberField label="Usage limit" value={form.usageLimit} min={1} onChange={(value) => set('usageLimit', value)} />
        <NumberField label="Available quantity" value={form.availableQuantity} min={0} onChange={(value) => set('availableQuantity', value)} />
        <TextField
          label="Expiration date"
          type="date"
          min={todayIso()}
          value={form.expirationDate ?? ''}
          onChange={(event) => set('expirationDate', event.target.value || null)}
        />
        <ToggleRow label="Active" checked={form.activeStatus} onChange={(checked) => set('activeStatus', checked)} />

        {form.catalogType === 'COUPON' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <TextField label="Coupon code" value={form.couponCode ?? ''} onChange={(event) => set('couponCode', event.target.value || null)} />
            <SelectField
              label="Coupon benefit"
              value={form.couponBenefitType ?? 'DISCOUNT_PERCENT'}
              options={COUPON_BENEFIT_TYPES}
              onChange={(value) => set('couponBenefitType', value)}
            />
            {form.couponBenefitType === 'DISCOUNT_PERCENT' ? (
              <NumberField label="Discount percent" value={form.couponDiscountPercent ?? 0} min={0} onChange={(value) => set('couponDiscountPercent', value)} />
            ) : null}
            {form.couponBenefitType === 'BONUS_POINTS' ? (
              <NumberField label="Bonus points" value={form.couponBonusPoints ?? 0} min={0} onChange={(value) => set('couponBonusPoints', value)} />
            ) : null}
            {form.couponBenefitType === 'REWARD' ? (
              <RewardSelectField merchantId={merchantId} value={form.couponRewardId ?? ''} onChange={(value) => set('couponRewardId', value || null)} />
            ) : null}
          </div>
        ) : null}

        <FormError text={errorText} />
      </div>
      )}
    </Modal>
  )
}

export function RewardInventoryDialog({
  merchantId,
  reward,
  onClose,
}: {
  merchantId: string
  reward: AdminRewardSummary | null
  onClose: () => void
}) {
  const mutation = useAdjustRewardInventory(merchantId)
  const [deltaText, setDeltaText] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (reward && reward.id !== seededId) {
    setSeededId(reward.id)
    setDeltaText('')
    setErrorText(null)
  }

  const tracked = reward?.inventoryTracked ?? true
  const delta = Number(deltaText)
  const valid = tracked && deltaText.trim().length > 0 && Number.isInteger(delta) && delta !== 0
  const projected = reward ? reward.availableQuantity + (Number.isFinite(delta) ? delta : 0) : 0

  function save() {
    if (!reward || !valid) return
    setErrorText(null)
    mutation.mutate(
      { rewardId: reward.id, request: { delta } },
      { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Adjustment failed')) },
    )
  }

  return (
    <Modal
      open={reward !== null}
      onClose={onClose}
      title="Adjust inventory"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!valid} onClick={save}>
            Apply adjustment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-slate-600">
        {tracked ? (
          <>
            <p>
              Current available quantity is <span className="mono font-semibold text-slate-900">{reward?.availableQuantity ?? 0}</span>. Enter a positive delta to add
              stock or a negative delta to remove it.
            </p>
            <TextField
              label="Delta"
              type="number"
              inputMode="numeric"
              value={deltaText}
              onChange={(event) => setDeltaText(event.target.value)}
              placeholder="e.g. 25 or -10"
              errorText={deltaText.trim().length > 0 && !valid ? 'Enter a non-zero whole number' : undefined}
            />
            {valid ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                New quantity: <span className="mono font-semibold text-slate-900">{projected}</span>
              </p>
            ) : null}
            <FormError text={errorText} />
          </>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Inventory isn’t tracked for this reward, so there’s no stock level to adjust.
          </p>
        )}
      </div>
    </Modal>
  )
}

interface GiveawayForm {
  name: string
  description: string
  giveawayType: string
  bonusPointsAmount: number
  discountPercent: number
  rewardId: string
  sendMode: string
  scheduledDate: string
  expirationEnabled: boolean
  expirationDate: string
  audienceAll: boolean
  audienceGender: string
  audienceAgeMin: number
  audienceAgeMax: number
  audienceTierName: string
  active: boolean
}

const EMPTY_GIVEAWAY: GiveawayForm = {
  name: '',
  description: '',
  giveawayType: 'BONUS_POINTS',
  bonusPointsAmount: 0,
  discountPercent: 0,
  rewardId: '',
  sendMode: 'IMMEDIATE',
  scheduledDate: todayIso(),
  expirationEnabled: false,
  expirationDate: todayIso(),
  audienceAll: true,
  audienceGender: 'ALL',
  audienceAgeMin: 0,
  audienceAgeMax: 0,
  audienceTierName: '',
  active: true,
}

function campaignDetailToGiveawayForm(campaign: AdminCampaignDetail): GiveawayForm {
  const scheduled = campaign.scheduledDate
    ? campaign.scheduledDate.slice(0, 10)
    : campaign.startDate
      ? campaign.startDate.slice(0, 10)
      : todayIso()
  return {
    name: campaign.name,
    description: campaign.description,
    giveawayType: campaign.giveawayType || 'BONUS_POINTS',
    bonusPointsAmount: campaign.bonusPointsAmount ?? 0,
    discountPercent: campaign.discountPercent ?? 0,
    rewardId: campaign.rewardId ?? '',
    sendMode: campaign.sendMode || 'IMMEDIATE',
    scheduledDate: scheduled,
    expirationEnabled: campaign.expirationEnabled,
    expirationDate: campaign.expirationDate ? campaign.expirationDate.slice(0, 10) : todayIso(),
    audienceAll: campaign.audienceAll,
    audienceGender: campaign.audienceGender || 'ALL',
    audienceAgeMin: campaign.audienceAgeMin ?? 0,
    audienceAgeMax: campaign.audienceAgeMax ?? 0,
    audienceTierName: campaign.audienceTierName,
    active: campaign.active,
  }
}

function promotionTypeFor(giveawayType: string): string {
  if (giveawayType === 'BONUS_POINTS') return 'BONUS_POINTS'
  if (giveawayType === 'DISCOUNT_PERCENT') return 'PERCENT_DISCOUNT'
  return 'FREE_ITEM'
}

function promotionValueFor(form: GiveawayForm): number {
  if (form.giveawayType === 'BONUS_POINTS') return form.bonusPointsAmount
  if (form.giveawayType === 'DISCOUNT_PERCENT') return form.discountPercent
  return 1
}

function giveawayFormError(form: GiveawayForm): string | null {
  if (form.name.trim().length === 0) return 'Name is required.'
  if (form.description.trim().length === 0) return 'Description is required.'
  if (form.giveawayType === 'BONUS_POINTS' && form.bonusPointsAmount <= 0) return 'Enter the bonus points amount.'
  if (form.giveawayType === 'DISCOUNT_PERCENT' && form.discountPercent <= 0) return 'Enter a discount percentage.'
  if ((form.giveawayType === 'REWARD' || form.giveawayType === 'COUPON') && form.rewardId.length === 0) return 'Select a reward to give away.'
  if (form.sendMode === 'SCHEDULED' && form.scheduledDate.trim().length === 0) return 'Choose a scheduled date.'
  if (form.expirationEnabled && form.expirationDate.trim().length === 0) return 'Choose an expiration date.'
  return null
}

function buildGiveawayRequest(form: GiveawayForm, expectedVersion: number): AdminCampaignFullRequest {
  const startDate = form.sendMode === 'IMMEDIATE' ? todayIso() : form.scheduledDate
  const endDate = form.expirationEnabled ? form.expirationDate : farFutureIso(startDate)
  const usesReward = form.giveawayType === 'REWARD' || form.giveawayType === 'COUPON'
  return {
    scope: 'GLOBAL',
    storeId: null,
    expectedVersion,
    name: form.name.trim(),
    description: form.description.trim(),
    imageUri: null,
    startDate,
    endDate,
    promotionType: promotionTypeFor(form.giveawayType),
    promotionValue: promotionValueFor(form),
    minimumPurchaseAmount: 0,
    usageLimit: 0,
    promoCode: null,
    visibility: 'BUSINESS_ONLY',
    boostLevel: null,
    paymentFlowEnabled: false,
    active: form.active,
    segments: [],
    targetSegment: null,
    targetDescription: null,
    sendMode: form.sendMode,
    scheduledDate: form.sendMode === 'SCHEDULED' ? form.scheduledDate : null,
    expirationEnabled: form.expirationEnabled,
    expirationDate: form.expirationEnabled ? form.expirationDate : null,
    giveawayType: form.giveawayType,
    bonusPointsAmount: form.giveawayType === 'BONUS_POINTS' ? form.bonusPointsAmount : null,
    discountPercent: form.giveawayType === 'DISCOUNT_PERCENT' ? form.discountPercent : null,
    rewardId: usesReward ? form.rewardId || null : null,
    audienceAll: form.audienceAll,
    audienceGender: form.audienceGender,
    audienceAgeMin: form.audienceAll ? null : form.audienceAgeMin || null,
    audienceAgeMax: form.audienceAll ? null : form.audienceAgeMax || null,
    audienceTierName: form.audienceAll ? null : form.audienceTierName || null,
  }
}

export function GiveawayFormDialog({
  merchantId,
  open,
  campaign,
  onClose,
}: {
  merchantId: string
  open: boolean
  campaign: AdminCampaign | null
  onClose: () => void
}) {
  const isCreate = campaign === null
  const createMutation = useCreateCampaign(merchantId)
  const updateMutation = useUpdateCampaignFull(merchantId)
  const detailQuery = useCampaignDetail(merchantId, open && campaign ? campaign.id : null)
  const detail = detailQuery.data
  const [form, setForm] = useState<GiveawayForm>(EMPTY_GIVEAWAY)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seed, setSeed] = useState<string | null>(null)

  if (open && isCreate && seed !== 'create') {
    setSeed('create')
    setForm(EMPTY_GIVEAWAY)
    setErrorText(null)
  }
  if (open && detail && seed !== detail.id) {
    setSeed(detail.id)
    setForm(campaignDetailToGiveawayForm(detail))
    setErrorText(null)
  }
  if (!open && seed !== null) setSeed(null)

  function set<K extends keyof GiveawayForm>(field: K, value: GiveawayForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const loadingDetail = !isCreate && detailQuery.isLoading
  const validation = giveawayFormError(form)
  const pending = createMutation.isPending || updateMutation.isPending

  function save() {
    if (validation) {
      setErrorText(validation)
      return
    }
    setErrorText(null)
    const request = buildGiveawayRequest(form, detail?.version ?? 0)
    if (campaign) {
      updateMutation.mutate(
        { campaignId: campaign.id, request },
        { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Update failed')) },
      )
      return
    }
    createMutation.mutate(request, { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Create failed')) })
  }

  const usesReward = form.giveawayType === 'REWARD' || form.giveawayType === 'COUPON'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? 'Add giveaway' : 'Edit giveaway'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button isLoading={pending} disabled={validation !== null || loadingDetail} onClick={save}>
            {isCreate ? 'Create giveaway' : 'Save changes'}
          </Button>
        </>
      }
    >
      {loadingDetail ? (
        <div className="py-10">
          <Spinner label="Loading giveaway…" />
        </div>
      ) : (
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={form.name} onChange={(event) => set('name', event.target.value)} />
        <TextField label="Description" value={form.description} onChange={(event) => set('description', event.target.value)} />
        <SelectField label="Giveaway type" value={form.giveawayType} options={GIVEAWAY_TYPES} onChange={(value) => set('giveawayType', value)} />
        {form.giveawayType === 'BONUS_POINTS' ? (
          <NumberField label="Bonus points" value={form.bonusPointsAmount} min={0} onChange={(value) => set('bonusPointsAmount', value)} />
        ) : null}
        {form.giveawayType === 'DISCOUNT_PERCENT' ? (
          <NumberField label="Discount percent" value={form.discountPercent} min={0} onChange={(value) => set('discountPercent', value)} />
        ) : null}
        {usesReward ? <RewardSelectField merchantId={merchantId} value={form.rewardId} onChange={(value) => set('rewardId', value)} /> : null}

        <SelectField label="Send mode" value={form.sendMode} options={SEND_MODES} onChange={(value) => set('sendMode', value)} />
        {form.sendMode === 'SCHEDULED' ? (
          <TextField label="Scheduled date" type="date" min={todayIso()} value={form.scheduledDate} onChange={(event) => set('scheduledDate', event.target.value)} />
        ) : null}

        <ToggleRow label="Set an expiration date" checked={form.expirationEnabled} onChange={(checked) => set('expirationEnabled', checked)} />
        {form.expirationEnabled ? (
          <TextField label="Expiration date" type="date" min={todayIso()} value={form.expirationDate} onChange={(event) => set('expirationDate', event.target.value)} />
        ) : null}

        <ToggleRow label="Send to all customers" checked={form.audienceAll} onChange={(checked) => set('audienceAll', checked)} />
        {!form.audienceAll ? (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <SelectField label="Gender" value={form.audienceGender} options={AUDIENCE_GENDERS} onChange={(value) => set('audienceGender', value)} />
            <NumberField label="Min age" value={form.audienceAgeMin} min={0} onChange={(value) => set('audienceAgeMin', value)} />
            <NumberField label="Max age" value={form.audienceAgeMax} min={0} onChange={(value) => set('audienceAgeMax', value)} />
            <TextField label="Tier name" value={form.audienceTierName} onChange={(event) => set('audienceTierName', event.target.value)} placeholder="e.g. GOLD" />
          </div>
        ) : null}

        <ToggleRow label="Active" checked={form.active} onChange={(checked) => set('active', checked)} />
        <FormError text={errorText} />
      </div>
      )}
    </Modal>
  )
}

const EMPTY_PROGRAM_CONFIG: AdminUpdateProgramConfigRequest = {
  expectedVersion: 0,
  name: '',
  description: '',
  type: 'DIGITAL_STAMP',
  scope: 'GLOBAL',
  active: true,
  tierSilverThreshold: 0,
  tierGoldThreshold: 0,
  tierVipThreshold: 0,
  tierThresholdBasis: 'POINTS',
  checkInVisitsRequired: 0,
  checkInRewardPoints: 0,
  checkInRewardName: '',
  purchaseFrequencyBasis: 'COUNT',
  purchaseFrequencyCount: 0,
  purchaseFrequencySpendTarget: 0,
  purchaseFrequencyWindowDays: 0,
  purchaseFrequencyRewardPoints: 0,
  referralReferrerRewardPoints: 0,
  referralRefereeRewardPoints: 0,
  referralCodePrefix: '',
  storeId: null,
}

function programDetailToConfigForm(program: AdminProgramDetail): AdminUpdateProgramConfigRequest {
  return {
    expectedVersion: program.version,
    name: program.name,
    description: program.description,
    type: program.type,
    scope: program.scope === 'GLOBAL' ? 'GLOBAL' : 'BRANCH',
    active: program.active,
    tierSilverThreshold: program.tierSilverThreshold,
    tierGoldThreshold: program.tierGoldThreshold,
    tierVipThreshold: program.tierVipThreshold,
    tierThresholdBasis: program.tierThresholdBasis || 'POINTS',
    checkInVisitsRequired: program.checkInVisitsRequired,
    checkInRewardPoints: program.checkInRewardPoints,
    checkInRewardName: program.checkInRewardName,
    purchaseFrequencyBasis: program.purchaseFrequencyBasis || 'COUNT',
    purchaseFrequencyCount: program.purchaseFrequencyCount,
    purchaseFrequencySpendTarget: program.purchaseFrequencySpendTarget,
    purchaseFrequencyWindowDays: program.purchaseFrequencyWindowDays,
    purchaseFrequencyRewardPoints: program.purchaseFrequencyRewardPoints,
    referralReferrerRewardPoints: program.referralReferrerRewardPoints,
    referralRefereeRewardPoints: program.referralRefereeRewardPoints,
    referralCodePrefix: program.referralCodePrefix,
    storeId: program.storeId,
  }
}

export function ProgramConfigDialog({
  merchantId,
  program,
  onClose,
}: {
  merchantId: string
  program: AdminProgram | null
  onClose: () => void
}) {
  const mutation = useUpdateProgramConfig(merchantId)
  const detailQuery = useProgramDetail(merchantId, program ? program.id : null)
  const detail = detailQuery.data
  const [form, setForm] = useState<AdminUpdateProgramConfigRequest>(EMPTY_PROGRAM_CONFIG)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (!program && seededId !== null) setSeededId(null)
  if (program && detail && seededId !== detail.id) {
    setSeededId(detail.id)
    setForm(programDetailToConfigForm(detail))
    setErrorText(null)
  }

  function set<K extends keyof AdminUpdateProgramConfigRequest>(field: K, value: AdminUpdateProgramConfigRequest[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'type' && value === 'TIER') {
        next.scope = 'GLOBAL'
        next.storeId = null
      }
      return next
    })
  }

  const loadingDetail = program !== null && detailQuery.isLoading
  const isTier = form.type === 'TIER'
  const validation = programConfigError(form)

  function save() {
    if (!program || validation) {
      setErrorText(validation)
      return
    }
    setErrorText(null)
    const branchScoped = !isTier && form.scope === 'BRANCH'
    mutation.mutate(
      {
        programId: program.id,
        request: {
          ...form,
          name: form.name.trim(),
          referralCodePrefix: form.referralCodePrefix.trim(),
          scope: isTier ? 'GLOBAL' : form.scope,
          storeId: branchScoped ? form.storeId : null,
        },
      },
      { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Update failed')) },
    )
  }

  return (
    <Modal
      open={program !== null}
      onClose={onClose}
      title="Edit program configuration"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={validation !== null || loadingDetail} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      {loadingDetail ? (
        <div className="py-10">
          <Spinner label="Loading program…" />
        </div>
      ) : (
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={form.name} onChange={(event) => set('name', event.target.value)} />
        <TextField label="Description" value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Optional" />
        <SelectField label="Type" value={form.type} options={PROGRAM_TYPES} onChange={(value) => set('type', value)} />
        {isTier ? null : (
          <>
            <SelectField label="Scope" value={form.scope} options={PROGRAM_SCOPES} onChange={(value) => set('scope', value)} />
            {form.scope === 'BRANCH' ? (
              <StoreSelectField merchantId={merchantId} value={form.storeId ?? ''} onChange={(value) => set('storeId', value || null)} />
            ) : null}
          </>
        )}
        <ToggleRow label="Active" checked={form.active} onChange={(checked) => set('active', checked)} />

        <ProgramTypeFields form={form} set={set} numberMin />

        <FormError text={errorText} />
      </div>
      )}
    </Modal>
  )
}

interface LoyaltyPointsForm {
  pointsSpendStepAmount: number
  pointsAwardedPerStep: number
  pointsWelcomeBonus: number
  pointsMinimumRedeem: number
  pointsExpiryMonths: number
  pointsPerCurrencyUnit: number
}

const EMPTY_LOYALTY_POINTS: LoyaltyPointsForm = {
  pointsSpendStepAmount: 0,
  pointsAwardedPerStep: 0,
  pointsWelcomeBonus: 0,
  pointsMinimumRedeem: 0,
  pointsExpiryMonths: 0,
  pointsPerCurrencyUnit: 1,
}

function loyaltySettingsToForm(settings: AdminLoyaltyPointsSettings): LoyaltyPointsForm {
  return {
    pointsSpendStepAmount: settings.pointsSpendStepAmount,
    pointsAwardedPerStep: settings.pointsAwardedPerStep,
    pointsWelcomeBonus: settings.pointsWelcomeBonus,
    pointsMinimumRedeem: settings.pointsMinimumRedeem,
    pointsExpiryMonths: settings.pointsExpiryMonths,
    pointsPerCurrencyUnit: settings.pointsPerCurrencyUnit,
  }
}

function loyaltyPointsError(form: LoyaltyPointsForm): string | null {
  if (form.pointsSpendStepAmount <= 0) return 'Spend step must be greater than zero.'
  if (form.pointsAwardedPerStep <= 0) return 'Points per step must be greater than zero.'
  if (form.pointsMinimumRedeem <= 0) return 'Minimum redeem must be greater than zero.'
  if (form.pointsPerCurrencyUnit < 1) return 'Points per currency unit must be at least 1.'
  if (form.pointsWelcomeBonus < 0) return 'Welcome bonus cannot be negative.'
  if (form.pointsExpiryMonths < 0) return 'Expiry months cannot be negative.'
  return null
}

export function LoyaltyPointsDialog({
  merchantId,
  open,
  settings,
  onClose,
}: {
  merchantId: string
  open: boolean
  settings: AdminLoyaltyPointsSettings | null
  onClose: () => void
}) {
  const mutation = useUpdateLoyaltySettings(merchantId)
  const [form, setForm] = useState<LoyaltyPointsForm>(EMPTY_LOYALTY_POINTS)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setForm(settings && settings.configured ? loyaltySettingsToForm(settings) : EMPTY_LOYALTY_POINTS)
      setErrorText(null)
    }
  }

  function set<K extends keyof LoyaltyPointsForm>(field: K, value: LoyaltyPointsForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const validation = loyaltyPointsError(form)

  function save() {
    if (validation) {
      setErrorText(validation)
      return
    }
    setErrorText(null)
    const request: AdminUpdateLoyaltyPointsSettingsRequest = {
      expectedVersion: settings?.version ?? 0,
      pointsSpendStepAmount: form.pointsSpendStepAmount,
      pointsAwardedPerStep: form.pointsAwardedPerStep,
      pointsWelcomeBonus: form.pointsWelcomeBonus,
      pointsMinimumRedeem: form.pointsMinimumRedeem,
      pointsExpiryMonths: form.pointsExpiryMonths,
      pointsPerCurrencyUnit: form.pointsPerCurrencyUnit,
    }
    mutation.mutate(request, { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Save failed')) })
  }

  const isSetup = !settings || !settings.configured

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isSetup ? 'Set up points system' : 'Edit points system'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={validation !== null} onClick={save}>
            {isSetup ? 'Enable points system' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <NumberField label="Spend step amount" value={form.pointsSpendStepAmount} min={1} onChange={(value) => set('pointsSpendStepAmount', value)} />
        <NumberField label="Points awarded per step" value={form.pointsAwardedPerStep} min={1} onChange={(value) => set('pointsAwardedPerStep', value)} />
        <NumberField label="Points per currency unit" value={form.pointsPerCurrencyUnit} min={1} onChange={(value) => set('pointsPerCurrencyUnit', value)} />
        <NumberField label="Minimum redeem" value={form.pointsMinimumRedeem} min={1} onChange={(value) => set('pointsMinimumRedeem', value)} />
        <NumberField label="Welcome bonus" value={form.pointsWelcomeBonus} min={0} onChange={(value) => set('pointsWelcomeBonus', value)} />
        <NumberField label="Expiry months (0 = never)" value={form.pointsExpiryMonths} min={0} onChange={(value) => set('pointsExpiryMonths', value)} />
        <FormError text={errorText} />
      </div>
    </Modal>
  )
}
