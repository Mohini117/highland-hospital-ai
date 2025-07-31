const base =
  process.env.PAYPAL_API_BASE_URL || "https://api-m.sandbox.paypal.com";

async function generateAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal client ID or secret is missing from environment variables."
    );
  }

  // Encode credentials for Basic Authentication
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
  });

  const data = await handleResponse(response);
  return data.access_token;
}

async function handleResponse(response: Response) {
  if (response.ok) {
    return response.json();
  } else {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

export const paypal = {
  createOder: async function createOder(price: number) {
    // 1. Get an access token
    const accessToken = await generateAccessToken();

    // 2. Set up the API endpoint and payload
    const url = `${base}/v2/checkout/orders`;
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: price.toString(),
          },
        },
      ],
    };

    // 3. Make the API call to create the order
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    // 4. Handle the response and return the data
    return handleResponse(response);
  },
  capturePayment: async function capturePayment(orderId: string) {
    // 1. Get a new access token
    const accessToken = await generateAccessToken();

    // 2. Construct the capture URL from the provided order ID
    const url = `${base}/v2/checkout/orders/${orderId}/capture`;

    // 3. Make the API call to capture the payment
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 4. Handle the response and return the data
    return handleResponse(response);
  },
};
