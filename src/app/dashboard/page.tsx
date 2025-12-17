"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, signOut } from "@/lib/auth-client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  LogOut,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";

// Types
interface Stock {
  ticker: string;
  name: string;
  basePrice: number;
}

interface Subscription {
  ticker: string;
  createdAt: string;
}

interface StockPrice {
  ticker: string;
  price: number;
  change: number;
  timestamp: string;
}

const SUPPORTED_STOCKS = ["GOOG", "TSLA", "AMZN", "META", "NVDA"] as const;

const STOCK_INFO: Record<string, { name: string; color: string }> = {
  GOOG: { name: "Alphabet Inc.", color: "bg-blue-500/20 text-blue-400" },
  TSLA: { name: "Tesla, Inc.", color: "bg-red-500/20 text-red-400" },
  AMZN: { name: "Amazon.com", color: "bg-orange-500/20 text-orange-400" },
  META: { name: "Meta Platforms", color: "bg-sky-500/20 text-sky-400" },
  NVDA: { name: "NVIDIA Corp.", color: "bg-green-500/20 text-green-400" },
};

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionLoading } = useSession();
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const eventSourceRef = useRef<EventSource | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.push("/");
    }
  }, [session, isSessionLoading, router]);

  // Fetch subscriptions
  const { data: subscriptions, isLoading: isSubLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async (): Promise<Subscription[]> => {
      const res = await fetch("/api/stocks/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();
      return data.subscriptions;
    },
    enabled: !!session,
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch("/api/stocks/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to subscribe");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscribed successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`/api/stocks/unsubscribe/${ticker}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unsubscribe");
      return res.json();
    },
    onSuccess: (_, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setPrices((prev) => {
        const newPrices = { ...prev };
        delete newPrices[ticker];
        return newPrices;
      });
      toast.success("Unsubscribed successfully!");
    },
    onError: () => {
      toast.error("Failed to unsubscribe");
    },
  });

  // SSE for real-time prices
  useEffect(() => {
    if (!session || !subscriptions?.length) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/prices/stream");
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("prices", (event) => {
      try {
        const data = JSON.parse(event.data);
        const newPrices: Record<string, StockPrice> = {};
        data.prices.forEach((price: StockPrice) => {
          newPrices[price.ticker] = price;
        });
        setPrices(newPrices);
      } catch (error) {
        console.error("Failed to parse price data:", error);
      }
    });

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session, subscriptions?.length]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const isSubscribed = (ticker: string) =>
    subscriptions?.some((s) => s.ticker === ticker);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">StockPulse</h1>
              <p className="text-xs text-muted-foreground">
                {session.user.email}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Live Prices Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold">Your Watchlist</h2>
            <Badge variant="outline" className="animate-pulse">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Live
            </Badge>
          </div>

          {isSubLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : subscriptions?.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No stocks in your watchlist.
                  <br />
                  Subscribe to stocks below to start tracking.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions?.map(({ ticker }) => {
                const priceData = prices[ticker];
                const stockInfo = STOCK_INFO[ticker];
                const isPositive = priceData ? priceData.change >= 0 : true;

                return (
                  <Card
                    key={ticker}
                    className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
                  >
                    <div
                      className={`absolute inset-0 opacity-5 ${
                        isPositive ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={stockInfo.color}>{ticker}</Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => unsubscribeMutation.mutate(ticker)}
                          disabled={unsubscribeMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stockInfo.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {priceData ? (
                        <div className="space-y-2">
                          <div className="text-3xl font-bold tabular-nums">
                            ${priceData.price.toFixed(2)}
                          </div>
                          <div
                            className={`flex items-center gap-1 text-sm font-medium ${
                              isPositive ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span>
                              {isPositive ? "+" : ""}
                              {priceData.change.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Available Stocks Section */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Available Stocks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SUPPORTED_STOCKS.map((ticker) => {
              const stockInfo = STOCK_INFO[ticker];
              const subscribed = isSubscribed(ticker);

              return (
                <Card
                  key={ticker}
                  className={`transition-all ${
                    subscribed ? "bg-primary/5 border-primary/30" : ""
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center gap-3">
                      <Badge className={stockInfo.color} variant="secondary">
                        {ticker}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {stockInfo.name}
                      </p>
                      <Button
                        variant={subscribed ? "secondary" : "default"}
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          subscribed
                            ? unsubscribeMutation.mutate(ticker)
                            : subscribeMutation.mutate(ticker)
                        }
                        disabled={
                          subscribeMutation.isPending ||
                          unsubscribeMutation.isPending
                        }
                      >
                        {subscribed ? (
                          <>
                            <Minus className="w-4 h-4 mr-1" />
                            Unsubscribe
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Subscribe
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
