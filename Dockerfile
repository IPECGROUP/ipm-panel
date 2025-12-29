FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./

# ✅ نصب وابستگی‌ها
RUN npm install --include=optional --no-audit --no-fund

# ✅ فیکس رول‌داون: binding نیتیو لینوکس دقیقاً هم‌نسخه‌ی rolldown نصب می‌شود
RUN set -eux; \
  ROLLDOWN_VER="$(node -p "require('rolldown/package.json').version")"; \
  npm install --no-save "@rolldown/binding-linux-x64-gnu@${ROLLDOWN_VER}" --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app

RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
