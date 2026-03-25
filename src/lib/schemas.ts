// src/lib/schemas.ts
import { z } from 'zod';
import { isValid } from 'date-fns';
import { RigRegistrationSchema, ApplicationFeeSchema, OwnerInfoSchema } from './schemas/eTenderSchema';
import type { RigRegistration, ApplicationFee, OwnerInfo } from './schemas/eTenderSchema';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type LoginFormData = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});
export type RegisterFormData = z.infer<typeof RegisterSchema>;

// Schema for new user creation by an admin
export const NewUserByAdminSchema = z.object({
  designation: z.string().min(1, "Please select a designation."),
  staffId: z.string({ required_error: "Please select a staff member." }).min(1, "Please select a staff member."),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type NewUserByAdminFormData = z.infer<typeof NewUserByAdminSchema>;

export const userRoleOptions = ['superAdmin', 'admin', 'scientist', 'engineer', 'investigator', 'supervisor', 'viewer'] as const;
export type UserRole = typeof userRoleOptions[number];


// Re-export everything from specialized schema files
export * from './schemas/DataEntrySchema';
export * from './schemas/eTenderSchema';
