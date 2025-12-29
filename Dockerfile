FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./

# ✅ به جای npm ci (که این باگ optional deps رو می‌زند)، از npm install استفاده می‌کنیم
RUN npm install --include=optional --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app

RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
