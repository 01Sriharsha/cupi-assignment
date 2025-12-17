import { streamSSE } from "hono/streaming";

import { prisma } from "@/lib/prisma";
import { createRouter } from "@/server/router";
import { BASE_PRICES, type SupportedStock } from "./stocks";

// Generate random price with ±5% variation
function generatePrice(basePrice: number): number {
  const variation = (Math.random() - 0.5) * 0.1; // ±5%
  return Math.round(basePrice * (1 + variation) * 100) / 100;
}

export const pricesRoutes = createRouter()
  // SSE endpoint for real-time price updates
  .get("/stream", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    return streamSSE(c, async (stream) => {
      let isActive = true;

      // Keep-alive and price updates loop
      while (isActive) {
        try {
          // Get user's current subscriptions
          const subscriptions = await prisma.subscription.findMany({
            where: { userId: user.id },
            select: { ticker: true },
          });

          const subscribedTickers = subscriptions.map(
            (s) => s.ticker
          ) as SupportedStock[];

          // Generate prices for subscribed stocks
          const prices = subscribedTickers.map((ticker) => ({
            ticker,
            price: generatePrice(BASE_PRICES[ticker]),
            change: Math.round((Math.random() - 0.5) * 4 * 100) / 100, // ±2% change
            timestamp: new Date().toISOString(),
          }));

          // Send price update
          await stream.writeSSE({
            data: JSON.stringify({ prices }),
            event: "prices",
            id: Date.now().toString(),
          });

          // Wait 1 second before next update
          await stream.sleep(1000);
        } catch (error) {
          // Connection closed or error
          isActive = false;
        }
      }
    });
  });
