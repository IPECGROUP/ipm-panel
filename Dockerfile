FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./

# ✅ نصب وابستگی‌ها
RUN npm install --include=optional --no-audit --no-fund

# ✅ فیکس rolldown native binding
RUN set -eux; \
  ROLLDOWN_VER="$(node -p "require('rolldown/package.json').version")"; \
  npm install --no-save "@rolldown/binding-linux-x64-gnu@${ROLLDOWN_VER}" --no-audit --no-fund

# ✅ فیکس lightningcss native binding (بدون require(package.json) چون exports بسته است)
RUN set -eux; \
  LCSS_VER="$(node -p "const fs=require('fs'); const path=require('path'); const r=require.resolve('lightningcss/node'); const pkg=JSON.parse(fs.readFileSync(path.join(path.dirname(r),'..','package.json'),'utf8')); process.stdout.write(pkg.version);")"; \
  npm install --no-save "lightningcss-linux-x64-gnu@${LCSS_VER}" --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app

RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
