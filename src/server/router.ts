import { auth } from "@/lib/auth";
import { Hono } from "hono";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

export const createRouter = () =>
  new Hono<{ Variables: Variables }>({ strict: true });
