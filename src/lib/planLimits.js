import { PLANS } from './stripe'

export function isAtLimit(plan, resource, currentCount) {
  const limit = PLANS[plan]?.limits?.[resource]
  if (limit === null || limit === undefined) return false
  return currentCount >= limit
}

export function getLimit(plan, resource) {
  return PLANS[plan]?.limits?.[resource] ?? null
}

export function canUseFeature(plan, feature) {
  const val = PLANS[plan]?.limits?.[feature]
  if (typeof val === 'boolean') return val
  return val !== 0
}
