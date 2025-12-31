declare module '@paypal/checkout-server-sdk' {
  namespace core {
    class PayPalHttpClient {
      constructor(environment: SandboxEnvironment | LiveEnvironment);
      execute<T = PayPalOrderResult>(request: unknown): Promise<{ result: T }>;
    }

    class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string);
    }

    class LiveEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
  }

  namespace orders {
    class OrdersCreateRequest {
      prefer(preference: string): void;
      requestBody(body: {
        intent: string;
        purchase_units: Array<{
          reference_id?: string;
          description?: string;
          amount: {
            currency_code: string;
            value: string;
          };
        }>;
        application_context?: {
          brand_name?: string;
          shipping_preference?: string;
        };
      }): void;
    }

    class OrdersCaptureRequest {
      constructor(orderId: string);
      requestBody(body: Record<string, unknown>): void;
    }
  }

  interface PayPalOrderResult {
    id: string;
    status: string;
    purchase_units: Array<{
      payments?: {
        captures?: Array<{
          id: string;
        }>;
      };
    }>;
  }

  export { core, orders, PayPalOrderResult };
}
