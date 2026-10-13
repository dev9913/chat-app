# Stage - 1 : Dependencies Install

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk update && apk upgrade --no-cache
COPY package*.json ./
RUN npm ci


# Stage - 2 : Build Stage

FROM node:22-alpine AS build
WORKDIR /app
RUN apk update && apk upgrade --no-cache
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build 


# Stage - 3  RUN Stage

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk update && apk upgrade --no-cache
ENV NODE_ENV=production
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]