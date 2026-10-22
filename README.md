# MAGNIFICENT ELECTROCORE SYNERGY LTD — E-commerce Platform

**RC No: 9792926** · Next.js 15 (App Router) · React 19 · Tailwind CSS · Prisma + MongoDB · Paystack (NGN)

A complete online store for electronics, computers, parts, power solutions, software and repair/engineering services:
catalog with multi-category filters, quick view, product pages with variant selection, a slide-over cart, Paystack
checkout with webhook verification, customer accounts and order history.

---

## 0. Status and quick start (Windows + VS Code)

### What has and has not been verified

| Area | Status |
|---|---|
| TypeScript type-check of every source file | Checked with real `zod` types and simplified stand-ins for React, Next and Prisma. One real build-breaking typing bug (in `src/lib/http.ts`) was found and fixed. **Run `npm run typecheck` on your machine for the authoritative result.** |
| Money, shipping, brand/spec parsing, catalogue loading (78 products), admin rules, webhook signature, image logic | Unit-tested with Node. Passing. |
| Storefront layout and admin pages | Rendered and clicked through in a headless browser earlier, using a stand-in for the server. |
| `npm install`, `npm run build`, `npm run dev` | **Not run.** The workspace this was prepared in cannot reach the npm registry. You must run them (steps below). |
| MongoDB connection, `prisma db push`, seeding | **Not run.** Needs your `DATABASE_URL`. |
| Paystack payments and webhook | **Not run against Paystack.** Needs your keys. `PAYSTACK_MOCK_MODE="true"` lets you test the whole order flow locally without keys. |
| Live Technocrat import (`npm run catalog:import`) | **Not run against the live site** (not reachable from the preparation workspace). |

### About migrations

This project uses **MongoDB**, and Prisma Migrate does not support MongoDB, so there are no migration files.
The command that creates or updates the collections and indexes is `npm run db:push` (`prisma db push`). It is safe to
run repeatedly. It never deletes your data unless you remove a field from `prisma/schema.prisma` and confirm the prompt.

### Open the project in VS Code (Windows)

1. Install **Node.js 20 LTS or 22 LTS** from nodejs.org and **VS Code** from code.visualstudio.com. Restart after installing.
2. Unzip `electrocore-store.zip`, then in VS Code choose **File → Open Folder…** and pick the `electrocore` folder.
   Click **Install** if VS Code offers the recommended extensions.
3. Open the terminal: **Terminal → New Terminal** (PowerShell). If `npm` says *running scripts is disabled*, run
   `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then reopen the terminal.
4. Run these one at a time:

```powershell
npm install
Copy-Item .env.example .env
```

5. Open `.env` and set at least `DATABASE_URL` and `AUTH_SECRET` (see section 2, step 2). For a first test without Paystack
   keys, set `PAYSTACK_MOCK_MODE="true"`.
6. Create the database collections, the admin user, and load the 78-product catalogue:

```powershell
npm run db:push
npm run db:seed
npm run catalog:technocrat
npm run typecheck
npm run dev
```

7. Open http://localhost:3000. Admin: http://localhost:3000/admin/login (login from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
8. Before deploying, run `npm run build` once locally. If it prints an error, send me the exact text.

> `npm run catalog:technocrat` replaces the 29 demo products with the catalogue in `src/data/products.json`. Do **not** run
> `npm run catalog:import` unless you want to replace that file with a fresh scrape of Technocrat's website.

### Images (already included)

- **Product pictures:** 77 of the 78 products have a picture in `public/images/products/<category-slug>/`. They were cut from your
  product-picture sheet, so they are small (about 120 px originals, enlarged to 480 px) and look soft when zoomed. Replace any file with a
  sharper one of the same name to improve it. **`DeckLink Mini Monitor 4K` has no picture** (it was not on the sheet) and shows a name tile.
- **Homepage banner:** `public/images/site/banner.jpg` (your banner recoloured to bright pink; the original is kept as `banner-original-blue.jpg`).
- **Homepage hero picture (optional):** save a picture as `public/images/site/hero.jpg`; until then the built-in laptop illustration shows.
- After changing pictures, run `npm run catalog:technocrat` again so the database picks them up.

---

## 1. What you need installed first

| Tool | Why | How to check |
| --- | --- | --- |
| **Node.js 20.9 or newer** | Runs the app | `node -v` → should print `v20.x` or `v22.x` |
| **npm** (comes with Node) | Installs packages | `npm -v` |
| **A MongoDB database** | Stores products, carts, orders | Option A (easiest): free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster. Option B: [Docker Desktop](https://www.docker.com/products/docker-desktop/) to run MongoDB locally |
| **A Paystack account** | Takes payments | Sign up at [paystack.com](https://paystack.com) — test keys work immediately, no approval needed |

> Prisma needs MongoDB to run as a *replica set*. Atlas already is one. The included `docker-compose.yml`
> sets that up for you locally.

---

## 2. Run it on your computer (step by step)

Open a terminal (Command Prompt / PowerShell on Windows, Terminal on Mac/Linux) inside the project folder.

### Step 1 — Install the packages

```bash
npm install
```

This downloads everything in `package.json` and automatically generates the Prisma database client.

### Step 2 — Create your settings file

```bash
# Mac / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` in your editor and fill in:

1. **`DATABASE_URL`**
   - *Atlas:* In Atlas click **Connect → Drivers**, copy the `mongodb+srv://...` string, replace `<password>`, and add the
     database name `electrocore` before the `?` — e.g.
     `mongodb+srv://admin:MyPass123@cluster0.abcde.mongodb.net/electrocore?retryWrites=true&w=majority`.
     Also allow your IP under **Network Access**.
   - *Docker:* leave the default value and start MongoDB with `docker compose up -d`.
2. **`AUTH_SECRET`** — generate one:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Paste the output. Do the same for **`ADMIN_API_TOKEN`**.
3. **Paystack keys** — Paystack Dashboard → **Settings → API Keys & Webhooks**. Copy the **Test Secret Key** into
   `PAYSTACK_SECRET_KEY` and the **Test Public Key** into both `PAYSTACK_PUBLIC_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
   - *No Paystack account yet?* Set `PAYSTACK_MOCK_MODE="true"` to simulate successful payments locally. It is
     ignored automatically in production.
4. **Business details** — set `NEXT_PUBLIC_BUSINESS_ADDRESS_LINE1`, city, state, support email and phone. These
   appear only in the footer, contact page and policies.

### Step 3 — Create the database tables and load the catalog

```bash
npm run setup
```

This runs two commands for you:
- `prisma db push` — creates the collections and indexes in MongoDB
- `npm run db:seed` — loads 9 categories, 29 products (58 variants) and an admin user. Choose its login by setting
  `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` before seeding (defaults: `admin@electrocore.local` /
  `ChangeMe!2026`)

### Step 4 — Start the store

```bash
npm run dev
```

Open **http://localhost:3000**. 🎉

### Step 5 — Make a test payment

1. Add products to the cart → **Checkout securely** → fill in the form → **Pay**.
2. You are sent to Paystack's test page. Use Paystack's test card:
   - Card number `4084 0840 8408 4081`, any future expiry date, CVV `408`
   - If asked: PIN `0000`, OTP `123456`
3. Paystack sends you back to `/checkout/success`, which verifies the payment with Paystack, marks the order **PAID**,
   deducts stock (with an inventory log entry) and empties the cart.

---

## 3. Admin portal

Open **http://localhost:3000/admin** and sign in with the admin account created by `npm run setup`
(the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`).

> **Already ran the seed before the admin portal existed?** Run `npm run db:push` once so the database
> picks up the new order-timeline fields. Nothing is deleted.

| Screen | What you can do |
| --- | --- |
| **Dashboard** | Revenue for today, 7 and 30 days (Nigerian time), a 14-day sales chart, best sellers, orders waiting to be fulfilled, orders flagged for review, low stock |
| **Orders** | Filter by status, search by order number, name, email or phone. Move orders through *Paid → Processing → Shipped → Delivered*, cancel (optionally putting items back in stock), refund through Paystack or record a manual refund, resolve flagged orders. Every change is written to the order's timeline with the admin's email |
| **Products** | Search and filter, hide/show products instantly, add new products, edit text, images, specs, options (Color, Storage…) and variants with Naira prices and "was" prices |
| **Inventory** | Restock low items, correct counts, record returns, and see the full stock history (sales, returns, supplier syncs, manual changes) |
| **Customers** | Registered customers with order count and total spent; grant or remove admin access |
| **Categories** | Create, rename, re-order and delete categories (empty ones only) |
| **Settings** | Paystack status (live / test / mock / missing), the webhook URL to copy into Paystack, recent webhooks, and a **Run sync now** button for your supplier feed |

**How access is protected**
- `src/middleware.ts` sends anyone without an admin session to `/admin/login` before any admin page loads.
- Every admin page and API call re-checks the user's role **in the database**, so removing someone's admin access
  takes effect on their very next click.
- To add another admin: have them create a normal account on the store, then open **Customers** and choose
  **Make admin**. You can't remove your own access, and the store always keeps at least one admin.

**Good to know**
- Products added in the portal are marked "Added here" and are never overwritten by supplier syncs. Products that
  came from a supplier feed show a warning before you edit them, because the next sync would overwrite your edits.
- Stock on existing variants is only changed through **Adjust stock** (never by typing over the number), so every
  change has a reason and a name attached in the inventory history.
- Products and variants are hidden rather than deleted, so past orders and stock history stay complete.
- Product images are added as links: an `https://` URL of a hosted photo, or a path like `/products/my-photo.jpg`
  for a file you place in the `public/products` folder.

---

## 4. Paystack webhook (recommended)

The success page already verifies payments, but if a shopper closes the browser before being redirected, the
**webhook** makes sure the order is still confirmed.

1. Paystack Dashboard → **Settings → API Keys & Webhooks → Test Webhook URL**:
   `https://YOUR-DOMAIN/api/webhooks/paystack`
2. Testing on your own computer? Paystack can't reach `localhost`, so expose it with a tunnel, e.g.
   [ngrok](https://ngrok.com): `ngrok http 3000`, then use the `https://….ngrok-free.app/api/webhooks/paystack` URL.

Every webhook is signature-checked (HMAC-SHA512 with your secret key), stored in the `webhook_events` collection,
and re-verified against Paystack's API before an order is marked paid. Processing is idempotent — the webhook and the
success page can both fire without double-deducting stock.

---

## 4b. Put it online with Railway + MongoDB Atlas (step by step)

You need three accounts, all free to start: **GitHub** (stores your code), **MongoDB Atlas** (database) and **Railway** (runs the site).
Do the local steps in section 0 first so you know the project works on your computer.

> **Why Atlas and not Railway's MongoDB?** Prisma needs MongoDB to run as a *replica set* (for orders and stock changes that must
> succeed or fail together). Atlas free clusters are replica sets. Railway's MongoDB template is a single server, which can fail.

1. **Put the code on GitHub.** Create an empty private repository at github.com/new (no README). In the project folder run:
   ```powershell
   git init
   git add .
   git commit -m "ElectroCore store"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   git push -u origin main
   ```
   `.env` is in `.gitignore`, so your secrets are not uploaded. Commit `package-lock.json` too (created by `npm install`).
2. **Create the database.** In MongoDB Atlas create a free cluster, add a database user, and under **Network Access** allow
   `0.0.0.0/0` (Railway's addresses change). Copy the connection string and add `/electrocore` before the `?`.
3. **Load the tables and catalogue once, from your computer** (with `DATABASE_URL` in your local `.env` set to the Atlas string):
   `npm run db:push`, `npm run db:seed`, `npm run catalog:technocrat`.
4. **Create the Railway service.** In Railway: **New Project → Deploy from GitHub repo →** pick your repository. `railway.json` already
   tells Railway how to build, start and health-check the site (`/api/health`).
5. **Add variables** in Railway (**Variables** tab). Never put these in the code:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Atlas connection string |
   | `AUTH_SECRET`, `ADMIN_API_TOKEN` | two different long random strings (generate as in section 2) |
   | `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | your Paystack keys (use `sk_test_…` until you are ready to take real money) |
   | `PAYSTACK_MOCK_MODE` | `false` |
   | `NEXT_PUBLIC_APP_URL` | your Railway address, then your own domain later |
   | `NEXT_PUBLIC_BUSINESS_ADDRESS_LINE1`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE` | your real details |

   `NEXT_PUBLIC_…` values are baked in at build time, so change them and **redeploy**.
6. **Get a web address.** Service → **Settings → Networking → Generate Domain**. Open it, then check
   `https://YOUR-ADDRESS/api/health?db=1` — it should show `"database":"ok"`.
7. **Paystack webhook.** In Paystack → Settings → API Keys & Webhooks, set the webhook URL to
   `https://YOUR-ADDRESS/api/webhooks/paystack` (see section 4).
8. **Custom domain.** Railway → **Settings → Networking → Custom Domain**, then add the DNS record Railway shows at your domain registrar.

---

## 5. Going live on your own domain

1. Deploy (any Node host works — e.g. [Vercel](https://vercel.com) or [Railway](https://railway.app)):
   - Build command: `npm run build` · Start command: `npm start`
   - Add every variable from your `.env` in the host's environment settings.
2. Set `NEXT_PUBLIC_APP_URL="https://www.your-domain.com.ng"` and `NEXT_PUBLIC_SITE_DOMAIN="your-domain.com.ng"`.
3. Point your domain's DNS to the host (they show you the exact A/CNAME records).
4. Swap to **live** Paystack keys (`sk_live_…`, `pk_live_…`) and set the **Live Webhook URL** in Paystack.
5. Make sure `PAYSTACK_MOCK_MODE` is `"false"`.

---

## 6. Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` then `npm start` | Production build and server |
| `npm run typecheck` | Check all TypeScript types |
| `npm run db:push` | Apply schema changes to MongoDB |
| `npm run db:seed` | (Re)load the demo catalog — safe to run repeatedly |
| `npm run db:studio` | Open Prisma Studio to browse/edit data in your browser |
| `npm run supplier:sync` | Pull latest products/prices/stock from your supplier feed |
| `npm run art:generate` | Regenerate the demo product images in `public/products` |

---

## 7. How the code is organised

```
prisma/schema.prisma          Database schema (Users, Categories, Products, Variants, InventoryLogs,
                              Carts, Orders, OrderItems, PaystackTransactions, WebhookEvents)
scripts/                      seed, supplier sync, product-image generator
src/
  app/                        Pages (App Router) and API routes
    (store)/                  Storefront pages, wrapped in the shop header/footer
    admin/                    Admin portal: /admin/login and the signed-in (portal) pages
    api/                      Thin route files that mount controllers (like Express routers)
    api/admin/                Admin-only API (dashboard, orders, refunds, products, inventory…)
  middleware.ts               Blocks /admin and /api/admin for anyone who isn't an admin
  server/
    controllers/              Request handlers: validate input, call a service, send JSON
    services/                 Business logic: catalog, cart, orders, payments, inventory, sync, auth
  lib/
    currency.ts               Central NGN/USD money utility (all amounts stored in kobo)
    paystack.ts               Paystack client + webhook signature check
    suppliers/                Reseller abstraction: mock catalog + HTTP wholesaler adapter
    shipping.ts               Delivery zones & fees for all 36 states + FCT
    site.ts                   Company identity (name, RC number, contact details from .env)
  components/                 UI: layout (Header/Footer), product, cart, checkout, account, home
```

**About "Express routes":** the API runs on Node.js inside Next.js Route Handlers, organised exactly like an
Express app — `route.ts` files are the router, `server/controllers` are the handlers, `withErrorHandling` is the
error middleware, and `server/services` hold the logic. This means one server, one deployment and no CORS setup.
If you later want a separate Express server, the controllers and services can be moved over unchanged.

### API reference

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/products?q=&category=a,b&brand=x,y&minPrice=&maxPrice=&inStock=1&sort=&page=` | Catalog with multi-category filters, facets, sorting, pagination |
| GET | `/api/products/:slug` | Product detail with variants + related products |
| GET | `/api/categories` | Categories with product counts |
| GET / DELETE | `/api/cart` | Read / empty the cart |
| POST | `/api/cart/items` | Add `{ variantId, quantity }` |
| PATCH / DELETE | `/api/cart/items/:itemId` | Change quantity (`0` removes) / remove |
| POST | `/api/checkout` | Validate details, create order, initialise Paystack, return `authorizationUrl` |
| GET | `/api/checkout/verify?reference=` | Verify with Paystack and finalise the order |
| POST | `/api/webhooks/paystack` | Paystack webhook (signature-verified) |
| POST | `/api/auth/register` · `/login` · `/logout`, GET `/api/auth/me` | Customer accounts |
| GET | `/api/orders`, `/api/orders/:orderNumber` | Signed-in customer's orders |
| POST | `/api/admin/sync?supplier=http` | Supplier sync (admin session, or header `Authorization: Bearer ADMIN_API_TOKEN` for cron jobs) |
| GET | `/api/admin/dashboard` | Dashboard figures (admin only, like every `/api/admin/*` route) |
| GET · GET/PATCH | `/api/admin/orders`, `/api/admin/orders/:orderNumber` | List orders · view / change status |
| POST | `/api/admin/orders/:orderNumber/refund` · `/review` | Refund (Paystack or manual) · resolve a flagged order |
| GET/POST · GET/PUT/PATCH | `/api/admin/products`, `/api/admin/products/:id` | List / create · view / update / show-hide |
| GET · GET · POST | `/api/admin/inventory`, `/inventory/low-stock`, `/inventory/adjust` | Stock history · low stock · logged adjustment |
| GET · PATCH | `/api/admin/customers`, `/api/admin/customers/:id` | Customers · change role |
| GET/POST · PUT/DELETE | `/api/admin/categories`, `/api/admin/categories/:id` | Category management |
| GET | `/api/admin/system` | Payment/supplier status and recent webhooks |

---

## 7a. Your product catalog (`src/data/products.json`)

The store's products come from one file you can open in any text editor: `src/data/products.json`. Each product looks like this:

```json
{
  "id": "4",
  "title": "HP EliteBook 840 G8 - 11th Gen Intel i7 (16GB, 512GB SSD)",
  "category": "Laptops",
  "costPriceNGN": 500000,
  "sellingPriceNGN": 530000,
  "formattedPrice": "₦530,000",
  "imageUrl": "https://…/hp-840-g8.jpg",
  "inStock": true,
  "sourceUrl": "https://www.technocratng.com/shop/products/hp-elitebook-840-g8"
}
```

What the store does with each field:

| Field | Used for |
|---|---|
| `id` | Must be unique. Becomes the product code (id `4` → SKU `TC-0004`). Never reuse an id for a different product. |
| `title` | Product name. The brand (HP, Apple, Samsung…) and the specs table (Model, Processor, Configuration) are read from it, and the shop search looks inside it, so typing "840 g8" finds that laptop. |
| `category` | Laptops, Tablets, Accessories and Spare Parts become the category filters and homepage tiles. A new category name creates a new category automatically. |
| `sellingPriceNGN` | The price customers pay, exactly as written (your 6% markup is already in it, so the store adds nothing on top). |
| `costPriceNGN` | Your cost (older files call it `originalPriceNGN`; both work). It is **never** shown to customers or sent to the browser. |
| `imageUrl` | The product photo. If the link is broken or the other website blocks it, the card shows a neat tile with the product name instead of an empty box. |
| `inStock` | `true` or `false`. The file only says yes/no, so in-stock items start with 10 units (change with `TECHNOCRAT_DEFAULT_STOCK` in `.env`). Set real counts in **Admin → Inventory**. |
| `sourceUrl` | Written by the importer: the Technocrat page the product came from. It also keeps each product's `id` the same every time you re-import. |
| `featured` | Optional. `true` pins a product to the homepage "Featured products" row. If you pin none, the first 8 in-stock products are shown there. |

### Importing the full catalog from Technocrat (step by step)

`npm run catalog:import` reads every page of https://www.technocratng.com/shop/products (about 100 pages at 24 products each), so you do not type products in by hand.

1. In the terminal, in the project folder, run: `npm run catalog:import`
2. Watch it count up, one line per page, for example `Page 12: 24 products, 24 new (running total 288 of 2430)`. It takes a minute or two.
3. At the end it prints `Saved N products to src/data/products.json`, a count per category, and a list of anything it skipped (for example a product with no price on the page).
4. Run `npm run catalog:technocrat` to load them into the store. With thousands of products this takes a few minutes the first time.
5. Run `npm run dev` and open http://localhost:3000/shop.

What it does for each product: reads the product name, the ₦ price (your cost), and the photo address straight from the page, then sets your selling price to cost × 1.06 rounded to the nearest naira. The old file is saved as `src/data/.products.backup.json`. If the website cannot be reached or shows no products, the script stops with a message and does not change your file.

Good to know:

- Add `--dry-run` to see what it would save without writing anything: `node scripts/import-full-catalog.js --dry-run`
- The listing pages do not show a category, so the importer decides it from the product name (for example "Laptop", "iPad", "Tempered Glass"). Check the category counts it prints; anything it cannot place is called "Other". You can edit any `category` in the file afterwards.
- Technocrat's photos are served through a resizing link (`/_next/image?url=…`). The importer saves the real photo address inside it, which is the full-size picture.
- Product photos and descriptions belong to Technocrat. Make sure you have their permission to use them on your own store.

### Changing the catalog by hand (step by step)

1. Open `src/data/products.json`, make your change, and save. Keep the commas and quotes exactly as they are. A missing comma breaks the whole file.
2. In the terminal, in the project folder, run: `npm run catalog:technocrat`
3. It prints how many products were created and updated. If the file has a mistake (for example two products with the same `id`), it stops and tells you which product to fix, and nothing is changed.
4. Refresh the shop in your browser. If your site is already live, deploy again so the server has the new file.

Running it again is always safe. Products are matched by `id`, so nothing is duplicated, and prices you change in the file update the live prices. If you remove a product from the file, it is hidden from the store (not deleted), so old orders keep their records. One thing to know: a product you hide by hand in **Admin → Products** comes back the next time you run the command while it is still in the file. To take a product off sale for good, delete it from the file.

### Product photos

`imageUrl` can be:

- a full `https://` link to a picture on another website. That website may block other sites or move the file later; the store then
  shows the name tile instead. To check, open the link in a new browser tab.
- a file in your own project, such as `/images/products/power-and-generators/my-ups.jpg` or `/products/my-photo.jpg`. The
  store uses the path only if the file really exists in `public/`, so add the file and run `npm run catalog:technocrat` again.
  Local files can never break.

Fields `slug` and `description` (optional) are used as written; `rating` is accepted but never shown, because sample
ratings are not real customer reviews.

## 8. Connecting a real wholesale supplier

1. In `.env`: `SUPPLIER_PROVIDER="http"`, `SUPPLIER_API_URL`, `SUPPLIER_API_KEY`, `SUPPLIER_MARKUP_PERCENT`.
2. If the supplier's JSON differs from the format documented at the top of `src/lib/suppliers/http-supplier.ts`,
   adjust `mapRemoteProduct()` — that is the only file that knows the supplier's format.
3. Run `npm run supplier:sync` (or schedule `POST /api/admin/sync` hourly). Products are upserted, prices get your
   markup, stock changes are written to the inventory log, and discontinued variants are deactivated (kept for order
   history).

For a completely different supplier, create a new adapter implementing `SupplierAdapter` (see `types.ts`) and register
it in `src/lib/suppliers/index.ts`.

---

## 9. Switching to US Dollars

Set `NEXT_PUBLIC_STORE_CURRENCY="USD"` and `NEXT_PUBLIC_NGN_PER_USD` to your rate. Prices stay stored in NGN kobo
and are converted for display and for the Paystack charge. Your Paystack account must have USD enabled.

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set` | Use Atlas, or `docker compose up -d` and the Docker `DATABASE_URL` from `.env.example` |
| Homepage says "No products yet" | Run `npm run db:seed` |
| "Online payment is not configured yet" at checkout | Add a real `sk_test_…` key, or set `PAYSTACK_MOCK_MODE="true"` locally |
| `AUTH_SECRET must be set…` | Put a 32+ character random string in `AUTH_SECRET` |
| Atlas connection timeout | Atlas → Network Access → add your current IP address |
| `/admin/login` says the account has no admin access | Sign in with the seeded admin, or have an existing admin use **Customers → Make admin** |
| Admin pages error about unknown field `events` or `restockedAt` | Run `npm run db:push` once to update the database |
| Paid but order still pending | Check the webhook URL in Paystack and the `webhook_events` collection (`npm run db:studio`) |

---

## 11. Before launch checklist

- [ ] Real registered office address, phone and email in `.env`
- [ ] Policies in `src/lib/policies.ts` reviewed by your legal adviser
- [ ] Seeded admin uses your own email and a strong password (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- [ ] Settings page in the admin portal shows Paystack as **Live**
- [ ] Live Paystack keys + live webhook URL configured
- [ ] Real product catalog loaded via your supplier feed
- [ ] `PAYSTACK_MOCK_MODE="false"`

© MAGNIFICENT ELECTROCORE SYNERGY LTD (RC No: 9792926). All rights reserved.
