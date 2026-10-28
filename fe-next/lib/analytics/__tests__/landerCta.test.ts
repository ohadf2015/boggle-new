import { describe, expect, it } from 'vitest';
import {
  EDUCATION_LANDER_RE_SOURCE,
  isEducationLanderPath,
  landerCtaCaptureBody,
  readCampaignUtms,
} from '../landerCta';

describe('education lander CTA beacon', () => {
  it('matches locale education landers and not the rest of the site', () => {
    expect(isEducationLanderPath('/he/education')).toBe(true);
    expect(isEducationLanderPath('/he/education/')).toBe(true);
    expect(isEducationLanderPath('/education/for-schools')).toBe(true);
    expect(isEducationLanderPath('/en/education/access')).toBe(true);
    expect(isEducationLanderPath('/he')).toBe(false);
    expect(isEducationLanderPath('/he/teacher')).toBe(false);
    expect(isEducationLanderPath('/daily')).toBe(false);
  });

  it('reads campaign utms from the URL only, clipped', () => {
    expect(readCampaignUtms('?utm_source=fb&utm_medium=paid&utm_campaign=52619629920784')).toEqual({
      utm_source: 'fb',
      utm_medium: 'paid',
      utm_campaign: '52619629920784',
    });
    expect(readCampaignUtms('').utm_campaign).toBe('');
    expect(readCampaignUtms(`?utm_source=${'x'.repeat(300)}`).utm_source).toHaveLength(200);
  });

  it('sends an aggregate event with a caller-supplied throwaway id and no storage keys', () => {
    const body = JSON.parse(landerCtaCaptureBody({
      apiKey: 'phc_test',
      distinctId: 'throwaway',
      path: '/he/education',
      ctaId: 'signup',
      search: '?utm_source=ig&utm_medium=paid&utm_campaign=52619629920784',
    }));
    expect(body.event).toBe('lander_cta_clicked');
    expect(body.distinct_id).toBe('throwaway');
    expect(body.properties).toMatchObject({
      path: '/he/education',
      cta_id: 'signup',
      utm_source: 'ig',
      utm_medium: 'paid',
      utm_campaign: '52619629920784',
      $lib: 'rum-inline',
    });
    expect(JSON.stringify(body)).not.toMatch(/lc_rum/);
  });

  it('keeps the path regex in one place for the inline script', () => {
    expect(new RegExp(EDUCATION_LANDER_RE_SOURCE, 'i').test('/he/education')).toBe(true);
  });
});
