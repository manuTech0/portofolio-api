import winston from "winston"

const { combine, timestamp, printf, colorize } = winston.format

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] [${level}] ${message}`
})

const isDev = process.env.NODE_ENV !== "production"

export const logger = winston.createLogger({
  level: "info",
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: isDev
    ? [
        new winston.transports.Console({
          format: combine(colorize(), timestamp(), logFormat),
        }),
      ]
    : [
        new winston.transports.File({ filename: "logs/all.log" }),
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
      ],
})