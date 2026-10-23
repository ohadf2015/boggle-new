import { describe, it, expect } from 'vitest'
import {
  isLiveLexiClashHost,
  isProductionBillingDeploy,
  isSandboxCheckoutUrl,
  productionRefusesSandbox,
} from '../polarBillingRuntime'

describe('polar billing runtime', () => {
  it('treats Railway production like a production deploy, and ignores Vercel-only and PR previews', () => {
    expect(isProductionBillingDeploy({ RAILWAY_ENVIRONMENT_NAME: 'production' } as NodeJS.ProcessEnv)).toBe(true)
    expect(isProductionBillingDeploy({ VERCEL_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(true)
    expect(isProductionBillingDeploy({ RAILWAY_ENVIRONMENT_NAME: 'pr-1411' } as NodeJS.ProcessEnv)).toBe(false)
    expect(isProductionBillingDeploy({} as NodeJS.ProcessEnv)).toBe(false)
  })

  it('recognises the live host, including a port and a forwarded list', () => {
    expect(isLiveLexiClashHost('www.lexiclash.live')).toBe(true)
    expect(isLiveLexiClashHost('lexiclash.live:443')).toBe(true)
    expect(isLiveLexiClashHost('www.lexiclash.live, lexiclash.live')).toBe(true)
    expect(isLiveLexiClashHost('localhost:3000')).toBe(false)
  })

  it('flags sandbox checkout hosts and not production ones', () => {
    expect(isSandboxCheckoutUrl('https://sandbox.polar.sh/checkout/abc')).toBe(true)
    expect(isSandboxCheckoutUrl('https://polar.sh/checkout/abc')).toBe(false)
    expect(isSandboxCheckoutUrl('not a url')).toBe(false)
  })

  it('refuses sandbox on Railway production even when VERCEL_ENV is unset', () => {
    expect(productionRefusesSandbox({
      env: { RAILWAY_ENVIRONMENT_NAME: 'production', POLAR_ENVIRONMENT: 'sandbox' } as NodeJS.ProcessEnv,
    })).toBe(true)
    expect(productionRefusesSandbox({
      env: { POLAR_ENVIRONMENT: 'sandbox' } as NodeJS.ProcessEnv,
    })).toBe(false)
  })

  it('refuses a sandbox URL handed back on the live host', () => {
    expect(productionRefusesSandbox({
      env: { POLAR_ENVIRONMENT: 'production' } as NodeJS.ProcessEnv,
      hosts: ['www.lexiclash.live'],
      checkoutUrl: 'https://sandbox.polar.sh/checkout/abc',
    })).toBe(true)
    expect(productionRefusesSandbox({
      env: { POLAR_ENVIRONMENT: 'production' } as NodeJS.ProcessEnv,
      hosts: ['localhost:3000'],
      checkoutUrl: 'https://polar.sh/checkout/abc',
    })).toBe(false)
  })

  it('lets a PR preview keep an explicit sandbox checkout', () => {
    expect(productionRefusesSandbox({
      env: { RAILWAY_ENVIRONMENT_NAME: 'pr-12', POLAR_ENVIRONMENT: 'sandbox' } as NodeJS.ProcessEnv,
      hosts: ['boggle-new-pr-12.up.railway.app'],
      checkoutUrl: 'https://sandbox.polar.sh/checkout/abc',
    })).toBe(false)
  })
})
