/**
 * Paddle Billing API client helpers.
 * API base is https://api.paddle.com (key determines sandbox vs live).
 */

export function getPaddleApiKey(): string {
  const key = process.env.PADDLE_API_KEY;
  if (!key) {
    throw new Error("PADDLE_API_KEY is not configured");
  }
  return key;
}

export function getPaddleApiBase(): string {
  if (process.env.PADDLE_API_BASE) {
    return process.env.PADDLE_API_BASE;
  }
  const key = process.env.PADDLE_API_KEY ?? "";
  if (key.includes("_sdbx_")) {
    return "https://sandbox-api.paddle.com";
  }
  return "https://api.paddle.com";
}

export async function createPaddleTransaction(params: {
  priceId: string;
  customData?: Record<string, string>;
}): Promise<{ transactionId: string; checkoutUrl: string }> {
  const apiKey = getPaddleApiKey();
  const base = getPaddleApiBase();

  const body = {
    items: [{ price_id: params.priceId, quantity: 1 }],
    collection_mode: "automatic" as const,
    ...(params.customData && Object.keys(params.customData).length > 0
      ? { custom_data: params.customData }
      : {}),
  };

  const response = await fetch(`${base}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMessage: string;
    try {
      const errJson = JSON.parse(errText) as { error?: { detail?: string } };
      errMessage = errJson.error?.detail ?? errText;
    } catch {
      errMessage = errText;
    }
    throw new Error(`Paddle API error: ${response.status} ${errMessage}`);
  }

  const data = (await response.json()) as {
    data: {
      id: string;
      checkout?: { url: string } | null;
    };
  };

  const transactionId = data.data.id;
  const checkoutUrl = data.data.checkout?.url;

  if (!transactionId || !checkoutUrl) {
    throw new Error("Paddle transaction response missing id or checkout.url");
  }

  return { transactionId, checkoutUrl };
}

export async function fetchPaddleCustomerEmail(
  customerId: string
): Promise<string | null> {
  try {
    const apiKey = getPaddleApiKey();
    const base = getPaddleApiBase();

    const response = await fetch(`${base}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return null;

    const result = (await response.json()) as {
      data: { email?: string };
    };

    return result.data.email ?? null;
  } catch {
    return null;
  }
}
