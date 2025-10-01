import { z } from "zod";
import prisma from "./prisma";

export const loginSchema = z.object({
  email: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Email is required"
          : "Email must be a valid string"
    })
    .email({ error: "Invalid email address" }),

  password: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Password is required"
          : "Password must be a valid string"
    })
    .min(8, { error: "Password must be at least 8 characters long" })
    .max(64, { error: "Password must not exceed 64 characters" })
    .regex(/[A-Z]/, { error: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { error: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { error: "Password must contain at least one number" })
    .regex(/[\W_]/, { error: "Password must contain at least one special character" }),
});
export const SignUpSchema = z.object({
  email: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Email is required"
          : "Email must be a string"
    })
    .email({ message: "Invalid email address" }),

  username: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Username is required"
          : "Username must be a string"
    })
    .min(3, { error: "Username must be at least 3 characters long" })
    .max(20, { error: "Username must not exceed 20 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, {
      error: "Username can only contain letters, numbers, and underscores",
    })
    .superRefine(async (arg, ctx) => {
        const data = await prisma.users.findUnique({ where: { username: arg } })
        if(data) {
          ctx.addIssue({
              code: "custom",
              path: ["username"],
              message: "Username already use"
          })
        }
    }),

  fullname: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Full name is required"
          : "Full name must be a string"
    })
    .min(1, { error: "Full name cannot be empty" })
    .max(50, { error: "Full name must not exceed 50 characters" }),

  password: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Password is required"
          : "Password must be a string"
    })
    .min(8, { error: "Password must be at least 8 characters long" })
    .max(64, { error: "Password must not exceed 64 characters" })
    .regex(/[A-Z]/, { error: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { error: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { error: "Password must contain at least one number" })
    .regex(/[\W_]/, { error: "Password must contain at least one special character" }),

  confirmPassword: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Please confirm your password"
          : "Confirm password must be a string"
    })
    .min(8, { error: "Confirm password must be at least 8 characters long" }),
})
.superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }
});
