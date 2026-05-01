// src/components/dashboard/NoticeBoard.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StaffMember, Designation } from '@/lib/schemas';
import { isValid, format } from 'date-fns';
import { Megaphone, Cake, Gift, PartyPopper, ChevronRight, FileDown, Loader2 } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import download from 'downloadjs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; 
    }
    return hash;
};

const getColorClass = (nameOrEmail: string): string => {
    const colors = [
        "bg-red-200 text-red-800", "bg-orange-200 text-orange-800", "bg-amber-200 text-amber-800",
        "bg-yellow-200 text-yellow-800", "bg-lime-200 text-lime-800", "bg-green-200 text-green-800",
        "bg-emerald-200 text-emerald-800", "bg-teal-200 text-teal-800", "bg-cyan-200 text-cyan-800",
        "bg-sky-200 text-sky-800", "bg-blue-200 text-blue-800", "bg-indigo-200 text-indigo-800",
        "bg-violet-200 text-violet-800", "bg-purple-200 text-purple-800", "bg-fuchsia-200 text-fuchsia-800",
        "bg-pink-200 text-pink-800", "bg-rose-200 text-rose-800"
    ];
    const hash = hashCode(nameOrEmail);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const getInitials = (name?: string) => {
  if (!name || name.trim() === '') return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

interface NoticeBoardProps {
  staffMembers: StaffMember[];
}

export default function NoticeBoard({ staffMembers }: NoticeBoardProps) {
  const { toast } = useToast();
  const [selectedBirthday, setSelectedBirthday] = useState<{ name: string, designation?: Designation, photoUrl?: string | null } | null>(null);
  const [isMonthListOpen, setIsMonthListOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const noticeData = useMemo(() => {
    const todaysBirthdays: { name: string, designation?: Designation, photoUrl?: string | null }[] = [];
    const upcomingBirthdaysInMonth: { name: string; designation?: Designation; photoUrl?: string | null; dateOfBirth: Date }[] = [];
    const monthlyBirthdays: { name: string; designation?: Designation; photoUrl?: string | null; dateOfBirth: Date }[] = [];

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    const activeStaff = staffMembers.filter(s => s.status === 'Active');

    for (const staff of activeStaff) {
      if (!staff.dateOfBirth) continue;
      const dob = new Date(staff.dateOfBirth);
      if (isValid(dob)) {
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();
        if (dobMonth === todayMonth) {
            monthlyBirthdays.push({ name: staff.name, designation: staff.designation as Designation, photoUrl: staff.photoUrl, dateOfBirth: dob });
            
            if (dobDate === todayDate) {
                todaysBirthdays.push({ name: staff.name, designation: staff.designation as Designation, photoUrl: staff.photoUrl });
            } else if (dobDate > todayDate) {
                upcomingBirthdaysInMonth.push({ name: staff.name, designation: staff.designation as Designation, photoUrl: staff.photoUrl, dateOfBirth: dob });
            }
        }
      }
    }

    upcomingBirthdaysInMonth.sort((a, b) => a.dateOfBirth.getDate() - b.dateOfBirth.getDate());
    monthlyBirthdays.sort((a, b) => a.dateOfBirth.getDate() - b.dateOfBirth.getDate());

    return {
      todaysBirthdays,
      upcomingBirthdays: upcomingBirthdaysInMonth,
      monthlyBirthdays,
    };
  }, [staffMembers]);
  
  const enableTodayScrolling = noticeData.todaysBirthdays.length > 2;
  const enableUpcomingScrolling = noticeData.upcomingBirthdays.length > 3;
  const todayBirthdayList = enableTodayScrolling ? [...noticeData.todaysBirthdays, ...noticeData.todaysBirthdays] : noticeData.todaysBirthdays;
  const upcomingBirthdayList = enableUpcomingScrolling ? [...noticeData.upcomingBirthdays, ...noticeData.upcomingBirthdays] : noticeData.upcomingBirthdays;

  const handleDownloadPdf = async () => {
    if (noticeData.monthlyBirthdays.length === 0) {
      toast({ title: "No data to export" });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      let y = height - 50;

      const monthYear = format(new Date(), 'MMMM yyyy');
      page.drawText(`Staff Birthdays - ${monthYear}`, { x: 50, y, size: 18, font: boldFont });
      y -= 40;

      // Table Headers
      page.drawText('Date', { x: 50, y, size: 11, font: boldFont });
      page.drawText('Name', { x: 100, y, size: 11, font: boldFont });
      page.drawText('Designation', { x: 300, y, size: 11, font: boldFont });
      y -= 20;

      // Draw a line under header
      page.drawLine({
        start: { x: 50, y: y + 15 },
        end: { x: width - 50, y: y + 15 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8)
      });

      noticeData.monthlyBirthdays.forEach((staff) => {
        if (y < 50) {
          page = pdfDoc.addPage();
          y = page.getHeight() - 50;
        }
        page.drawText(format(staff.dateOfBirth, 'dd'), { x: 50, y, size: 10, font });
        page.drawText(staff.name, { x: 100, y, size: 10, font });
        page.drawText(staff.designation || 'N/A', { x: 300, y, size: 10, font });
        y -= 15;
      });

      const pdfBytes = await pdfDoc.save();
      download(pdfBytes, `Staff_Birthdays_${monthYear.replace(' ', '_')}.pdf`, 'application/pdf');
      toast({ title: "PDF Generated" });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Card className="shadow-lg flex flex-col h-[450px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Birthday Updates</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 pt-0 min-h-0">
        {/* Today's Birthdays Section */}
        <Dialog open={!!selectedBirthday} onOpenChange={(isOpen) => !isOpen && setSelectedBirthday(null)}>
          <div className={cn("border rounded-lg p-3 bg-background flex flex-col")}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />Today's Birthdays ({noticeData.todaysBirthdays.length})</h3>
            <div className={cn("pr-3", enableTodayScrolling ? "h-28 marquee-container-birthdays" : "h-auto")}>
              {todayBirthdayList.length > 0 ? (
                <div className={cn("space-y-3", enableTodayScrolling && "marquee-content-birthdays")}>
                  {todayBirthdayList.map((staff, index) => (
                    <DialogTrigger key={index} asChild>
                      <button onClick={() => setSelectedBirthday(staff)} className="w-full p-2 rounded-md bg-pink-500/10 hover:bg-pink-500/20 transition-colors flex items-center gap-3 text-left">
                        <Avatar className="h-10 w-10 border-2 border-pink-200">
                          <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                          <AvatarFallback className="bg-pink-100 text-pink-700 font-bold">{getInitials(staff.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-pink-700 text-xs -mb-1 flex items-center gap-1.5"><Gift className="h-4 w-4" />Happy Birthday!</p>
                          <p className="font-bold text-sm text-pink-800">{staff.name}</p>
                        </div>
                      </button>
                    </DialogTrigger>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground italic">No birthdays today.</p>
                </div>
              )}
            </div>
          </div>
          <DialogContent>
            <div className="p-4 flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-pink-50 to-indigo-50">
                <PartyPopper className="absolute top-2 left-4 h-6 w-6 text-yellow-400 -rotate-45" />
                <PartyPopper className="absolute top-8 right-6 h-5 w-5 text-blue-400 rotate-12" />
                <PartyPopper className="absolute bottom-6 left-8 h-5 w-5 text-red-400 rotate-6" />
                <PartyPopper className="absolute bottom-2 right-4 h-6 w-6 text-green-400 -rotate-12" />
                <div className="relative z-10 flex flex-col items-center">
                    <Avatar className="h-32 w-32 mb-4 border-2 p-1 border-primary/50 shadow-lg bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400">
                      <AvatarImage src={selectedBirthday?.photoUrl || undefined} alt={selectedBirthday?.name} />
                      <AvatarFallback className="text-4xl">{getInitials(selectedBirthday?.name)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-2xl font-bold text-primary">Happy Birthday!</h2>
                    <p className="mt-4 text-foreground">{`Wishing you a fantastic day filled with joy and celebration!`}</p>
                </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Upcoming Birthdays Section with Monthly List Dialog */}
        <Dialog open={isMonthListOpen} onOpenChange={setIsMonthListOpen}>
          <div className={cn("border rounded-lg p-3 bg-background flex flex-col flex-1 min-h-0")}>
            <DialogTrigger asChild>
              <button 
                className="text-sm font-semibold mb-2 flex items-center justify-between group hover:text-primary transition-colors w-full text-left"
                onClick={() => setIsMonthListOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-indigo-500" />
                  Upcoming Birthdays ({noticeData.upcomingBirthdays.length})
                </span>
                <span className="text-[10px] font-normal text-muted-foreground group-hover:underline flex items-center gap-0.5">
                  View All <ChevronRight className="h-3 w-3" />
                </span>
              </button>
            </DialogTrigger>
            <ScrollArea className="flex-1 pr-3 -mr-3">
              <div className={cn("space-y-2", enableUpcomingScrolling && "marquee-container-birthdays")}>
                <div className={cn("space-y-2", enableUpcomingScrolling && "marquee-content-birthdays")}>
                    {upcomingBirthdayList.length > 0 ? (
                        upcomingBirthdayList.map((staff, index) => (
                          <div key={index} className="w-full p-2 rounded-md bg-indigo-500/10 flex items-center gap-3 text-left">
                            <Avatar className="h-10 w-10 border-2 border-indigo-200">
                              <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{getInitials(staff.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-indigo-800">{staff.name}</p>
                              <p className="text-xs text-indigo-700">{staff.designation}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-indigo-800">{format(staff.dateOfBirth, 'dd')}</p>
                              <p className="text-xs text-indigo-700 -mt-1">{format(staff.dateOfBirth, 'MMM')}</p>
                            </div>
                          </div>
                        ))
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-sm text-muted-foreground italic text-center py-10">No other birthdays this month.</p>
                        </div>
                    )}
                  </div>
                </div>
            </ScrollArea>
          </div>

          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b flex flex-row items-center justify-between shrink-0">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Cake className="h-6 w-6 text-primary" />
                  Birthdays in {format(new Date(), 'MMMM yyyy')}
                </DialogTitle>
                <DialogDescription>
                  Full list of staff members celebrating birthdays this month.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 pr-8">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadPdf} 
                    disabled={isGeneratingPdf || noticeData.monthlyBirthdays.length === 0}
                    className="h-8"
                >
                    {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                    Download PDF
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {noticeData.monthlyBirthdays.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                      {noticeData.monthlyBirthdays.map((staff, index) => {
                        const avatarColorClass = getColorClass(staff.name);
                        return (
                          <div key={index} className="flex items-center gap-4 p-3 rounded-lg border bg-secondary/10 hover:bg-secondary/20 transition-colors">
                            <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                              <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                              <AvatarFallback className={cn("font-bold", avatarColorClass)}>{getInitials(staff.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{staff.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{staff.designation || 'Staff Member'}</p>
                            </div>
                            <div className="text-right shrink-0 border-l pl-3 border-primary/10">
                              <p className="font-bold text-lg text-primary leading-tight">{format(staff.dateOfBirth, 'dd')}</p>
                              <p className="text-[10px] uppercase font-semibold text-muted-foreground -mt-1">{format(staff.dateOfBirth, 'MMM')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <p className="text-muted-foreground italic">No birthdays recorded for this month.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter className="p-4 border-t shrink-0">
                <DialogClose asChild>
                    <Button variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
