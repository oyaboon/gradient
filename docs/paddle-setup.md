# Paddle setup (Vercel + Dashboard)

## Environment variables (Vercel)

In Vercel project **Settings > Environment variables** set:

| Variable | Description |
|----------|-------------|
| `PADDLE_API_KEY` | Server API key from Paddle > Developer tools > Authentication (use live key for production). |
| `PADDLE_PRICE_ID` | Price ID (e.g. `pri_01km0h8kk3saqh4cp6pdj29gwh`) from Product > Price in Paddle. |
| `PADDLE_WEBHOOK_SECRET` | Endpoint secret from Paddle > Developer tools > Notifications > your webhook destination. |
| `APP_URL` | Your app URL (e.g. `https://your-app.vercel.app`). |
| `DATABASE_URL` | Already set if Neon is connected in Vercel Storage. |

Optional: `PADDLE_API_BASE` (default `https://api.paddle.com`). Sandbox uses the same base URL; the key (`sdbx_` vs `live_`) determines the environment.

## Paddle Dashboard

1. **Checkout success URL**  
   In Paddle > Checkout (or Checkout settings), set the success URL so that after payment the customer is sent to your app with the transaction ID, e.g.  
   `https://your-app.vercel.app/checkout/success?transaction_id={transaction_id}`  
   Use the placeholder your dashboard provides for the transaction ID (e.g. `{transaction_id}` or similar).

2. **Webhook**  
   - Developer tools > Notifications > Add destination (URL).  
   - URL: `https://your-app.vercel.app/api/paddle/webhook`  
   - Subscribe to: `transaction.completed`, `adjustment.updated`.  
   - Copy the **endpoint secret** into `PADDLE_WEBHOOK_SECRET`.

3. **Database migration**  
   Run the new migration on your Neon DB (e.g. from Vercel or locally with `DATABASE_URL` set to Neon):

   ```bash
   npx prisma migrate deploy
   ```

## Testing before launch

1. **Apply migration** (with Neon `DATABASE_URL` set):
   ```bash
   npx prisma migrate deploy
   ```

2. **Sandbox checkout**
   - Set `PADDLE_API_KEY` (sandbox), `PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`, `APP_URL` in env.
   - In Paddle sandbox: set webhook URL to your public URL (e.g. ngrok for local) `https://<your-host>/api/paddle/webhook`; subscribe to `transaction.completed`, `adjustment.updated`.
   - Set success URL in Paddle to `https://<your-host>/checkout/success?transaction_id={transaction_id}` (use the placeholder your dashboard shows).
   - Click “Buy” in the app → complete payment with Paddle test card → confirm redirect to success page and that the key appears (after webhook is received).

3. **Idempotency**
   - Resend the same `transaction.completed` webhook (e.g. from Paddle notification logs); the license must not be duplicated.

4. **Refund** (optional)
   - In Paddle sandbox create a refund for the test transaction; confirm `adjustment.updated` is sent and the license status becomes `refunded`; success page or by-transaction should reflect it.
