import { builder } from "../../lib/builderSchema";
import { messageMe } from "../types/messageMe";
import { checkRateLimit } from "../../lib/rateLimiter";
import { verifyRecaptchaV2, verifyRecaptchaV3 } from "../../lib/recaptcha";
import { createGRow } from "../../lib/gsheets";

builder.mutationField("sendMessage", (t) =>
  t.field({
    type: messageMe,
    args: {
      name: t.arg.string({ required: true }),
      email: t.arg.string({ required: true }),
      message: t.arg.string({ required: true }),
      recaptchaToken: t.arg.string({ required: true }),
      recaptchaVersion: t.arg.string({ required: false }), // "v2" or "v3", default "v3"
    },
    resolve: async (_, args, ctx) => {
      try {
        // Get IP address from context
        const ip = ctx.req.ip  || "unknown";

        // Check rate limit (3 requests per hour per IP)
        const rateLimit = checkRateLimit(ip, 3, 12 * 60 * 60 * 1000);
        console.table(rateLimit)
        if (!rateLimit.allowed) {
          const resetDate = new Date(rateLimit.resetTime);
          return {
            type: "error",
            success: false,
            isBot: false,
            needVerify: false,
            message: `Rate limit exceeded. Please try again after ${resetDate.toLocaleTimeString()}`,
          };
        } else {
  
          // Determine reCAPTCHA version
          const version = args.recaptchaVersion?.toLowerCase() === "v2" ? "v2" : "v3";
          
          // Verify reCAPTCHA
          let isHuman = false;
          let recaptchaScore = 0;
  
          if (version === "v2") {
            isHuman = await verifyRecaptchaV2(args.recaptchaToken);
          } else {
            const result = await verifyRecaptchaV3(args.recaptchaToken, 0.5);
            isHuman = result.success;
            recaptchaScore = result.score;
          }
  
          if (!isHuman) {
            return {
              type: "error",
              success: false,
              isBot: true,
              needVerify: version === "v3", // Suggest v2 if v3 failed
              message: "Is bot"
            };
          }
  
          // Validate input
          if (!args.name.trim() || !args.email.trim() || !args.message.trim()) {
            return {
              type: "error",
              success: false,
              isBot: false,
              needVerify: false,
              message: "data is invalid"
            };
          }
  
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(args.email)) {
            return {
              type: "error",
              success: false,
              isBot: false,
              needVerify: false,
              message: "email invalid"
            };
          }
  
          // Save to Google Sheets
          await createGRow({
            name: args.name,
            email: args.email,
            message: args.message,
          });
  
          return {
            type: "success",
            success: true,
            isBot: false,
            needVerify: false,
            message: "success create 1 row"
          };
        }
      } catch (error) {
        console.error("Send message error:", error);
        return {
          type: "error",
          success: false,
          isBot: false,
          needVerify: false,
          message: (error as any).message || "An error occurated"
        };
      }
    },
  })
);