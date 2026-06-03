FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY prisma prisma
RUN npm install

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN npm run prisma:generate && npm run build -w apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/prisma prisma
COPY package.json package.json
CMD ["sh", "-c", "npx prisma db push --skip-generate && node apps/api/dist/main.js"]
