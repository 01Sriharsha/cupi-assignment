import { auth } from "@/lib/auth";
import { createRouter } from "./router";
import { pricesRoutes } from "./routes/prices";
import { stocksRoutes } from "./routes/stocks";

const app = createRouter().basePath("/api");

// Health check
app.get("/", (c) => c.json({ message: "Server Running!" }));

// Mount better-auth routes
app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Session middleware for protected routes
app.use("/stocks/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.use("/prices/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// Mount routes
app.route("/stocks", stocksRoutes);
app.route("/prices", pricesRoutes);

export default app;
