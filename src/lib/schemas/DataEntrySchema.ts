// src/lib/schemas/DataEntrySchema.ts
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';

export const optionalNumber = (errorMessage: string = "Must be a valid number.") =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (typeof val === 'string' && isNaN(Number(val))) return undefined;
    return val;
}, z.number({ coerce: true, invalid_type_error: errorMessage }).min(0, "Cannot be negative.").optional());

export const optionalDateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const d = new Date(val);
    if (isValid(d)) return d;
  }
  return null;
}, z.date().nullable().optional());

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

export const typeOfWellOptions = ["Open Well", "Pond", "Bore Well", "Tube Well", "Filter Point Well"] as const;
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
  diameter: z.string().optional().nullable(),
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
  pondDimensions: z.string().optional().nullable(),
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
