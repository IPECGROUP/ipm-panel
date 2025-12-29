FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./

# ✅ نصب وابستگی‌ها
RUN npm install --include=optional --no-audit --no-fund

# ✅ فیکس rolldown native binding
RUN set -eux; \
  ROLLDOWN_VER="$(node -p "require('rolldown/package.json').version")"; \
  npm install --no-save "@rolldown/binding-linux-x64-gnu@${ROLLDOWN_VER}" --no-audit --no-fund

# ✅ فیکس lightningcss native binding (خواندن ورژن از package-lock چون exports بسته است)
RUN set -eux; \
  LCSS_VER="$(node -e "const lock=require('./package-lock.json'); const v=(lock.packages?.['node_modules/lightningcss']?.version)||(lock.dependencies?.lightningcss?.version)||''; process.stdout.write(String(v||''));")"; \
  if [ -n "$LCSS_VER" ]; then \
    npm install --no-save "lightningcss-linux-x64-gnu@${LCSS_VER}" --no-audit --no-fund; \
  else \
    echo "lightningcss not found in package-lock.json; skipping native binding install"; \
  fi

COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app

RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
