
// src/lib/schemas.ts
import { z } from 'zod';
import { isValid } from 'date-fns';

export const optionalDateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const d = new Date(val);
    if (isValid(d)) return d;
  }
  return null;
}, z.date().nullable().optional());

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

export const designationOptions = [
    "District Officer",
    "Executive Engineer",
    "Senior Hydrogeologist",
    "Assistant Executive Engineer",
    "Hydrogeologist",
    "Geophysicist",
    "Assistant Engineer",
    "Junior Hydrogeologist",
    "Junior Geophysicist",
    "Geological Assistant",
    "Geophysical Assistant",
    "Master Driller",
    "Senior Driller",
    "Driller",
    "Driller Mechanic",
    "Drilling Assistant",
    "Compressor Driver",
    "Pump Operator",
    "Driver, HDV",
    "Driver, LDV",
    "Clerk",
    "Senior Clerk",
    "L D Typist",
    "U D Typist",
    "Tracer",
    "Lascar",
    "Office Attendant",
    "Watcher",
    "PTS",
] as const;
export type Designation = typeof designationOptions[number];

export const designationMalayalamOptions = [
    "ജില്ലാ ഓഫീസർ",
    "എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ",
    "സീനിയർ ഹൈഡ്രോജിയോളജിസ്റ്റ്",
    "അസിസ്റ്റന്റ് എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ",
    "ഹൈഡ്രോജിയോളജിസ്റ്റ്",
    "ജിയോഫിസിസ്റ്റ്",
    "അസിസ്റ്റന്റ് എഞ്ചിനീയർ",
    "ജൂനിയർ ഹൈഡ്രോജിയോളജിസ്റ്റ്",
    "ജൂനിയർ ജിയോഫിസിസ്റ്റ്",
    "ജിയോളജിക്കൽ അസിസ്റ്റന്റ്",
    "ജിയോഫിസിക്കൽ അസിസ്റ്റന്റ്",
    "മാസ്റ്റർ ഡ്രില്ലർ",
    "സീനിയർ ഡ്രില്ലർ",
    "ഡ്രില്ലർ",
    "ഡ്രില്ലർ മെക്കാനിക്ക്",
    "ഡ്രില്ലിംഗ് അസിസ്റ്റന്റ്",
    "കംപ്രസ്സർ ഡ്രൈവർ",
    "പമ്പ് ഓപ്പറേറ്റർ",
    "ഡ്രൈവർ, എച്ച്ഡിവി",
    "ഡ്രൈവർ, എൽഡിവി",
    "ക്ലർക്ക്",
    "സീനിയർ ക്ലർക്ക്",
    "എൽ.ഡി ടൈപ്പിസ്റ്റ്",
    "യു.ഡി ടൈപ്പിസ്റ്റ്",
    "ട്രേസർ",
    "ലാസ്കർ",
    "ഓഫീസ് അറ്റൻഡന്റ്",
    "വാച്ചർ",
    "പിടിഎസ്"
] as const;
export type DesignationMalayalam = typeof designationMalayalamOptions[number];

// Schema for new user creation by an admin
export const NewUserByAdminSchema = z.object({
  designation: z.enum(designationOptions, { required_error: "Please select a designation." }),
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

import { SiteDetailSchema, constituencyOptions } from './schemas/DataEntrySchema';
import type { SiteDetailFormData } from './schemas/DataEntrySchema';

export const ArsEntrySchema = z.object({
  fileNo: z.string().min(1, 'File No. is required.'),
  nameOfSite: z.string().min(1, 'Name of Site is required.'),
  localSelfGovt: z.string().optional(),
  constituency: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(constituencyOptions).optional()),
  arsTypeOfScheme: z.enum(arsTypeOfSchemeOptions).optional(),
  arsBlock: z.string().optional(),
  latitude: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  longitude: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  arsNumberOfStructures: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  arsStorageCapacity: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  arsNumberOfFillings: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  estimateAmount: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  arsAsTsDetails: z.string().optional(),
  tsAmount: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  arsSanctionedDate: optionalDateSchema,
  arsTenderedAmount: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  arsAwardedAmount: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  arsTenderNo: z.string().optional(),
  arsContractorName: z.string().optional(),
  arsStatus: z.enum(arsStatusOptions, { required_error: "ARS status is required." }),
  dateOfCompletion: optionalDateSchema,
  totalExpenditure: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  noOfBeneficiary: z.string().optional(),
  workRemarks: z.string().optional(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  isPending: z.boolean().optional(),
  officeLocation: z.string().optional(),
}).superRefine((data, ctx) => {
    if ((data.arsStatus === 'Work Completed' || data.arsStatus === 'Work Failed') && !data.dateOfCompletion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Completion Date is required for this status.",
            path: ["dateOfCompletion"],
        });
    }
});
export type ArsEntryFormData = z.infer<typeof ArsEntrySchema>;

// This is the type that includes the ID from Firestore
export type ArsEntry = ArsEntryFormData & { id: string };

// Schema for Pending Updates
export const PendingUpdateFormDataSchema = z.object({
  fileNo: z.string(),
  updatedSiteDetails: z.array(z.union([SiteDetailSchema, ArsEntrySchema])),
  fileLevelUpdates: z.object({
      fileStatus: z.string().optional(),
      remarks: z.string().optional(),
  }).optional(),
  submittedByUid: z.string(),
  submittedByName: z.string(),
  submittedAt: z.any(), // serverTimestamp()
  status: z.enum(['pending', 'approved', 'rejected', 'supervisor-unassigned']),
  notes: z.string().optional(),
  isArsUpdate: z.boolean().optional(),
  arsId: z.string().optional(),
});
export type PendingUpdateFormData = z.infer<typeof PendingUpdateFormDataSchema>;

export const PendingUpdateSchema = PendingUpdateFormDataSchema.extend({
  id: z.string(),
  submittedAt: z.date(),
  reviewedByUid: z.string().optional(),
  reviewedAt: z.date().optional(),
});
export type PendingUpdate = z.infer<typeof PendingUpdateSchema>;

// Establishment / Staff Schemas
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
  nameMalayalam: z.string().optional(),
  designation: z.preprocess((val) => (val === "" ? undefined : val), z.enum(designationOptions).optional()),
  designationMalayalam: z.preprocess((val) => (val === "" ? undefined : val), z.enum(designationMalayalamOptions).optional()),
  pen: z.string().min(1, { message: "PEN is required." }),
  dateOfBirth: z.string().optional(),
  serviceStartDate: z.string().optional(),
  phoneNo: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }).optional().or(z.literal("")),
  roles: z.string().optional(),
  status: z.preprocess((val) => (val === "" ? undefined : val), z.enum(staffStatusOptions).default('Active')),
  remarks: z.string().optional().default(""),
  officeLocation: z.string().optional(),
  
  // Fields for creating a user account
  createUserAccount: z.boolean().optional().default(false),
  email: z.string().optional(),
  password: z.string().optional(),
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
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

// GWD Rates Schemas
export const GwdRateItemFormDataSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  rate: z.coerce.number({ invalid_type_error: 'Rate must be a number.'}).min(0, 'Rate cannot be negative.'),
});
export type GwdRateItemFormData = z.infer<typeof GwdRateItemFormDataSchema>;

export const GwdRateItemSchema = GwdRateItemFormDataSchema.extend({
  id: z.string(),
  order: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GwdRateItem = z.infer<typeof GwdRateItemSchema>;

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ["confirmPassword"],
});
export type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;

// Agency Registration Schemas
export const OwnerInfoSchema = z.object({
  name: z.string().min(1, "Partner name is required."),
  address: z.string().optional(),
  mobile: z.string().optional(),
  secondaryMobile: z.string().optional(),
});
export type OwnerInfo = z.infer<typeof OwnerInfoSchema>;

const VehicleDetailsSchema = z.object({
  type: z.string().optional(),
  regNo: z.string().optional(),
  chassisNo: z.string().optional(),
  engineNo: z.string().optional(),
}).optional();

const CompressorDetailsSchema = z.object({
  model: z.string().optional(),
  capacity: z.string().optional(),
}).optional();

const GeneratorDetailsSchema = z.object({
  model: z.string().optional(),
  capacity: z.string().optional(),
  type: z.string().optional(),
  engineNo: z.string().optional(),
}).optional();

export const rigTypeOptions = [
    "Hand Bore",
    "Filter Point Rig",
    "Calyx Rig",
    "Rotary Rig",
    "DTH Rig",
    "Rotary cum DTH Rig",
] as const;
export type RigType = typeof rigTypeOptions[number];

export const applicationFeeTypes = [
    "Agency Registration",
    "Rig Registration",
] as const;
export type ApplicationFeeType = typeof applicationFeeTypes[number];

export const ApplicationFeeSchema = z.object({
    id: z.string(),
    applicationFeeType: z.enum(applicationFeeTypes).optional(),
    applicationFeeAmount: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
    applicationFeeChallanNo: z.string().optional(),
    applicationFeePaymentDate: optionalDateSchema,
});
export type ApplicationFee = z.infer<typeof ApplicationFeeSchema>;

export const RigRenewalSchema = z.object({
    id: z.string(),
    renewalDate: optionalDateSchema,
    renewalFee: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number({invalid_type_error: 'Renewal fee is required.'}).optional()),
    paymentDate: optionalDateSchema,
    challanNo: z.string().optional(),
    validTill: optionalDateSchema,
});
export type RigRenewal = z.infer<typeof RigRenewalSchema>;

export const RigRegistrationSchema = z.object({
    id: z.string(),
    rigRegistrationNo: z.string().optional(),
    typeOfRig: z.enum(rigTypeOptions).optional(),
    registrationDate: optionalDateSchema,
    registrationFee: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
    paymentDate: optionalDateSchema,
    challanNo: z.string().optional(),
    additionalRegistrationFee: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
    additionalPaymentDate: optionalDateSchema,
    additionalChallanNo: z.string().optional(),
    rigVehicle: VehicleDetailsSchema,
    compressorVehicle: VehicleDetailsSchema,
    supportingVehicle: VehicleDetailsSchema,
    compressorDetails: CompressorDetailsSchema,
    generatorDetails: GeneratorDetailsSchema,
    status: z.enum(['Active', 'Cancelled']),
    renewals: z.array(RigRenewalSchema).optional(),
    history: z.array(z.string()).optional(),
    cancellationDate: optionalDateSchema,
    cancellationReason: z.string().optional(),
    // Fields to control visibility of optional sections
    showRigVehicle: z.boolean().optional(),
    showCompressorVehicle: z.boolean().optional(),
    showSupportingVehicle: z.boolean().optional(),
    showCompressorDetails: z.boolean().optional(),
    showGeneratorDetails: z.boolean().optional(),
});
export type RigRegistration = z.infer<typeof RigRegistrationSchema>;

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
    typeOfRigUnit: z.string().min(1, "Type of Rig Unit is required."),
    status: z.enum(rigStatusOptions).default('Active').optional(),
    fuelConsumption: z.string().optional(),
    rigVehicleRegNo: z.string().optional(),
    compressorVehicleRegNo: z.string().optional(),
    supportingVehicleRegNo: z.string().optional(),
    compressorDetails: z.string().optional(),
    remarks: z.string().optional(),
    officeLocation: z.string().optional(),
});
export type RigCompressor = z.infer<typeof RigCompressorSchema>;
