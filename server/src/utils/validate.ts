import { ZodSchema } from 'zod'

export const validate = <T>(schema: ZodSchema<T>, data: unknown) => schema.parse(data)

