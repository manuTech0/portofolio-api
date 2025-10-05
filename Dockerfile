FROM oven/bun:latest AS build
WORKDIR /app
COPY package*.json bun.lock ./
RUN bun install --production
RUN apt-get update -y && apt-get install -y openssl
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "run", "index.ts"]
