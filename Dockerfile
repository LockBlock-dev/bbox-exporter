ARG BUN_VERSION=1.3

FROM oven/bun:${BUN_VERSION}-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN bun build src/index.ts --target=bun --outfile=dist/index.js

FROM oven/bun:${BUN_VERSION}-alpine AS run

WORKDIR /app

ENV NODE_ENV=production
ENV TELEMETRY_ADDRESS=0.0.0.0:9100
ENV METRICS_PATH=/metrics

EXPOSE 9100

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package.json /package.json
COPY --from=build /app/dist ./dist

CMD ["bun", "dist/index.js"]
