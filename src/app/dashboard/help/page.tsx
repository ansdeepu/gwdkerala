// src/app/dashboard/help/page.tsx
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from '@/hooks/useAuth';
import {
    HelpCircle,
    LifeBuoy,
    Building,
    Server,
    LayoutDashboard,
    ScrollText,
    ImageUp,
    Hammer,
    Truck,
    Code,
    Bot,
    Palette,
    Database,
    ShieldCheck,
    UserPlus,
    RefreshCw,
    TestTube2,
    Droplets,
    Waves,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HelpPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setHeader("Help & About", "Find answers to common questions and learn more about the application.");
    setLastUpdated(new Date());
  }, [setHeader]);

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle>About the Ground Water Department</CardTitle>
          </div>
          <CardDescription>
            An overview of the department and the purpose of this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-justify">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Ground Water Department, {user?.officeLocation ? capitalize(user.officeLocation) : 'Directorate'}</h3>
            <p className="text-sm text-muted-foreground">
              The Ground Water Department is the state-level agency entrusted with the development, management, conservation, and regulation of precious ground water resources. The department provides technical guidance for various schemes, including well construction, groundwater recharge projects, and water supply systems for both government and private sectors. Its key services involve hydrogeological surveys, drilling, and monitoring to ensure the sustainable use of groundwater for drinking, agriculture, and industrial purposes.
            </p>
          </div>
           <div className="pt-4 border-t">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Server className="h-4 w-4" /> Digital Transformation</h3>
            <p className="text-sm text-muted-foreground">
              This centralized dashboard digitizes departmental workflows to enhance efficiency, accuracy, and real-time monitoring across all district offices. It manages the entire project lifecycle—from investigation and tendering to implementation and financial closure.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Office Onboarding Guide</CardTitle>
                <CardDescription>Essential first steps for new Sub-Office Administrators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <p>When an office is first activated, the Office Admin should perform these actions in order:</p>
                <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li><strong>Configure Office Details:</strong> Go to the <strong>Settings</strong> page and fill in the office address (English & Malayalam), bank account details, and the District Officer's name. This information is used for auto-generating PDF reports.</li>
                    <li><strong>Register Staff:</strong> Go to the <strong>Establishment</strong> page and add all employees. Ensure accurate designations and PEN numbers.</li>
                    <li><strong>Create User Accounts:</strong> While adding or editing a staff member, check the <strong>"Create User Account"</strong> box to provide them with dashboard access (e.g., for Supervisors or Investigators).</li>
                </ol>
            </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><UserPlus className="h-5 w-5 text-amber-600" />Super Admin Functions</CardTitle>
                <CardDescription>Management of sub-offices and global settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Sub-Office Setup:</strong> Super Admins can create new office locations. This automatically provisions three core accounts: <strong>Admin, Scientist, and Engineer</strong> with a default password of "123456".</li>
                    <li><strong>Global Data:</strong> Super Admins manage departmental drilling rates and global user accounts across the entire state.</li>
                    <li><strong>Transfer Approval:</strong> When an Office Admin initiates a staff transfer, it must be approved by the Super Admin to move the record to the target office.</li>
                </ul>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Features & Modules</CardTitle>
          <CardDescription>Understanding the specialized sections of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="investigation">
              <AccordionTrigger>GW Investigation & Logging/Pumping Modules</AccordionTrigger>
              <AccordionContent className="space-y-4">
                 <div className="flex gap-4">
                    <div className="shrink-0"><TestTube2 className="h-10 w-10 text-primary" /></div>
                    <div>
                        <h4 className="font-semibold text-foreground">GW Investigation</h4>
                        <p className="text-sm text-muted-foreground">Dedicated to hydrogeological and geophysical surveys. Features include feasibility tracking, recommended well measurements, and investigator assignments.</p>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-2">
                    <div className="shrink-0"><Droplets className="h-10 w-10 text-primary" /></div>
                    <div>
                        <h4 className="font-semibold text-foreground">Logging & Pumping Test</h4>
                        <p className="text-sm text-muted-foreground">Captures technical data for geological/geophysical logging and various pumping tests. Focuses on borehole characteristics and yield analysis.</p>
                    </div>
                 </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reappropriation">
              <AccordionTrigger>Re-appropriation & Fund Transfers</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-sm text-muted-foreground">The system allows for seamless movement of funds between project files. This is essential for managing excess remittances or adjusting project budgets.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-md bg-secondary/20">
                        <h5 className="font-semibold text-xs uppercase text-primary mb-1">Debits (Transfers Out)</h5>
                        <p className="text-xs text-muted-foreground">Created manually in the source file. You must select the target "Type of Page" and start typing the File No. to see suggestions.</p>
                    </div>
                    <div className="p-3 border rounded-md bg-secondary/20">
                        <h5 className="font-semibold text-xs uppercase text-primary mb-1">Credits (Transfers In)</h5>
                        <p className="text-xs text-muted-foreground">Automatically detected. If File A transfers funds to File B, File B will automatically show a corresponding "Credit" entry in its table.</p>
                    </div>
                </div>
                <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                    <p className="text-xs font-bold text-primary">Balance Formula:</p>
                    <p className="text-sm font-mono text-primary">Balance = Total Remittance + Total Credit - Total Payment - Total Debit</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="media">
              <AccordionTrigger>Image & Video Gallery</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">Every site includes a media section for visual documentation. You can add links to photos or videos (including YouTube/Vimeo embeds). The system provides a light-box viewer for full-screen inspection of images and playback of videos.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="etender">
              <AccordionTrigger>e-Tender Management</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">A complete lifecycle manager for electronic tenders. It handles fee calculations, bidder ranking (L1 detection), and one-click PDF generation for NIT, Selection Notices, and Work/Supply Orders.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ars">
              <AccordionTrigger>ARS (Artificial Recharge Schemes)</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">A specialized module for check dams, recharge pits, and ponds. Includes bulk Excel import/export capabilities specifically designed for large-scale ARS data sets.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions (FAQ)</CardTitle>
          <CardDescription>Quick answers to common procedural questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1">
              <AccordionTrigger>How are new users created?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Sub-Office Accounts:</strong> Initial Admin, Scientist, and Engineer accounts are created by the Super Admin using the "Office Management" tool.</li>
                    <li><strong>Staff Logins:</strong> Office Admins create accounts for other staff (like Supervisors) by registering them in the **Establishment** module and checking the "Create User Account" option.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger>What does the 'Eye' icon do?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The **Eye** icon is the standard "View/Edit" action button. Clicking it opens the details of a record. Depending on your permissions, you will either see a read-only view or a form where you can make changes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger>How do I add a photo for a staff member?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground text-justify">
                Direct file uploading is not supported to ensure performance. You must provide a **direct public link** to an image hosted on a service like Imgur or Postimages. The URL must end in an image extension like `.jpg` or `.png`. A preview will appear if the link is valid.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4">
              <AccordionTrigger>How does the LSG and Constituency mapping work?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Admins can import an Excel mapping file in **Settings**. Once mapped, selecting an LSG in any project form will automatically filter the "Constituency" dropdown to show only the LACs associated with that LSG.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      <Card className="mt-6 border-primary/20 bg-primary/5">
        <CardHeader>
           <div className="flex items-center space-x-3">
            <LifeBuoy className="h-5 w-5 text-primary" />
            <CardTitle>Contact for Support</CardTitle>
          </div>
          <CardDescription>
            If you encounter technical issues or have questions not covered in the documentation, please contact the administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
           <p className="text-sm">
            <strong>Administrator Contact:</strong> 8547650853
          </p>
           {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Help page last updated: {format(lastUpdated, 'dd MMM yyyy, hh:mm a')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
