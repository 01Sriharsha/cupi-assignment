import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createRouter } from "../router";

// Supported stocks
export const SUPPORTED_STOCKS = [
  "GOOG",
  "TSLA",
  "AMZN",
  "META",
  "NVDA",
] as const;
export type SupportedStock = (typeof SUPPORTED_STOCKS)[number];

// Base prices for random generation
export const BASE_PRICES: Record<SupportedStock, number> = {
  GOOG: 175.5,
  TSLA: 248.75,
  AMZN: 185.25,
  META: 565.0,
  NVDA: 138.5,
};

// Subscribe to a stock
const subscribeSchema = z.object({
  ticker: z.enum(SUPPORTED_STOCKS),
});

function getStockName(ticker: SupportedStock): string {
  const names: Record<SupportedStock, string> = {
    GOOG: "Alphabet Inc.",
    TSLA: "Tesla, Inc.",
    AMZN: "Amazon.com, Inc.",
    META: "Meta Platforms, Inc.",
    NVDA: "NVIDIA Corporation",
  };
  return names[ticker];
}

export const stocksRoutes = createRouter()
  // Get all supported stocks
  .get("/available", (c) => {
    const stocks = SUPPORTED_STOCKS.map((ticker) => ({
      ticker,
      name: getStockName(ticker),
      basePrice: BASE_PRICES[ticker],
    }));
    return c.json({ stocks });
  })

  // Get user's subscriptions
  .get("/subscriptions", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      select: { ticker: true, createdAt: true },
    });

    return c.json({ subscriptions });
  })

  .post("/subscribe", zValidator("json", subscribeSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { ticker } = c.req.valid("json");

    try {
      const subscription = await prisma.subscription.create({
        data: {
          ticker,
          userId: user.id,
        },
      });
      return c.json({ subscription }, 201);
    } catch (error) {
      // Already subscribed
      return c.json({ error: "Already subscribed to this stock" }, 409);
    }
  })

  // Unsubscribe from a stock
  .delete("/unsubscribe/:ticker", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const ticker = c.req.param("ticker") as SupportedStock;

    if (!SUPPORTED_STOCKS.includes(ticker)) {
      return c.json({ error: "Invalid ticker" }, 400);
    }

    await prisma.subscription.deleteMany({
      where: {
        userId: user.id,
        ticker,
      },
    });

    return c.json({ message: "Unsubscribed successfully" });
  });
