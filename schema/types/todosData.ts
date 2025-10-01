import z, { ZodError } from "zod"
import DOMPurify from "isomorphic-dompurify"
import { builder } from "../../lib/builderSchema"

const todoSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => DOMPurify.sanitize(typeof val == "number" ? val.toString() : val)),
  title: z.string().max(100).transform(val => DOMPurify.sanitize(val)),
  description: z.string().max(255).transform(val => DOMPurify.sanitize(val)),
  done: z.boolean().default(false),
  createdAt: z.string().transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), {
      message: "Invalid createdAt date"
    }),
  updateAt: z.string().transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), {
      message: "Invalid createdAt date"
    })
})

export const todosSchema = z.string().superRefine((val, ctx) => {
    const data: z.infer<typeof todoSchema>[] | null = (() => {
        try {
            return JSON.parse(Buffer.from(val, "base64").toString("utf-8"))
        } catch {
            return null
        }
    })()
    
    if(!data) {
        return ctx.addIssue({
            code: "custom",
            path: ["data"],
            message: "Invalid parse data"
        })
    } else {
        const error: string[] = []
        const path: string[] = []
        for(const d of data) {
            try {
                const validatedData = todoSchema.parse(d)
            } catch (e) {
                if(e instanceof ZodError) {
                    const zodErr = e.issues.map((i) => {
                        error.push(`${i.path}: ${i.message}`)
                        path.push(`${i.path}`)
                    })
                }
            }
        }
        if(!data) {
            return ctx.addIssue({
                code: "custom",
                path: path,
                message: error.join("/n")
            })
        }
    }

})