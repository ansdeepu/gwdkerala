
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';

// Helper for robust optional numeric fields
export const optionalNumber = (errorMessage: string = "Must be a valid number.") =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (typeof val === 'string' && isNaN(Number(val))) return undefined;
    return val;
}, z.number({ coerce: true, invalid_type_error: errorMessage }).min(0, "Cannot be negative.").optional());

// Use 'yyyy-MM-dd' for native date pickers
const nativeDateSchema = z.preprocess(
  (val) => (val === "" ? undefined : val), // Treat empty string as undefined
  z.string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)) || val === '', { message: "Invalid date" }) // Allow empty string
);

export const MediaItemSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  url: z.string().url("Please enter a valid URL"),
  description: z.string().optional().nullable(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

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
    "Senior Clerk",
    "Clerk",
    "U D Typist",
    "L D Typist",
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
    "സീനിയർ ക്ലർക്ക്",
    "ക്ലർക്ക്",
    "യു.ഡി ടൈപ്പിസ്റ്റ്",
    "എൽ.ഡി ടൈപ്പിസ്റ്റ്",
    "ട്രേസർ",
    "ലാസ്കർ",
    "ഓഫീസ് അറ്റൻഡന്റ്",
    "വാച്ചർ",
    "പിടിഎസ്"
] as const;
export type DesignationMalayalam = typeof designationMalayalamOptions[number];

export const PUBLIC_DEPOSIT_APPLICATION_TYPES = [
  "LSGD",
  "Government_Institution",
  "Government_Water_Authority",
  "Government_PMKSY",
  "Government_Others",
  "Other_Schemes",
] as const;

export const PRIVATE_APPLICATION_TYPES = [
  "Private_Domestic",
  "Private_Irrigation",
  "Private_Institution",
  "Private_Industry",
] as const;

export const COLLECTOR_APPLICATION_TYPES = [
  "Collector_MPLAD",
  "Collector_MLASDF",
  "Collector_MLA_Asset_Development_Fund",
  "Collector_DRW",
  "Collector_SC/ST",
  "Collector_ARWSS",
  "Collector_Others",
] as const;

export const PLAN_FUND_APPLICATION_TYPES = ["GWBDWS"] as const;

export const GW_INVESTIGATION_TYPES = ["GW_Investigation"] as const;
export const LOGGING_PUMPING_TEST_TYPES = ["Logging_Pumping_Test"] as const;

export const INVESTIGATION_GOVT_TYPES = [
  "Government Institution", "Government Water Authority", "Government Infrastructure", 
  "Government Industry", "Government Others", "Government PMKSY", "MPLAD", "MLASDF", 
  "MLA Asset development Fund", "Collector DRW", "Collector SC/ST", 
  "Collector ARWSS", "Collector PMKSY", "Collector Others", "LSGD", "MGNRES", "Others", "GWBDWS", "ARS"
] as const;

export const INVESTIGATION_PRIVATE_TYPES = [
  "Private Domestic", "Private Irrigation", "Private Institution", "Private Infra structure", "Private Industry"
] as const;

export const INVESTIGATION_COMPLAINT_TYPES = [
  "Complaints Illegal Well Construction", "Complaints Groundwater extraction without NOC", 
  "Complaints Groundwater Pollution", "Complaints Chief Minister’s Grievance Redressal Cell", "Complaints Others"
] as const;

export const LOGGING_PUMPING_TEST_GOVT_TYPES = [
  "Government Institution", "Government Water Authority", "Government Infrastructure", 
  "Government Industry", "Government Others", "Government PMKSY", "MPLAD", "MLASDF", 
  "MLA Asset development Fund", "Collector DRW", "Collector SC/ST", 
  "Collector ARWSS", "Collector PMKSY", "Collector Others", "LSGD", "MGNRES", "Others", "GWBDWS", "ARS"
] as const;

export const LOGGING_PUMPING_TEST_PRIVATE_TYPES = [
  "Private Individuals", "Private Institution", "Private Infra structure", "Private Industry"
] as const;

export const applicationTypeOptions = [
  ...PRIVATE_APPLICATION_TYPES,
  ...PUBLIC_DEPOSIT_APPLICATION_TYPES,
  ...COLLECTOR_APPLICATION_TYPES,
  ...PLAN_FUND_APPLICATION_TYPES,
  ...GW_INVESTIGATION_TYPES,
  ...LOGGING_PUMPING_TEST_TYPES,
  ...INVESTIGATION_GOVT_TYPES,
  ...INVESTIGATION_PRIVATE_TYPES,
  ...INVESTIGATION_COMPLAINT_TYPES,
  ...LOGGING_PUMPING_TEST_GOVT_TYPES,
  ...LOGGING_PUMPING_TEST_PRIVATE_TYPES,
] as const;
export type ApplicationType = typeof applicationTypeOptions[number];

export const applicationTypeDisplayMap = Object.fromEntries(
  applicationTypeOptions.map(option => [option, option.replace(/_/g, " ")])
) as Record<ApplicationType, string>;

export const constituencyOptions = [
    "Chadayamangalam",
    "Chathannoor",
    "Chavara",
    "Eravipuram",
    "Kollam",
    "Kottarakkara",
    "Kundara",
    "Kunnathur",
    "Karunagappally",
    "Pathanapuram",
    "Punalur"
] as const;
export type Constituency = typeof constituencyOptions[number];


export const remittedAccountOptions = [
  "Bank",
  "STSB",
  "Revenue Head",
  "Plan Fund",
] as const;
export type RemittedAccount = typeof remittedAccountOptions[number];

export const RemittanceDetailSchema = z.object({
  id: z.string().optional(),
  amountRemitted: optionalNumber("Amount Remitted must be a valid number."),
  dateOfRemittance: z.string().optional(),
  remittedAccount: z.enum(remittedAccountOptions),
  remittanceRemarks: z.string().optional(),
}).superRefine((data, ctx) => {
    // If an amount or account is present, date is strictly required.
    const hasAnyValue = (data.amountRemitted && data.amountRemitted > 0) || (data.remittanceRemarks && data.remittanceRemarks.trim() !== '');

    if (hasAnyValue && (!data.dateOfRemittance || !data.remittedAccount)) {
        if (!data.dateOfRemittance) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "is required when any other remittance detail is entered.",
                path: ["dateOfRemittance"],
            });
        }
    }
});
export type RemittanceDetailFormData = z.infer<typeof RemittanceDetailSchema>;

export const reappropriationTypeOptions = ["Inward", "Outward"] as const;
export type ReappropriationType = typeof reappropriationTypeOptions[number];

export const ReappropriationDetailSchema = z.object({
  id: z.string().optional(),
  type: z.enum(reappropriationTypeOptions, { required_error: "Type is required." }).default("Outward"),
  pageType: z.string().optional(),
  refFileNo: z.string().min(1, "Reference File No. is required."),
  fileDetails: z.string().optional(),
  amount: optionalNumber("Amount must be a valid number.").refine(val => val !== undefined && val > 0, "Amount must be greater than zero."),
  date: z.string().min(1, "Date is required."),
  remarks: z.string().optional(),
});
export type ReappropriationDetailFormData = z.infer<typeof ReappropriationDetailSchema>;


export const paymentAccountOptions = [
  "Bank",
  "STSB",
  "Plan Fund",
] as const;
export type PaymentAccount = typeof paymentAccountOptions[number];

export const PaymentDetailSchema = z.object({
  id: z.string().optional(),
  remittanceId: z.string().optional().nullable(),
  dateOfPayment: z.string().optional(),
  paymentAccount: z.enum(paymentAccountOptions),
  revenueHead: optionalNumber("Revenue Head must be a valid number."),
  contractorsPayment: optionalNumber("Contractor's Payment must be a valid number."),
  gst: optionalNumber("GST must be a valid number."),
  incomeTax: optionalNumber("Income Tax must be a valid number."),
  kbcwb: optionalNumber("KBCWB must be a valid number."),
  refundToParty: optionalNumber("Refund to Party must be a valid number."),
  totalPaymentPerEntry: z.coerce.number().optional(),
  paymentRemarks: z.string().optional(),
}).superRefine((data, ctx) => {
    const hasAnyAmount =
        (data.revenueHead && data.revenueHead > 0) ||
        (data.contractorsPayment && data.contractorsPayment > 0) ||
        (data.gst && data.gst > 0) ||
        (data.incomeTax && data.incomeTax > 0) ||
        (data.kbcwb && data.kbcwb > 0) ||
        (data.refundToParty && data.refundToParty > 0);

    if (!hasAnyAmount && !data.paymentRemarks?.trim()) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least one payment amount or a remark is required.",
            path: ["contractorsPayment"], // Attach error to a field
        });
    }
});
export type PaymentDetailFormData = z.infer<typeof PaymentDetailSchema>;


export const siteWorkStatusOptions = [
  "Under Process",
  "Addl. AS Awaited",
  "To be Refunded",
  "Awaiting Dept. Rig",
  "To be Tendered",
  "TS Pending",
  "Tendered",
  "Selection Notice Issued",
  "Work Order Issued",
  "Work Initiated",
  "Work in Progress",
  "Work Failed",
  "Work Completed",
  "Bill Prepared",
  "Payment Completed",
  "Utilization Certificate Issued",
  "Pending", // Added for Investigation
  "VES Pending",
] as const;
export type SiteWorkStatus = typeof siteWorkStatusOptions[number];

export const fileStatusOptions = [
  "File Under Process",
  "Rig Accessibility Inspection",
  "Technical Sanction",
  "Tender Process",
  "Work Initiated",
  "Fully Completed",
  "Partially Completed",
  "Completed Except Disputed",
  "Partially Completed Except Disputed",
  "Fully Disputed",
  "To be Refunded",
  "Bill Preparation",
  "Payments",
  "Utilization Certificate",
  "File Closed",
] as const;
export type FileStatus = typeof fileStatusOptions[number];


export const LOGGING_PUMPING_TEST_PURPOSE_OPTIONS = [
  "Geological logging",
  "Geophysical Logging",
  "VES",
  "Pumping test",
  "Industry Pumping test",
  "MWSS Pumping test",
  "Others",
] as const;

export const sitePurposeOptions = [
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
  "ARS",
  "GW Investigation",
  "Geological logging",
  "Geophysical Logging",
  "VES",
  "Pumping test",
  "Industry Pumping test",
  "MWSS Pumping test",
  "Others",
] as const;
export type SitePurpose = typeof sitePurposeOptions[number];

export const REPORTING_PURPOSE_ORDER: SitePurpose[] = [
  "BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev",
  "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR",
  "GW Investigation", "VES", "Geological logging", "Geophysical Logging",
  "Pumping test", "Industry Pumping test", "MWSS Pumping test",
  "ARS",
  "Others"
];

export const PUMPING_TEST_AGGREGATE_PURPOSES: SitePurpose[] = [
    "Pumping test", "Industry Pumping test", "MWSS Pumping test"
];

export const INVESTIGATION_APP_TYPE_PURPOSES: SitePurpose[] = ["Geological logging", "Geophysical Logging"];

export const INVESTIGATION_WELL_TYPE_PURPOSES: SitePurpose[] = ["GW Investigation", "VES"];

export const siteDiameterOptions = [
  "110 mm (4.5”)",
  "150 mm (6”)",
  "200 mm (8”)",
] as const;
export type SiteDiameter = typeof siteDiameterOptions[number];

export const siteTypeOfRigOptions = [
  "Rotary 7",
  "Rotary 8",
  "DTH Rig",
  "DTH Rig, W&S",
  "Other Dept Rig",
  "Filter Point Rig",
  "Private Rig",
] as const;
export type SiteTypeOfRig = typeof siteTypeOfRigOptions[number];

export const siteConditionsOptions = [
  'Accessible to Dept. Rig',
  'Accessible to Private Rig',
  'Inaccessible to Other Rigs',
  'Land Dispute',
  'Work Disputes and Conflicts',
] as const;
export type SiteConditions = typeof siteConditionsOptions[number];

export const typeOfWellOptions = [
  "Open Well",
  "Bore Well",
  "Tube Well",
  "Filter Point Well",
] as const;
export type TypeOfWell = typeof typeOfWellOptions[number];

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed'];

export const INVESTIGATION_WORK_STATUS_OPTIONS = ["Pending", "VES Pending", "Completed"] as const;
export const LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS = ["Pending", "Completed"] as const;

export const SiteDetailSchema = z.object({
  id: z.string().optional(),
  nameOfSite: z.string().min(1, "Name of Site is required."),
  localSelfGovt: z.string().optional(),
  constituency: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.enum(constituencyOptions).optional().nullable()),
  latitude: optionalNumber("Latitude must be a valid number."),
  longitude: optionalNumber("Longitude must be a valid number."),
  purpose: z.string().min(1, "Purpose is required.").optional(),
  estimateAmount: optionalNumber("Estimate Amount must be a valid number."),
  remittedAmount: optionalNumber("Remitted Amount must be a valid number."),
  siteConditions: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteConditionsOptions).optional()),
  accessibleRig: z.string().optional(),
  tsAmount: optionalNumber("TS Amount must be a valid number."),
  tenderNo: z.string().optional(),
  diameter: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteDiameterOptions).optional()),
  pilotDrillingDepth: z.string().optional().nullable(),
  totalDepth: optionalNumber("Total Depth must be a valid number."),
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
  noOfTapConnections: optionalNumber("Tap Connections must be a valid number."),
  noOfBeneficiary: z.string().optional().nullable(),
  dateOfCompletion: nativeDateSchema.optional().nullable(),
  typeOfRig: z.preprocess((val) => (val === "" || val === null || val === '_clear_' ? undefined : val), z.enum(siteTypeOfRigOptions).optional()),
  contractorName: z.string().optional(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  supervisorDesignation: z.string().optional().nullable(),
  totalExpenditure: optionalNumber("Total Expenditure must be a valid number."),
  workStatus: z.string().optional(),
  implementationRemarks: z.string().optional().nullable().default(""),
  workRemarks: z.string().optional().nullable().default(""),

  // Survey fields (Actuals)
  surveyOB: z.string().optional().nullable(),
  surveyLocation: z.string().optional().nullable(),
  surveyPlainPipe: z.string().optional().nullable(),
  surveySlottedPipe: z.string().optional().nullable(),

  // Survey Details (Recommended)
  surveyRemarks: z.string().optional().nullable(),
  surveyRecommendedDiameter: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.string().optional()),
  surveyRecommendedTD: z.string().optional().nullable(),
  surveyRecommendedOB: z.string().optional().nullable(),
  surveyRecommendedCasingPipe: z.string().optional().nullable(),
  surveyRecommendedPlainPipe: z.string().optional().nullable(),
  surveyRecommendedSlottedPipe: z.string().optional().nullable(),
  surveyRecommendedMsCasingPipe: z.string().optional().nullable(),

  // ARS specific fields
  arsTypeOfScheme: z.string().optional().nullable(),
  arsPanchayath: z.string().optional().nullable(),
  arsBlock: z.string().optional().nullable(),
  arsAsTsDetails: z.string().optional().nullable(),
  arsSanctionedDate: nativeDateSchema,
  arsTenderedAmount: optionalNumber("Tendered Amount must be a valid number."),
  arsAwardedAmount: optionalNumber("Awarded Amount must be a valid number."),
  arsNumberOfStructures: optionalNumber("Number of Structures must be a valid number."),
  arsStorageCapacity: optionalNumber("Storage Capacity must be a valid number."),
  arsNumberOfFillings: optionalNumber("Number of Fillings must be a valid number."),
  isArsImport: z.boolean().optional().default(false),
  isPending: z.boolean().optional(), // Internal state, not part of form

  // Investigation specific fields
  nameOfInvestigator: z.string().optional().nullable(),
  dateOfInvestigation: nativeDateSchema,
  typeOfWell: z.enum(typeOfWellOptions, { required_error: "Type of Well is required." }).optional().nullable(),
  vesRequired: z.enum(["Yes", "No"]).optional(),
  vesInvestigator: z.string().optional().nullable(),
  vesDate: nativeDateSchema,
  feasibility: z.enum(["Yes", "No"], { required_error: "Feasibility is required." }).optional().nullable(),
  hydrogeologicalRemarks: z.string().optional().nullable().default(""),
  geophysicalRemarks: z.string().optional().nullable().default(""),

  // Media
  workImages: z.array(MediaItemSchema).optional().default([]),
  workVideos: z.array(MediaItemSchema).optional().default([]),

}).superRefine((data, ctx) => {
    if ((data.workStatus === 'Completed' || FINAL_WORK_STATUSES.includes(data.workStatus as SiteWorkStatus)) && !data.dateOfCompletion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `is required when status is '${data.workStatus}'.`,
            path: ["dateOfCompletion"],
        });
    }
    if (data.purpose && PURPOSES_REQUIRING_DIAMETER.includes(data.purpose as SitePurpose) && !data.diameter) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "is required for this purpose.",
            path: ["diameter"],
        });
    }
});
export type SiteDetailFormData = z.infer<typeof SiteDetailSchema>;


export const DataEntrySchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().min(1, "File No. is required."),
  applicantName: z.string().min(1, "Name & Address of Institution / Applicant is required."),
  phoneNo: z.string().optional(),
  secondaryMobileNo: z.string().optional(),
  category: z.enum(['Govt', 'Private', 'Complaints']).optional(),
  applicationType: z.enum(applicationTypeOptions).optional(),
  constituency: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.enum(constituencyOptions).optional().nullable()),
  estimateAmount: optionalNumber("Estimate Amount must be a valid number."),
  assignedSupervisorUids: z.array(z.string()).optional(),
  officeLocation: z.string().optional(),

  remittanceDetails: z.array(RemittanceDetailSchema)
    .min(1, "At least one remittance detail is required.")
    .max(10, "You can add a maximum of 10 remittance details."),
  totalRemittance: z.coerce.number().optional(),

  reappropriationDetails: z.array(ReappropriationDetailSchema).optional().default([]),
  totalReappropriation: z.coerce.number().optional().default(0),
  totalReappropriationCredit: z.coerce.number().optional().default(0),

  siteDetails: z.array(SiteDetailSchema).optional(),

  paymentDetails: z.array(PaymentDetailSchema)
    .max(10, "You can add a maximum of 10 payment entries.")
    .optional(),
  totalPaymentAllEntries: z.coerce.number().optional(),
  overallBalance: z.coerce.number().optional(),

  fileStatus: z.string().optional(),
  remarks: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.fileStatus) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "File Status is required.",
            path: ["fileStatus"],
        });
    }
    if (!data.applicationType) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Application Type is required.",
            path: ["applicationType"],
        });
    }
});
export type DataEntryFormData = z.infer<typeof DataEntrySchema>;

export const reportableFields = [
    { id: 'fileNo', label: 'File No', accessor: (e: any) => e.fileNo },
    { id: 'applicantName', label: 'Applicant Name', accessor: (e: any) => e.applicantName },
    { id: 'phoneNo', label: 'Phone No', accessor: (e: any) => e.phoneNo },
    { id: 'appType', label: 'App Type', accessor: (e: any) => applicationTypeDisplayMap[e.applicationType as ApplicationType] || e.applicationType },
    { id: 'remittance', label: 'Remittance (₹)', accessor: (e: any) => e.totalRemittance },
    { id: 'reappropriation', label: 'Re-appropriation (₹)', accessor: (e: any) => e.totalReappropriation },
    { id: 'expenditure', label: 'Expenditure (₹)', accessor: (e: any) => e.totalPaymentAllEntries },
    { id: 'balance', label: 'Balance (₹)', accessor: (e: any) => e.overallBalance },
    { id: 'siteName', label: 'Site Name', accessor: (e: any) => e.nameOfSite },
    { id: 'purpose', label: 'Purpose', accessor: (e: any) => e.purpose },
    { id: 'lsg', label: 'LSG', accessor: (e: any) => e.localSelfGovt },
    { id: 'constituency', label: 'Constituency', accessor: (e: any) => e.constituency },
    { id: 'workStatus', label: 'Work Status', accessor: (e: any) => e.workStatus },
    { id: 'completionDate', label: 'Completion Date', accessor: (e: any) => e.dateOfCompletion },
    { id: 'yield', label: 'Yield (LPH)', accessor: (e: any) => e.yieldDischarge, purpose: ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme"] },
    { id: 'depth', label: 'Depth (m)', accessor: (e: any) => e.totalDepth, purpose: ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "HPS", "HPR"] },
    { id: 'diameter', label: 'Diameter (mm)', accessor: (e: any) => e.diameter, purpose: ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"] },
    { id: 'contractor', label: 'Contractor', accessor: (e: any) => e.contractorName },
    { id: 'supervisor', label: 'Supervisor', accessor: (e: any) => e.supervisorName },
    { id: 'investigator', label: 'Investigator', accessor: (e: any) => e.nameOfInvestigator, purpose: ["GW Investigation"] },
    { id: 'vesInvestigator', label: 'VES Investigator', accessor: (e: any) => e.vesInvestigator, purpose: ["GW Investigation", "VES"] },
    { id: 'arsStructures', label: '# ARS Structures', accessor: (e: any) => e.arsNumberOfStructures, arsApplicable: true },
    { id: 'arsCapacity', label: 'ARS Capacity', accessor: (e: any) => e.arsStorageCapacity, arsApplicable: true },
    { id: 'arsFillings', label: 'ARS Fillings', accessor: (e: any) => e.arsNumberOfFillings, arsApplicable: true },
    { id: 'arsType', label: 'ARS Type', accessor: (e: any) => e.arsTypeOfScheme, arsOnly: true, arsApplicable: true },
    { id: 'officeLocation', label: 'Office', accessor: (e: any) => e.officeLocationFromPath || e.officeLocation },
];
