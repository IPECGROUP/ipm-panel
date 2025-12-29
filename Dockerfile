FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./

# ✅ نصب وابستگی‌ها
RUN npm install --include=optional --no-audit --no-fund

# ✅ فیکس rolldown + lightningcss native bindings (یکجا تا npm prune نکنه)
RUN set -eux; \
  ARCH="$(node -p "process.arch")"; \
  LIBC="$(node -p "process.report?.getReport()?.header?.glibcVersionRuntime ? 'gnu' : 'musl'")"; \
  ROLLDOWN_VER="$(node -p "require('rolldown/package.json').version")"; \
  LCSS_VER="$(node -e "const lock=require('./package-lock.json'); const v=(lock.packages?.['node_modules/lightningcss']?.version)||(lock.dependencies?.lightningcss?.version)||''; process.stdout.write(String(v||''));")"; \
  PKGS="@rolldown/binding-linux-${ARCH}-${LIBC}@${ROLLDOWN_VER}"; \
  if [ -n "$LCSS_VER" ]; then PKGS="$PKGS lightningcss-linux-${ARCH}-${LIBC}@${LCSS_VER}"; fi; \
  npm install --no-save $PKGS --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app

RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
