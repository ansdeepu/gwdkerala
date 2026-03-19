
// src/lib/schemas/DataEntrySchema.ts
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';

export const optionalNumber = (errorMessage: string = "Must be a valid number.") =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (typeof val === 'string' && isNaN(Number(val))) return undefined;
    return val;
}, z.number({ coerce: true, invalid_type_error: errorMessage }).min(0, "Cannot be negative.").optional());

const nativeDateSchema = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)) || val === '', { message: "Invalid date" })
);

export const MediaItemSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  url: z.string().url("Please enter a valid URL"),
  description: z.string().optional().nullable(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

export const designationOptions = [
    "Director",
    "Superintending Engineer (General)",
    "Superintending Engineer (NHP)",
    "Superintending Hydrogeologist (General)",
    "Superintending Hydrogeologist (NHP)",
    "District Officer", "Executive Engineer", "Senior Hydrogeologist", "Senior Geophysicist", "Assistant Executive Engineer",
    "Hydrogeologist", "Geophysicist", "Assistant Engineer", "Junior Hydrogeologist",
    "Junior Geophysicist", "Geological Assistant", "Geophysical Assistant", "Master Driller",
    "Senior Driller", "Driller", "Driller Mechanic", "Drilling Assistant", "Compressor Driver",
    "Pump Operator", "Driver, HDV", "Driver, LDV", "Senior Clerk", "Clerk", "U D Typist",
    "L D Typist", "Tracer", "Draftsman", "Lascar", "Office Attendant", "Watcher", "PTS",
] as const;
export type Designation = typeof designationOptions[number];

export const designationMalayalamOptions = [
    "Director",
    "Superintending Engineer (General)",
    "Superintending Engineer (NHP)",
    "Superintending Hydrogeologist (General)",
    "Superintending Hydrogeologist (NHP)",
    "ജില്ലാ ഓഫീസർ", "എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ", "സീനിയർ ഹൈഡ്രോജിയോളജിസ്റ്റ്", "Senior Geophysicist",
    "അസിസ്റ്റന്റ് എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ", "ഹൈഡ്രോജിയോളജിസ്റ്റ്", "ജിയോഫിസിസ്റ്റ്",
    "അസിസ്റ്റന്റ് എഞ്ചിനീയർ", "ജൂനിയർ ഹൈഡ്രോജിയോളജിസ്റ്റ്", "ജൂനിയർ ജിയോഫിസിസ്റ്റ്",
    "ജിയോളജിക്കൽ അസിസ്റ്റന്റ്", "ജിയോഫിസിക്കൽ അസിസ്റ്റന്റ്", "മാസ്റ്റർ ഡ്രില്ലർ",
    "സീനിയർ ഡ്രില്ലർ", "ഡ്രില്ലർ", "ഡ്രില്ലർ മെക്കാനിക്ക്", "ഡരില്ലിംഗ് അസിസ്റ്റന്റ്",
    "കംപ്രസ്സർ ഡ്രൈവർ", "പമ്പ് ഓപ്പറേറ്റർ", "ഡ്രൈവർ, എച്ച്ഡിവി", "ഡ്രൈവർ, എൽഡിവി",
    "സീനിയർ ക്ലർക്ക്", "ക്ലർക്ക്", "യു.ഡി ടൈപ്പിസ്റ്റ്", "എൽ.ഡി ടൈപ്പിസ്റ്റ്",
    "ട്രേസർ", "ഡ്രാഫ്റ്റ്‌സ്മാൻ", "ലാസ്കർ", "ഓഫീസ് അറ്റൻഡന്റ്", "വാച്ചർ", "പിടിഎസ്"
] as const;
export type DesignationMalayalam = typeof designationMalayalamOptions[number];

export const PUBLIC_DEPOSIT_APPLICATION_TYPES = ["LSGD", "Government_Institution", "Government_Water_Authority", "Government_PMKSY", "Government_Others", "Other_Schemes"] as const;
export const PRIVATE_APPLICATION_TYPES = ["Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"] as const;
export const COLLECTOR_APPLICATION_TYPES = ["Collector_MPLAD", "Collector_MLASDF", "Collector_MLA_Asset_Development_Fund", "Collector_DRW", "Collector_SC/ST", "Collector_ARWSS", "Collector_Others"] as const;
export const PLAN_FUND_APPLICATION_TYPES = ["GWBDWS"] as const;
export const GW_INVESTIGATION_TYPES = ["GW_Investigation"] as const;
export const LOGGING_PUMPING_TEST_TYPES = ["Logging_Pumping_Test"] as const;

export const INVESTIGATION_GOVT_TYPES = ["Government Institution", "Government Water Authority", "Government Infrastructure", "Government Industry", "Government Others", "Government PMKSY", "MPLAD", "MLASDF", "MLA Asset development Fund", "Collector DRW", "Collector SC/ST", "Collector ARWSS", "Collector PMKSY", "Collector Others", "LSGD", "MGNRES", "Others", "GWBDWS", "ARS"] as const;
export const INVESTIGATION_PRIVATE_TYPES = ["Private Individuals", "Private Institution", "Private Infra structure", "Private Industry"] as const;
export const INVESTIGATION_COMPLAINT_TYPES = ["Complaints Illegal Well Construction", "Complaints Groundwater extraction without NOC", "Complaints Groundwater Pollution", "Complaints Chief Minister’s Grievance Redressal Cell", "Complaints Others"] as const;

export const LOGGING_PUMPING_TEST_GOVT_TYPES = [...INVESTIGATION_GOVT_TYPES];
export const LOGGING_PUMPING_TEST_PRIVATE_TYPES = [...INVESTIGATION_PRIVATE_TYPES];

export const applicationTypeOptions = [...PRIVATE_APPLICATION_TYPES, ...PUBLIC_DEPOSIT_APPLICATION_TYPES, ...COLLECTOR_APPLICATION_TYPES, ...PLAN_FUND_APPLICATION_TYPES, ...GW_INVESTIGATION_TYPES, ...LOGGING_PUMPING_TEST_TYPES, ...INVESTIGATION_GOVT_TYPES, ...INVESTIGATION_PRIVATE_TYPES, ...INVESTIGATION_COMPLAINT_TYPES, ...LOGGING_PUMPING_TEST_GOVT_TYPES, ...LOGGING_PUMPING_TEST_PRIVATE_TYPES] as const;
export type ApplicationType = typeof applicationTypeOptions[number];

export const applicationTypeDisplayMap = Object.fromEntries(applicationTypeOptions.map(option => [option, option.replace(/_/g, " ")])) as Record<ApplicationType, string>;

export const constituencyOptions = ["Chadayamangalam", "Chathannoor", "Chavara", "Eravipuram", "Kollam", "Kottarakkara", "Kundara", "Kunnathur", "Karunagappally", "Pathanapuram", "Punalur"] as const;
export type Constituency = typeof constituencyOptions[number];

export const remittedAccountOptions = ["Bank", "STSB", "Revenue Head", "Plan Fund"] as const;
export type RemittedAccount = typeof remittedAccountOptions[number];

export const RemittanceDetailSchema = z.object({
  id: z.string().optional(),
  amountRemitted: optionalNumber("Amount Remitted must be a valid number."),
  dateOfRemittance: z.string().optional(),
  remittedAccount: z.enum(remittedAccountOptions),
  remittanceRemarks: z.string().optional(),
}).superRefine((data, ctx) => {
    const hasAnyValue = (data.amountRemitted && data.amountRemitted > 0) || (data.remittanceRemarks && data.remittanceRemarks.trim() !== '');
    if (hasAnyValue && (!data.dateOfRemittance || !data.remittedAccount)) {
        if (!data.dateOfRemittance) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "is required when details are entered.", path: ["dateOfRemittance"] });
    }
});
export type RemittanceDetailFormData = z.infer<typeof RemittanceDetailSchema>;

export const reappropriationTypeOptions = ["Inward", "Outward"] as const;
export type ReappropriationType = typeof reappropriationTypeOptions[number];

export const ReappropriationDetailSchema = z.object({
  id: z.string().optional(),
  type: z.enum(reappropriationTypeOptions).default("Outward"),
  pageType: z.string().optional(),
  refFileNo: z.string().min(1, "Reference File No. is required."),
  fileDetails: z.string().optional(),
  amount: optionalNumber().refine(val => val !== undefined && val > 0, "Amount must be greater than zero."),
  date: z.string().min(1, "Date is required."),
  remarks: z.string().optional(),
});
export type ReappropriationDetailFormData = z.infer<typeof ReappropriationDetailSchema>;

export const paymentAccountOptions = ["Bank", "STSB", "Plan Fund"] as const;
export type PaymentAccount = typeof paymentAccountOptions[number];

export const PaymentDetailSchema = z.object({
  id: z.string().optional(),
  remittanceId: z.string().optional().nullable(),
  dateOfPayment: z.string().optional(),
  paymentAccount: z.enum(paymentAccountOptions),
  revenueHead: optionalNumber(),
  contractorsPayment: optionalNumber(),
  gst: optionalNumber(),
  incomeTax: optionalNumber(),
  kbcwb: optionalNumber(),
  refundToParty: optionalNumber(),
  totalPaymentPerEntry: z.coerce.number().optional(),
  paymentRemarks: z.string().optional(),
});
export type PaymentDetailFormData = z.infer<typeof PaymentDetailSchema>;

export const siteWorkStatusOptions = ["Under Process", "Addl. AS Awaited", "To be Refunded", "Awaiting Dept. Rig", "To be Tendered", "TS Pending", "Tendered", "Selection Notice Issued", "Work Order Issued", "Work Initiated", "Work in Progress", "Work Failed", "Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Pending", "VES Pending"] as const;
export type SiteWorkStatus = typeof siteWorkStatusOptions[number];

export const INVESTIGATION_WORK_STATUS_OPTIONS = ["Pending", "VES Pending", "Work Completed"] as const;
export const LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS = ["Under Process", "Work Completed"] as const;

export const fileStatusOptions = ["File Under Process", "Rig Accessibility Inspection", "Technical Sanction", "Tender Process", "Work Initiated", "Fully Completed", "Partially Completed", "Completed Except Disputed", "Partially Completed Except Disputed", "Fully Disputed", "To be Refunded", "Bill Preparation", "Payments", "Utilization Certificate", "File Closed"] as const;
export type FileStatus = typeof fileStatusOptions[number];

export const LOGGING_PUMPING_TEST_PURPOSE_OPTIONS = ["Geological logging", "Geophysical Logging", "Industry Pumping test", "MWSS Pumping test", "Pumping Test Others"] as const;

export const sitePurposeOptions = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS", "GW Investigation", "Geological logging", "Geophysical Logging", "VES", "Pumping test", "Industry Pumping test", "MWSS Pumping test", "Others", "Pumping Test Others"] as const;
export type SitePurpose = typeof sitePurposeOptions[number];

export const REPORTING_PURPOSE_ORDER = [
  "GW Investigation",
  "VES",
  "Pumping test",
  "Geological logging",
  "Geophysical Logging",
  "BWC",
  "TWC",
  "FPW",
  "BW Dev",
  "TW Dev",
  "FPW Dev",
  "MWSS",
  "MWSS Ext",
  "Pumping Scheme",
  "MWSS Pump Reno",
  "HPS",
  "HPR",
  "ARS"
] as const;

export const PUMPING_TEST_AGGREGATE_PURPOSES = ["Pumping test", "Industry Pumping test", "MWSS Pumping test", "Others", "Pumping Test Others"] as const;
export const INVESTIGATION_APP_TYPE_PURPOSES = ["Geological logging", "Geophysical Logging"] as const;
export const INVESTIGATION_WELL_TYPE_PURPOSES = ["GW Investigation", "VES"] as const;

export const siteDiameterOptions = ["110 mm (4.5”)", "150 mm (6”)", "200 mm (8”)"] as const;
export type SiteDiameter = typeof siteDiameterOptions[number];

export const siteTypeOfRigOptions = ["Rotary 7", "Rotary 8", "DTH Rig", "DTH Rig, W&S", "Other Dept Rig", "Filter Point Rig", "Private Rig"] as const;
export type SiteTypeOfRig = typeof siteTypeOfRigOptions[number];

export const siteConditionsOptions = ['Accessible to Dept. Rig', 'Accessible to Private Rig', 'Inaccessible to Other Rigs', 'Land Dispute', 'Work Disputes and Conflicts'] as const;
export type SiteConditions = typeof siteConditionsOptions[number];

export const typeOfWellOptions = ["Open Well", "Bore Well", "Tube Well", "Filter Point Well"] as const;
export type TypeOfWell = typeof typeOfWellOptions[number];

export const SiteDetailSchema = z.object({
  id: z.string().optional(),
  nameOfSite: z.string().min(1, "Name of Site is required."),
  localSelfGovt: z.string().optional(),
  constituency: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.enum(constituencyOptions).optional().nullable()),
  latitude: optionalNumber(),
  longitude: optionalNumber(),
  purpose: z.string().min(1).optional(),
  estimateAmount: optionalNumber(),
  remittedAmount: optionalNumber(),
  siteConditions: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteConditionsOptions).optional()),
  accessibleRig: z.string().optional(),
  tsAmount: optionalNumber(),
  tenderNo: z.string().optional(),
  diameter: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteDiameterOptions).optional()),
  pilotDrillingDepth: z.string().optional().nullable(),
  totalDepth: optionalNumber(),
  casingPipeUsed: z.string().optional().nullable(),
  outerCasingPipe: z.string().optional().nullable(),
  innerCasingPipe: z.string().optional().nullable(),
  yieldDischarge: z.string().optional().nullable(),
  zoneDetails: z.string().optional().nullable(),
  waterLevel: z.string().optional().nullable(),
  drillingRemarks: z.string().optional().nullable().default(""),
  developingRemarks: z.string().optional().nullable().default(""),
  schemeRemarks: z.string().optional().nullable().default(""),
  pumpDetails: z.string().optional().nullable(),
  pumpingLineLength: z.string().optional().nullable(),
  deliveryLineLength: z.string().optional().nullable(),
  waterTankCapacity: z.string().optional().nullable(),
  noOfTapConnections: optionalNumber(),
  noOfBeneficiary: z.string().optional().nullable(),
  dateOfCompletion: nativeDateSchema.optional().nullable(),
  typeOfRig: z.preprocess((val) => (val === "" || val === null || val === '_clear_' ? undefined : val), z.string().optional()),
  contractorName: z.string().optional(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  supervisorDesignation: z.string().optional().nullable(),
  totalExpenditure: optionalNumber(),
  workStatus: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteWorkStatusOptions).optional()),
  implementationRemarks: z.string().optional().nullable().default(""),
  workRemarks: z.string().optional().nullable().default(""),
  surveyOB: z.string().optional().nullable(),
  surveyLocation: z.string().optional().nullable(),
  surveyPlainPipe: z.string().optional().nullable(),
  surveySlottedPipe: z.string().optional().nullable(),
  surveyRemarks: z.string().optional().nullable(),
  surveyRecommendedDiameter: z.string().optional().nullable(),
  surveyRecommendedTD: z.string().optional().nullable(),
  surveyRecommendedOB: z.string().optional().nullable(),
  surveyRecommendedCasingPipe: z.string().optional().nullable(),
  surveyRecommendedPlainPipe: z.string().optional().nullable(),
  surveyRecommendedSlottedPipe: z.string().optional().nullable(),
  surveyRecommendedMsCasingPipe: z.string().optional().nullable(),
  arsTypeOfScheme: z.string().optional().nullable(),
  arsPanchayath: z.string().optional().nullable(),
  arsBlock: z.string().optional().nullable(),
  arsAsTsDetails: z.string().optional().nullable(),
  arsSanctionedDate: nativeDateSchema,
  arsTenderedAmount: optionalNumber(),
  arsAwardedAmount: optionalNumber(),
  arsNumberOfStructures: optionalNumber(),
  arsStorageCapacity: optionalNumber(),
  arsNumberOfFillings: optionalNumber(),
  isArsImport: z.boolean().optional().default(false),
  nameOfInvestigator: z.string().optional().nullable(),
  dateOfInvestigation: nativeDateSchema,
  typeOfWell: z.enum(typeOfWellOptions).optional().nullable(),
  vesRequired: z.enum(["Yes", "No"]).optional(),
  vesInvestigator: z.string().optional().nullable(),
  vesDate: nativeDateSchema,
  feasibility: z.enum(["Yes", "No"]).optional().nullable(),
  hydrogeologicalRemarks: z.string().optional().nullable().default(""),
  geophysicalRemarks: z.string().optional().nullable().default(""),
  workImages: z.array(MediaItemSchema).optional().default([]),
  workVideos: z.array(MediaItemSchema).optional().default([]),
});
export type SiteDetailFormData = z.infer<typeof SiteDetailSchema>;

export const DataEntrySchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().min(1, "File No. is required."),
  applicantName: z.string().min(1, "Applicant is required."),
  phoneNo: z.string().optional(),
  secondaryMobileNo: z.string().optional(),
  category: z.enum(['Govt', 'Private', 'Complaints']).optional(),
  applicationType: z.enum(applicationTypeOptions).optional(),
  constituency: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.enum(constituencyOptions).optional().nullable()),
  estimateAmount: optionalNumber(),
  assignedSupervisorUids: z.array(z.string()).optional(),
  officeLocation: z.string().optional(),
  remittanceDetails: z.array(RemittanceDetailSchema).min(1, "Remittance required."),
  totalRemittance: z.coerce.number().optional(),
  reappropriationDetails: z.array(ReappropriationDetailSchema).optional().default([]),
  totalReappropriation: z.coerce.number().optional().default(0),
  totalReappropriationCredit: z.coerce.number().optional().default(0),
  siteDetails: z.array(SiteDetailSchema).optional(),
  paymentDetails: z.array(PaymentDetailSchema).optional(),
  totalPaymentAllEntries: z.coerce.number().optional(),
  overallBalance: z.coerce.number().optional(),
  fileStatus: z.string().optional(),
  remarks: z.string().optional(),
});
export type DataEntryFormData = z.infer<typeof DataEntrySchema>;

export const reportableFields = [
    { id: 'fileNo', label: 'File No', accessor: (e: any) => e.fileNo, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'applicantName', label: 'Applicant Name', accessor: (e: any) => e.applicantName, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'phoneNo', label: 'Phone No', accessor: (e: any) => e.phoneNo, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'appType', label: 'App Type', accessor: (e: any) => applicationTypeDisplayMap[e.applicationType as ApplicationType] || e.applicationType, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'remittance', label: 'Remittance (₹)', accessor: (e: any) => e.totalRemittance, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'reappropriation', label: 'Re-appropriation (₹)', accessor: (e: any) => e.totalReappropriation, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'expenditure', label: 'Expenditure (₹)', accessor: (e: any) => e.totalPaymentAllEntries, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], arsApplicable: true },
    { id: 'balance', label: 'Balance (₹)', accessor: (e: any) => e.overallBalance, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], arsApplicable: true },
    { id: 'siteName', label: 'Site Name', accessor: (e: any) => e.nameOfSite, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], arsApplicable: true },
    { id: 'purpose', label: 'Purpose', accessor: (e: any) => e.purpose, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'lsg', label: 'LSG', accessor: (e: any) => e.localSelfGovt, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], arsApplicable: true },
    { id: 'constituency', label: 'Constituency', accessor: (e: any) => e.constituency, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], arsApplicable: true },
    { id: 'workStatus', label: 'Work Status', accessor: (e: any) => e.workStatus, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'completionDate', label: 'Completion Date', accessor: (e: any) => e.dateOfCompletion, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], arsApplicable: true },
    { id: 'yield', label: 'Yield (LPH)', accessor: (e: any) => e.yieldDischarge, sources: ['deposit', 'private', 'collector', 'planFund', 'loggingPumpingTest'], purpose: ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme"] },
    { id: 'depth', label: 'Depth (m)', accessor: (e: any) => e.totalDepth, sources: ['deposit', 'private', 'collector', 'planFund'], purpose: ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "HPS", "HPR"] },
    { id: 'diameter', label: 'Diameter (mm)', accessor: (e: any) => e.diameter, sources: ['deposit', 'private', 'collector', 'planFund'], purpose: ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"] },
    { id: 'contractor', label: 'Contractor', accessor: (e: any) => e.contractorName, sources: ['deposit', 'private', 'collector', 'planFund', 'ars'], arsApplicable: true },
    { id: 'supervisor', label: 'Supervisor', accessor: (e: any) => e.supervisorName, sources: ['deposit', 'private', 'collector', 'planFund', 'ars'], arsApplicable: true },
    { id: 'investigator', label: 'Investigator', accessor: (e: any) => e.nameOfInvestigator, sources: ['gwInvestigation'] },
    { id: 'vesInvestigator', label: 'VES Investigator', accessor: (e: any) => e.vesInvestigator, sources: ['gwInvestigation'] },
    { id: 'arsStructures', label: '# ARS Structures', accessor: (e: any) => e.arsNumberOfStructures, sources: ['ars'], arsApplicable: true },
    { id: 'arsCapacity', label: 'ARS Capacity', accessor: (e: any) => e.arsStorageCapacity, sources: ['ars'], arsApplicable: true },
    { id: 'arsFillings', label: 'ARS Fillings', accessor: (e: any) => e.arsNumberOfFillings, sources: ['ars'], arsApplicable: true },
    { id: 'arsType', label: 'ARS Type', accessor: (e: any) => e.arsTypeOfScheme, sources: ['ars'], arsApplicable: true },
    { id: 'officeLocation', label: 'Office', accessor: (e: any) => e.officeLocationFromPath || e.officeLocation, sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], arsApplicable: true },
];

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
  designation: z.string().optional(),
  designationMalayalam: z.string().optional(),
  pen: z.string().min(1, { message: "PEN is required." }),
  email: z.string().optional(),
  dateOfBirth: z.string().optional(),
  serviceStartDate: z.string().optional(),
  serviceEndDate: z.string().optional(),
  phoneNo: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }).optional().or(z.literal("")),
  roles: z.string().optional(),
  status: z.preprocess((val) => (val === "" ? undefined : val), z.enum(staffStatusOptions).default('Active')),
  remarks: z.string().optional().default(""),
  officeLocation: z.string().optional(),
  
  // Fields for creating a user account
  createUserAccount: z.boolean().optional().default(false),
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
