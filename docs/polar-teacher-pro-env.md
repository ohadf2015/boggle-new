# Teacher Pro Polar env

Checkout: `POST /api/subscription/checkout`. Completion: `POST /api/webhook/polar`.
A missing var must name itself in a non-2xx body. Do not ack 200 and grant nothing.

## Required

| Var | Used by | If missing or wrong |
| --- | --- | --- |
| `POLAR_ACCESS_TOKEN` | checkout URL | 503, `missing: ["POLAR_ACCESS_TOKEN"]` |
| `POLAR_PRO_PRODUCT_ID` | checkout URL and webhook tier map | checkout 503 naming the var. Webhook 503 on any event that writes a tier (`subscription.*` except `revoked`, `order.created`/`order.paid`, checkout success). A 200 here used to map every product to `free` and drop the payment. |
| `POLAR_WEBHOOK_SECRET` | webhook signature | 503 naming the var. Polar retries 5xx, not 401. A present-but-wrong secret is 401 `Invalid signature` and grants nothing. |
| `POLAR_ENVIRONMENT` | checkout API host | `production` unless the value is exactly `sandbox`. Unset used to hit `sandbox-api.polar.sh` and collect no money. `VERCEL_ENV=production` plus `POLAR_ENVIRONMENT=sandbox` is 503 naming `POLAR_ENVIRONMENT`. |

The access token, product id, and webhook secret must all come from the same Polar environment as `POLAR_ENVIRONMENT`. A production token with a sandbox webhook secret 401s every delivery.

## Signature

`PolarClient.validateWebhookSignature` reads `POLAR_WEBHOOK_SECRET` only. Polar issues `whsec_<base64>`. The HMAC key is the base64 payload decoded to raw bytes (Standard Webhooks). Signed content is `webhook-id.webhook-timestamp.rawBody`. Header is `webhook-signature: v1,<base64>`.

## Events the endpoint must subscribe to

- `checkout.updated` (status `succeeded` is Polar's current completion event) and `checkout.completed` (older name; also granted)
- `subscription.active` (still the primary lifecycle write and `checkout_complete` telemetry)
- `order.paid` (belt-and-braces grant; does not wipe provider fields)

`checkout.updated` with status `open` or `expired` does not grant. A success event grants Teacher Pro via `grantProFromCheckout` and does not null `current_period_end` on a row `subscription.active` already wrote.

Webhook URL: `https://<app-domain>/api/webhook/polar`
