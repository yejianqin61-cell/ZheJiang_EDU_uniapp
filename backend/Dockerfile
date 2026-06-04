# ---- Build Stage ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src/ src/
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force && npm install -g pm2

COPY --from=build /app/dist/ ./dist/
COPY src/database/migrations/ ./src/database/migrations/
COPY ecosystem.config.js ./

EXPOSE 3000
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
