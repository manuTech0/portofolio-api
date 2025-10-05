# Stage 1: build dependencies dan compile
FROM oven/bun:latest AS build
WORKDIR /app
COPY package*.json bun.lock ./
RUN bun install --production
COPY . .

# Stage 2: runtime minimal tapi lengkap
FROM debian:trixie-slim
WORKDIR /app
COPY --from=build /app .
COPY --from=build /usr/local/bin/bun /usr/local/bin/bun
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "run", "index.ts"]
