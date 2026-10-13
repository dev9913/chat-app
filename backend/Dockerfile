# Stage 1: Install all dependencies

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk update && apk upgrade --no-cache
COPY package*.json ./
RUN npm ci


# Stage 2: Build application


FROM node:22-alpine AS build
WORKDIR /app
RUN apk update && apk upgrade --no-cache
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY . .
RUN apk add --no-cache openssl
RUN npx prisma generate
RUN npm run build


# Stage 3: Install production dependencies only

FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk update && apk upgrade --no-cache
COPY package*.json ./
RUN npm ci --omit=dev


# Stage 4: Production runtime

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk update && apk upgrade --no-cache
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/uploads
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx
EXPOSE 4000
CMD ["node", "dist/main.js"]