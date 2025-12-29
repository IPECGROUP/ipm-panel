FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./

# ✅ مهم: برای deps های native/optional روی لینوکس پایدارتره (glibc)
RUN npm ci --include=optional

COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app

RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
