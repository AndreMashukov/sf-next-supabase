# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

FROM deps AS build
COPY . .
RUN node apps/api/build.mjs

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true

COPY --from=build /app/dist/apps/api/main.js ./dist/apps/api/main.js

ENV API_PORT=3001
ENV API_HOST=0.0.0.0

EXPOSE 3001

USER node

CMD ["node", "dist/apps/api/main.js"]
