// Refund & Cancellation Policy content — server-renderable for SEO

export type RefundSection = {
  title: string;
  content: string;
};

export type RefundContent = {
  title: string;
  intro: string;
  sections: RefundSection[];
};

export const contentByLocale: Record<string, RefundContent> = {
  en: {
    title: 'Refund & Cancellation Policy',
    intro: 'This policy explains cancellations and refunds for LexiClash Pro subscriptions, operated by Ohad Fisher, an individual sole proprietor based in Israel. Payments and refunds are processed by Lemon Squeezy as Merchant of Record.',
    sections: [
      {
        title: '1. Cancelling your subscription',
        content: 'You can cancel any time from the billing/customer portal linked in your account and in your order confirmation email. Cancellation stops future automatic renewals. Your Pro access continues until the end of the current paid period — you are not cut off immediately. After the period ends, your account reverts to the free plan. Grandfathered content you created before enforcement is retained; you simply cannot exceed free-plan limits going forward.',
      },
      {
        title: '2. Refunds',
        content: 'Subscriptions are generally billed in advance and are non-refundable for periods already started, except where required by law or approved as a goodwill exception. Statutory rights are not affected. If you are a consumer in the EU/EEA, UK, Israel, or another jurisdiction with a cooling-off or cancellation right, you may be entitled to a refund within the legal window; those rights prevail over this policy. Duplicate charges, billing errors, or charges you did not authorize will be refunded.',
      },
      {
        title: '3. How to request a refund',
        content: 'Contact lexiclash.game@gmail.com with your order details, or use the support/contact option in Lemon Squeezy\'s order confirmation email. Because Lemon Squeezy is the Merchant of Record, approved refunds are issued through Lemon Squeezy to your original payment method.',
      },
      {
        title: '4. Free trials & promotions',
        content: 'If a free trial or promotional price is offered, its specific terms are shown at signup and control for that offer (e.g. when billing begins and at what price it renews).',
      },
      {
        title: '5. Price changes',
        content: 'We may change subscription prices on prospective notice. Changes apply to renewals after the notice period; you can cancel before a change takes effect.',
      },
      {
        title: '6. Contact',
        content: 'Billing and refund questions: lexiclash.game@gmail.com (LexiClash, operated by Ohad Fisher, Israel).',
      },
    ],
  },
};
