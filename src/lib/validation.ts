import { z } from "zod";

const stripHtml = (val: string) => val.replace(/<[^>]*>/g, "").trim();

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .transform(stripHtml)
  .refine((v) => /^[a-zA-Z\s'.,-]+$/.test(v), "Name can only contain letters, spaces, and basic punctuation");

export const emailSchema = z
  .string()
  .email("Please enter a valid email address (e.g. name@example.com)")
  .max(255, "Email must be less than 255 characters");

export const optionalEmailSchema = z
  .string()
  .max(255, "Email must be less than 255 characters")
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Please enter a valid email address")
  .optional()
  .or(z.literal(""));

export const textFieldSchema = (label: string, maxLen = 200) =>
  z
    .string()
    .max(maxLen, `${label} must be less than ${maxLen} characters`)
    .transform(stripHtml)
    .optional()
    .or(z.literal(""));

export const visitorRegistrationSchema = z.object({
  name: nameSchema,
  email: optionalEmailSchema,
  department: textFieldSchema("Department"),
  branch: textFieldSchema("Branch"),
  college: textFieldSchema("College"),
  organization: textFieldSchema("Organization"),
});

export type VisitorFormData = z.infer<typeof visitorRegistrationSchema>;

export const reviewSchema = z.object({
  projectTitle: z.string().min(1, "Project title is required").max(200, "Project title too long").transform(stripHtml),
  reviewText: z.string().max(1000, "Review must be less than 1000 characters").transform(stripHtml).optional().or(z.literal("")),
  rating: z.number().min(1, "Please give a rating").max(5),
});

export const teamMemberSchema = z.object({
  name: nameSchema,
  role: textFieldSchema("Role"),
  email: optionalEmailSchema,
  department: textFieldSchema("Department"),
});

export function validateVisitorForm(form: Record<string, string>) {
  const result = visitorRegistrationSchema.safeParse(form);
  if (result.success) {
    return { success: true as const, data: result.data, errors: {} as Record<string, string> };
  }
  const errors: Record<string, string> = {};
  result.error.errors.forEach((e) => {
    const key = e.path[0] as string;
    if (!errors[key]) errors[key] = e.message;
  });
  return { success: false as const, data: null, errors };
}

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true as const, data: result.data, errors: {} as Record<string, string> };
  }
  const errors: Record<string, string> = {};
  result.error.errors.forEach((e) => {
    const key = e.path[0] as string;
    if (!errors[key]) errors[key] = e.message;
  });
  return { success: false as const, data: null, errors };
}
