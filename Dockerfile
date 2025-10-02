FROM oven/bun:latest AS build

WORKDIR /app

COPY package*.json bun.lock bun.lockb./

RUN bun install

COPY . .

FROM debian:buildseye-slim
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000

CMD ["bun", "run", "index.ts"]