// src/lib/schemas.ts
import { z } from 'zod';
import { isValid } from 'date-fns';

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


// ARS Schemas
export const arsStatusOptions = [
    "Proposal Submitted", 
    "AS & TS Issued", 
    "Tendered", 
    "Selection Notice Issued", 
    "Work Order Issued", 
    "Work Initiated", 
    "Work in Progress", 
    "Work Failed", 
    "Work Completed", 
    "Bill Prepared", 
    "Payment Completed"
] as const;
export type ArsStatus = typeof arsStatusOptions[number];


export const arsTypeOfSchemeOptions = [
  "Dugwell Recharge",
  "Borewell Recharge",
  "Recharge Pit",
  "Check Dam",
  "Sub-Surface Dyke",
  "Pond Renovation",
  "Percolation Ponds",
] as const;


// Re-export everything from specialized schema files
export * from './schemas/DataEntrySchema';
export * from './schemas/eTenderSchema';


// The schemas below were originally in this file and are kept for compatibility.
// In the future, they should be moved to their own specialized files.

import { SiteDetailSchema, constituencyOptions, MediaItemSchema, optionalDateSchema } from './schemas/DataEntrySchema';
import type { SiteDetailFormData } from './schemas/DataEntrySchema';

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});
export type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;

// Agency Registration Schemas
export const AgencyApplicationSchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().optional(),
  agencyName: z.string().min(1, "Agency name & address is required."),
  owner: OwnerInfoSchema,
  partners: z.array(OwnerInfoSchema).optional(),
  
  applicationFees: z.array(ApplicationFeeSchema).optional(),

  // Agency Registration
  agencyRegistrationNo: z.string().optional(),
  agencyRegistrationDate: optionalDateSchema,
  agencyRegistrationFee: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  agencyPaymentDate: optionalDateSchema,
  agencyChallanNo: z.string().optional(),
  agencyAdditionalRegFee: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  agencyAdditionalPaymentDate: optionalDateSchema,
  agencyAdditionalChallanNo: z.string().optional(),
  
  rigs: z.array(RigRegistrationSchema),
  status: z.enum(['Active', 'Pending Verification']),
  history: z.array(z.string()).optional(),
  remarks: z.string().optional(),
  officeLocation: z.string().optional(),
});
export type AgencyApplication = z.infer<typeof AgencyApplicationSchema>;

// Settings Schemas
export interface LsgConstituencyMap {
  id: string;
  name: string; // Name of the Local Self Government
  constituencies: string[]; // Array of associated constituencies
}

export interface OfficeAddress {
  id: string;
  officeName: string;
  officeLocation: string;
  officeCode: string;
  officeNameMalayalam?: string;
  address?: string;
  addressMalayalam?: string;
  phoneNo?: string;
  email?: string;
  districtOfficerStaffId?: string;
  districtOfficer?: string;
  districtOfficerPhotoUrl?: string;
  gstNo?: string;
  panNo?: string;
  otherDetails?: string;
  stsbAccountNo?: string;
  nameOfTreasury?: string;
  bankAccountNo?: string;
  nameOfBank?: string;
  bankBranch?: string;
  bankIfsc?: string;
}

export const arsWorkStatusOptions = [
    "Proposal Submitted",
    "AS & TS Issued",
    "Tendered",
    "Selection Notice Issued",
    "Work Order Issued",
    "Work Initiated",
    "Work in Progress",
    "Work Failed",
    "Work Completed",
    "Bill Prepared",
    "Payment Completed"
] as const;

// Vehicle Management Schemas
export const rcStatusOptions = ["Active", "Cancelled", "Garaged"] as const;
export type RCStatus = typeof rcStatusOptions[number];

export const DepartmentVehicleSchema = z.object({
    id: z.string().optional(),
    registrationNumber: z.string().min(1, "Registration Number is required."),
    model: z.string().optional(),
    chassisNo: z.string().optional(),
    typeOfVehicle: z.string().optional(),
    vehicleClass: z.string().optional(),
    registrationDate: optionalDateSchema,
    rcStatus: z.enum(rcStatusOptions).optional(),
    fuelConsumptionRate: z.string().optional(),
    fitnessExpiry: optionalDateSchema,
    taxExpiry: optionalDateSchema,
    insuranceExpiry: optionalDateSchema,
    pollutionExpiry: optionalDateSchema,
    fuelTestExpiry: optionalDateSchema,
    officeLocation: z.string().optional(),
});
export type DepartmentVehicle = z.infer<typeof DepartmentVehicleSchema>;

export const HiredVehicleSchema = z.object({
    id: z.string().optional(),
    registrationNumber: z.string().min(1, "Registration Number is required."),
    model: z.string().optional(),
    ownerName: z.string().optional(),
    ownerAddress: z.string().optional(),
    agreementValidity: optionalDateSchema,
    vehicleClass: z.string().optional(),
    registrationDate: optionalDateSchema,
    rcStatus: z.enum(rcStatusOptions).optional(),
    hireCharges: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
    fitnessExpiry: optionalDateSchema,
    taxExpiry: optionalDateSchema,
    insuranceExpiry: optionalDateSchema,
    pollutionExpiry: optionalDateSchema,
    permitExpiry: optionalDateSchema,
    officeLocation: z.string().optional(),
});
export type HiredVehicle = z.infer<typeof HiredVehicleSchema>;

export const rigStatusOptions = ["Active", "Garaged"] as const;
export type RigStatus = typeof rigStatusOptions[number];

export const RigCompressorSchema = z.object({
    id: z.string().optional(),
    typeOfRigUnit: z.string().optional(),
    status: z.enum(rigStatusOptions).default('Active').optional(),
    fuelConsumption: z.string().optional(),
    rigVehicleRegNo: z.string().optional(),
    compressorVehicleRegNo: z.string().optional(),
    supportingVehicleRegNo: z.string().optional(),
    compressorDetails: z.string().optional(),
    remarks: z.string().optional(),
    officeLocation: z.string().optional(),
    isExternal: z.boolean().optional().default(false),
    externalOffice: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.isExternal) {
        if (!data.externalOffice) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Owning Office is required.",
                path: ["externalOffice"],
            });
        }
    } else {
        if (!data.typeOfRigUnit || data.typeOfRigUnit.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Type of Rig Unit is required.",
                path: ["typeOfRigUnit"],
            });
        }
    }
});
export type RigCompressor = z.infer<typeof RigCompressorSchema>;

    
// Staff Schemas
export const staffStatusOptions = ["Active", "Transferred", "Retired", "Pending Transfer"] as const;
export type StaffStatusType = typeof staffStatusOptions[number];

const dateOrString = z.union([
  z.date(),
  z.string().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  })
]);

const BaseStaffMemberFormDataSchema = z.object({
  photoUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal("")),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  nameMalayalam: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  designationMalayalam: z.string().optional().nullable(),
  pen: z.string().min(1, { message: "PEN is required." }),
  email: z.string().email().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  serviceStartDate: z.string().optional().nullable(),
  serviceEndDate: z.string().optional().nullable(),
  phoneNo: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }).optional().or(z.literal("")),
  roles: z.string().optional().nullable(),
  status: z.preprocess((val) => (val === "" ? undefined : val), z.enum(staffStatusOptions).default('Active')),
  remarks: z.string().optional().default(""),
  officeLocation: z.string().optional().nullable(),
  
  // Fields for creating a user account
  createUserAccount: z.boolean().optional().default(false),
  password: z.string().optional().nullable(),
});

export const StaffMemberFormDataSchema = BaseStaffMemberFormDataSchema.superRefine((data, ctx) => {
    if (data.createUserAccount) {
      if (!data.email || !z.string().email().safeParse(data.email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A valid email is required.",
          path: ["email"],
        });
      }
    }
});
export type StaffMemberFormData = z.infer<typeof StaffMemberFormDataSchema>;


export const StaffMemberSchema = BaseStaffMemberFormDataSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(staffStatusOptions).default('Active'),
  remarks: z.string().optional().default(""),
  dateOfBirth: dateOrString.nullable().optional(),
  serviceStartDate: dateOrString.nullable().optional(),
  serviceEndDate: dateOrString.nullable().optional(),
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

export const gwdRateCategories = [
    "GW Investigation",
    "Borewell Construction 110 mm dia (4.5\")",
    "Borewell Construction 150 mm dia (6\")",
    "Tubewell Construction 150 mm dia (6\")",
    "Tubewell Construction 200 mm dia (8\")",
    "Rotary cum DTH Drilling",
    "Filter Point Well Construction 110 mm (4.5\")",
    "Well Developing",
    "Logging & Pumping Test"
] as const;
export type GwdRateCategory = typeof gwdRateCategories[number];

// GWD Rates Schemas
export const GwdRateItemFormDataSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  rate: z.coerce.number({ invalid_type_error: 'Rate must be a number.'}).min(0, 'Rate cannot be negative.'),
  category: z.enum(gwdRateCategories).optional(),
});
export type GwdRateItemFormData = z.infer<typeof GwdRateItemFormDataSchema>;

export const GwdRateItemSchema = GwdRateItemFormDataSchema.extend({
  id: z.string(),
  order: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  category: z.enum(gwdRateCategories).optional(),
});
export type GwdRateItem = z.infer<typeof GwdRateItemSchema>;

import { RigRegistrationSchema, ApplicationFeeSchema, OwnerInfoSchema } from './schemas/eTenderSchema';
import type { RigRegistration, ApplicationFee, OwnerInfo } from './schemas/eTenderSchema';
