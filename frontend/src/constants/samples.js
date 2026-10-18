export const EXT_TO_LANG = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  java: 'java',
  py: 'python',
}

export const SAMPLES = {
  javascript: {
    filename: 'payment.js',
    language: 'javascript',
    code: `export async function processPayment(orderId, amount) {
    const user = await getUser(orderId);

    if (!user) {
        throw new Error("User not found");
    }

    const total = calculateTotal(amount);

    return await orderService.create({
        orderId,
        amount: total
    });
}

function calculateTotal(amount) {
    const taxRate = 0.08;
    return amount + (amount * taxRate);
}

function getId() {
    return 101;
}
`,
  },
  python: {
    filename: 'data_pipeline.py',
    language: 'python',
    code: `import json
import logging

class MetricsAggregator:
    def __init__(self, service_name):
        self.service_name = service_name
        self.metrics = []

    def record_metric(self, name, value, tags=None):
        payload = {"name": name, "value": value, "tags": tags or {}}
        self.metrics.append(payload)

def parse_events(event_stream):
    results = []
    for raw in event_stream:
        try:
            item = json.loads(raw)
            if item.get("status") == "SUCCESS":
                results.append(item)
        except Exception as e:
            logging.warning(f"Failed to parse item: {e}")
    return results
`,
  },
  typescript: {
    filename: 'orderService.ts',
    language: 'typescript',
    code: `interface OrderItem {
    id: string;
    price: number;
    quantity: number;
}

export async function submitOrder(userId: string, items: OrderItem[]): Promise<string> {
    if (!items || items.length === 0) {
        throw new Error("Order cannot be empty");
    }

    const subtotal = calculateSubtotal(items);
    const trackingId = await paymentGateway.charge({ userId, amount: subtotal });

    return trackingId;
}

function calculateSubtotal(items: OrderItem[]): number {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
}
`,
  },
}
