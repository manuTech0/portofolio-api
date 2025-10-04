FROM oven/bun:latest AS build

WORKDIR /app

COPY package*.json bun.lock bun.lockb ./

RUN bun install

COPY . .

FROM debian:trixie-slim
WORKDIR /app
COPY --from=build /app .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "run", "index.ts"]