FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./

# ✅ مهم: برای Alpine باید optional deps هم نصب بشن تا rolldown binding (musl) بیاد
RUN npm ci --include=optional

COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
