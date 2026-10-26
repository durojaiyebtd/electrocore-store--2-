# ElectroCore store - production image for Coolify (or any Docker host).
# Build:  docker build -t electrocore .
# Run:    docker run -p 3000:3000 --env-file .env electrocore
#
# Notes
# - Secrets (DATABASE_URL, AUTH_SECRET, PAYSTACK_SECRET_KEY, ...) are NOT baked into the image.
#   Provide them as runtime environment variables in Coolify.
# - NEXT_PUBLIC_* values are public by design and are compiled into the browser code at build time,
#   so they are declared below as build arguments. In Coolify, add them as normal variables.
# - The database schema is synced on every container start (see docker-entrypoint.sh).

FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Install dependencies (no lockfile in this project, so npm install) ----
FROM base AS deps
COPY package.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

# ---- Build the Next.js app ----
FROM base AS build
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_DOMAIN
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
ARG NEXT_PUBLIC_STORE_CURRENCY
ARG NEXT_PUBLIC_NGN_PER_USD
ARG NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_NGN
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_SUPPORT_PHONE
ARG NEXT_PUBLIC_BUSINESS_ADDRESS_LINE1
ARG NEXT_PUBLIC_BUSINESS_CITY
ARG NEXT_PUBLIC_BUSINESS_STATE
ARG NEXT_PUBLIC_BUSINESS_HOURS
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SITE_DOMAIN=$NEXT_PUBLIC_SITE_DOMAIN \
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY \
    NEXT_PUBLIC_STORE_CURRENCY=$NEXT_PUBLIC_STORE_CURRENCY \
    NEXT_PUBLIC_NGN_PER_USD=$NEXT_PUBLIC_NGN_PER_USD \
    NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_NGN=$NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_NGN \
    NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL \
    NEXT_PUBLIC_SUPPORT_PHONE=$NEXT_PUBLIC_SUPPORT_PHONE \
    NEXT_PUBLIC_BUSINESS_ADDRESS_LINE1=$NEXT_PUBLIC_BUSINESS_ADDRESS_LINE1 \
    NEXT_PUBLIC_BUSINESS_CITY=$NEXT_PUBLIC_BUSINESS_CITY \
    NEXT_PUBLIC_BUSINESS_STATE=$NEXT_PUBLIC_BUSINESS_STATE \
    NEXT_PUBLIC_BUSINESS_HOURS=$NEXT_PUBLIC_BUSINESS_HOURS \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# ---- Runtime image ----
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Dev dependencies are kept on purpose: the Prisma CLI syncs the schema at start,
# and tsx lets you run `npm run seed:admin` / `npm run db:seed` from the Coolify terminal.
COPY --from=build --chown=node:node /app ./
RUN chmod +x docker-entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
