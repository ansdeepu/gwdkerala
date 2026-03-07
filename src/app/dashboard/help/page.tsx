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
    History,
    MapPin,
    Save,
    ExternalLink
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
              The Ground Water Department is the state-level agency entrusted with the development, management, conservation, and regulation of precious ground water resources. The department provides technical guidance for various schemes, including well construction, groundwater recharge projects, and water supply systems for both government and private sectors.
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

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary"><History className="h-5 w-5" />Recent System Enhancements</CardTitle>
            <CardDescription>Latest updates to improve your workflow and productivity.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary"/>Navigation Address</h4>
                    <p className="text-xs text-muted-foreground">A new breadcrumb trail at the top-left of every page helps you track your current location and navigate back to parent categories with a single click.</p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm"><Save className="h-4 w-4 text-primary"/>Save vs Close Logic</h4>
                    <p className="text-xs text-muted-foreground">The <strong>Save</strong> button now persists data only, allowing you to continue editing. Use the <strong>Close</strong> button once you are finished to return to the list view.</p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm"><ExternalLink className="h-4 w-4 text-primary"/>Dashboard Drill-down</h4>
                    <p className="text-xs text-muted-foreground">Clicking a <strong>File No.</strong> in Dashboard popups now opens the record in a <strong>new browser window</strong>, keeping your summary view active in the original tab.</p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm"><Palette className="h-4 w-4 text-primary"/>Status Color Coding</h4>
                    <p className="text-xs text-muted-foreground">Site names are now color-coded: <span className="text-green-600 font-bold">Green</span> for Ongoing, <span className="text-amber-600 font-bold">Yellow</span> for Refunds, and <span className="text-red-600 font-bold">Red</span> for Completed/Failed.</p>
                </div>
            </div>
        </CardContent>
      </Card>

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

            <AccordionItem value="deposit">
              <AccordionTrigger>Site Management (Copy & Reorder)</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-sm text-muted-foreground">In Deposit Work modules, you can now manage multiple sites more efficiently:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li><strong>Copy Site:</strong> Use the copy icon to duplicate an existing site's details, useful for schemes with identical specifications.</li>
                    <li><strong>Reorder Sites:</strong> Use the sort icon to rearrange the sequence of sites within a file.</li>
                </ul>
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
            <AccordionItem value="faq-3">
              <AccordionTrigger>How do I save images for Staff or Work Sites?</AccordionTrigger>
              <AccordionContent className="space-y-4 text-sm text-muted-foreground text-justify">
                <p>Direct file uploading is not supported to ensure database performance. You must provide a <strong>direct public link</strong> to your image.</p>
                <div className="p-4 rounded-lg bg-secondary/30 border space-y-2">
                    <p className="font-semibold text-primary flex items-center gap-2"><ImageUp className="h-4 w-4"/> Recommended Workflow (using Postimages):</p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Visit <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">Postimages.org</a>.</li>
                        <li>Upload your photo (select "Do not resize" for best quality).</li>
                        <li>Once uploaded, copy the <strong>"Direct Link"</strong> (it must end in <code>.jpg</code> or <code>.png</code>).</li>
                        <li>Paste this link into the Photo URL field in the dashboard. A preview will appear if the link is valid.</li>
                    </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-1">
              <AccordionTrigger>How are new user accounts created?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Sub-Office Accounts:</strong> Initial Admin, Scientist, and Engineer accounts are created by the Super Admin.</li>
                    <li><strong>Staff Logins:</strong> Office Admins create accounts for other staff (like Supervisors) by registering them in the <strong>Establishment</strong> module and checking the "Create User Account" option.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4">
              <AccordionTrigger>How does the LSG and Constituency mapping work?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Admins can import an Excel mapping file in <strong>Settings</strong>. Once mapped, selecting an LSG in any project form will automatically filter the "Constituency" dropdown to show only the LACs associated with that LSG.
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
            If you encounter technical issues, contact the system administrator.
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
