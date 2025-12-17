# StockPulse - Real-time Stock Broker Dashboard

A real-time stock tracking dashboard that allows multiple users to login, subscribe to stocks, and see live price updates without page refresh.

## Features

- **User Authentication** - Email/password registration and login via better-auth
- **Stock Subscriptions** - Subscribe/unsubscribe to 5 supported stocks: `GOOG`, `TSLA`, `AMZN`, `META`, `NVDA`
- **Real-time Price Updates** - Live stock prices update every second via Server-Sent Events (SSE)
- **Multi-user Support** - Multiple users can track different stocks simultaneously with independent dashboards
- **Modern UI** - Beautiful dark theme with Shadcn UI components

## Tech Stack

| Technology                                 | Purpose                         |
| ------------------------------------------ | ------------------------------- |
| [Next.js 16](https://nextjs.org)           | React framework with App Router |
| [Hono](https://hono.dev)                   | Fast API routes                 |
| [better-auth](https://better-auth.com)     | Authentication (email/password) |
| [Prisma](https://prisma.io)                | Database ORM                    |
| [PostgreSQL](https://postgresql.org)       | Database                        |
| [React Query](https://tanstack.com/query)  | Data fetching & caching         |
| [Zod](https://zod.dev)                     | Schema validation               |
| [Shadcn UI](https://ui.shadcn.com)         | Component library               |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling                         |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- PostgreSQL database

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stocks_db"
BETTER_AUTH_SECRET="your-super-secret-key-at-least-32-characters"
BETTER_AUTH_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm prisma db push
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/[[...route]]/     # Hono API catch-all route
│   ├── dashboard/            # Dashboard page (protected)
│   ├── layout.tsx            # Root layout with providers
│   └── page.tsx              # Login/Register page
├── components/ui/            # Shadcn UI components
├── lib/
│   ├── auth.ts               # better-auth server config
│   ├── auth-client.ts        # better-auth React client
│   ├── prisma.ts             # Prisma client singleton
│   └── query-provider.tsx    # React Query provider
├── server/
│   ├── index.ts              # Hono app with routes
│   └── routes/
│       ├── stocks.ts         # Stock subscription endpoints
│       └── prices.ts         # SSE price streaming
└── generated/prisma/         # Generated Prisma client
```

## API Endpoints

| Method     | Endpoint                          | Description                       |
| ---------- | --------------------------------- | --------------------------------- |
| `POST/GET` | `/api/auth/*`                     | better-auth authentication routes |
| `GET`      | `/api/stocks/available`           | List supported stocks             |
| `GET`      | `/api/stocks/subscriptions`       | Get user's subscriptions          |
| `POST`     | `/api/stocks/subscribe`           | Subscribe to a stock              |
| `DELETE`   | `/api/stocks/unsubscribe/:ticker` | Unsubscribe from a stock          |
| `GET`      | `/api/prices/stream`              | SSE endpoint for live prices      |

## Testing Multi-user Scenario

1. Open `http://localhost:3000` in **Browser 1** → Register/Login as `user1@test.com`
2. Subscribe to `GOOG` and `TSLA`
3. Open `http://localhost:3000` in **Browser 2** (incognito) → Register/Login as `user2@test.com`
4. Subscribe to `AMZN` and `META`
5. Observe both dashboards updating independently with different stocks

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm prisma studio # Open Prisma Studio
```

## License

MIT
