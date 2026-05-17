"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { 
  Search, 
  Mail, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Loader2, 
  ChevronRight, 
  RotateCw, 
  User, 
  FileText 
} from "lucide-react";

type Reminder = {
  id: string;
  reminderType: string;
  status: string;
  subject: string;
  message: string;
  sentTo: string;
  sentAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    balanceAmount: string;
    status: string;
    dueDate: string;
    amount: string;
  };
};

interface RemindersClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    businessName?: string | null;
  };
}

export default function RemindersClient({ user }: RemindersClientProps) {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Detail drawer states
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function fetchReminders(searchValue = search) {
    setLoading(true);

    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);

    try {
      const response = await fetch(`/api/reminders?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setReminders(data);
        // Sync active reminder in drawer if currently open
        if (activeReminder) {
          const updated = data.find((r: Reminder) => r.id === activeReminder.id);
          if (updated) {
            setActiveReminder(updated);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReminders("");
  }, []);

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setSearch(value);
    fetchReminders(value);
  }

  function handleOpenDrawer(reminder: Reminder) {
    setActiveReminder(reminder);
    setShowDrawer(true);
    setDrawerNotice(null);
  }

  function handleCloseDrawer() {
    setActiveReminder(null);
    setShowDrawer(false);
    setDrawerNotice(null);
  }

  function handleViewInvoice(invoiceId: string) {
    router.push(`/invoices?open=${invoiceId}`);
  }

  async function handleResendReminder(invoiceId: string) {
    setResending(true);
    setDrawerNotice(null);

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoiceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDrawerNotice({ type: "error", message: data.message || "Failed to send reminder" });
        return;
      }

      setDrawerNotice({ type: "success", message: "Reminder email successfully re-dispatched!" });
      await fetchReminders(search);
    } catch (err) {
      console.error(err);
      setDrawerNotice({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setResending(false);
    }
  }

  function formatCurrency(value: string) {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }

  function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatDateOnly(value: string) {
    return new Date(value).toLocaleDateString("en-IN", {
      dateStyle: "medium",
    });
  }

  function getStatusClass(status: string) {
    if (status === "SENT") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "FAILED") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-amber-50 text-amber-700 border-amber-250/70";
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function getAvatarColor(name: string) {
    const colors = [
      "bg-indigo-50 text-indigo-700 border-indigo-100/70",
      "bg-rose-50 text-rose-700 border-rose-100/70",
      "bg-amber-50 text-amber-700 border-amber-100/70",
      "bg-emerald-50 text-emerald-700 border-emerald-100/70",
      "bg-sky-50 text-sky-700 border-sky-100/70",
      "bg-violet-50 text-violet-700 border-violet-100/70",
    ];
    let sum = 0;
    const cleanName = name || "User";
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    return colors[sum % colors.length];
  }

  return (
    <DashboardShell
      user={user}
      title="Reminder History"
    >
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-650" />
                Dispatched Reminders
              </h2>
              <p className="text-xs font-semibold text-gray-400 mt-1">
                Active logs of all email notifications sent to clients
              </p>
            </div>
            
            <div className="flex flex-col gap-2 md:flex-row md:items-center w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="Search invoice, customer, email..."
                />
              </div>
              <button
                onClick={() => fetchReminders(search)}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-4.5 py-2 text-sm font-bold text-gray-700 shadow-sm transition-all duration-200 cursor-pointer active:scale-98 whitespace-nowrap disabled:opacity-60 w-full md:w-auto"
              >
                <RotateCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin text-black" : ""}`} />
                Refresh Logs
              </button>
            </div>
          </div>

          <div>
            {loading && reminders.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-black animate-spin" />
                <p className="text-sm font-semibold text-gray-400">Loading dispatched logs...</p>
              </div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-gray-50/50 border border-dashed border-gray-200">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <Mail className="h-6 w-6" />
                </div>
                <p className="text-base font-bold text-gray-800">
                  {search ? "No matches found" : "No reminders sent yet"}
                </p>
                <p className="text-xs text-gray-400 font-semibold mt-1.5 max-w-xs leading-relaxed">
                  {search 
                    ? "Try adjusting your search query to locate customer emails, invoices or name records." 
                    : "When payment reminders are dispatched to your customers, their records and logs will show up here."}
                </p>
              </div>
            ) : (
              <>
                {/* MOBILE CARD VIEWS - Displays beautiful card grid on mobile/tablet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                  {reminders.map((reminder) => {
                    const avatarColor = getAvatarColor(reminder.customer.name);
                    const initials = getInitials(reminder.customer.name);
                    return (
                      <div
                        key={reminder.id}
                        onClick={() => handleOpenDrawer(reminder)}
                        className="relative rounded-2xl border border-gray-100 bg-white p-4.5 shadow-sm hover:shadow-md hover:border-gray-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 overflow-hidden"
                      >
                        {/* Status color ribbon accent on the top */}
                        <div className={`absolute top-0 left-0 right-0 h-[3px] ${
                          reminder.status === "SENT" ? "bg-emerald-500" :
                          reminder.status === "FAILED" ? "bg-rose-500" : "bg-amber-500"
                        }`} />

                        <div className="flex items-start justify-between gap-2 mt-1">
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-gray-450">Invoice</span>
                              <span className="text-[10px] font-bold text-gray-300">•</span>
                              <span className="text-xs font-bold text-gray-900 leading-none">{reminder.invoice.invoiceNumber}</span>
                            </div>
                          </div>

                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${getStatusClass(reminder.status)}`}>
                            <span className={`h-1 w-1 rounded-full ${
                              reminder.status === "SENT" ? "bg-emerald-500" :
                              reminder.status === "FAILED" ? "bg-rose-500" : "bg-amber-500"
                            }`} />
                            {reminder.status}
                          </span>
                        </div>

                        {/* Customer block */}
                        <div className="flex items-center gap-3 py-2.5 border-t border-b border-gray-100/50 my-3">
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black text-[10px] shadow-2xs ${avatarColor}`}>
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800 truncate">{reminder.customer.name}</p>
                            <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">{reminder.sentTo}</p>
                          </div>
                        </div>

                        {/* Metrics specs details */}
                        <div className="grid grid-cols-2 gap-2 bg-gray-50/50 rounded-xl p-2.5 text-[10px] border border-gray-100/30 mb-2">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Amount Due</span>
                            <span className="text-xs font-bold text-rose-600 mt-1 truncate">{formatCurrency(reminder.invoice.balanceAmount)}</span>
                          </div>
                          <div className="flex flex-col border-l border-gray-200/50 pl-2">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Dispatch Type</span>
                            <span className="text-xs font-bold text-gray-700 mt-1 truncate">{reminder.reminderType.replace("_", " ")}</span>
                          </div>
                        </div>

                        {/* Card bottom section */}
                        <div className="pt-2.5 border-t border-gray-100/40 flex items-center justify-between text-[10px] text-gray-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-300" />
                            {reminder.sentAt ? new Date(reminder.sentAt).toLocaleDateString("en-IN") : "Pending"}
                          </span>
                          <span className="text-indigo-600 flex items-center gap-0.5 font-bold hover:underline">
                            View email <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP TABULAR VIEW - Displays beautiful tabular layout on larger displays */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 select-none">
                        <th className="pb-3 pr-4 font-black">Invoice</th>
                        <th className="pb-3 pr-4 font-black">Customer</th>
                        <th className="pb-3 pr-4 font-black">Sent To</th>
                        <th className="pb-3 pr-4 font-black">Amount Due</th>
                        <th className="pb-3 pr-4 font-black">Type</th>
                        <th className="pb-3 pr-4 font-black">Email Status</th>
                        <th className="pb-3 text-right font-black">Sent At</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100/50">
                      {reminders.map((reminder) => (
                        <tr 
                          key={reminder.id} 
                          onClick={() => handleOpenDrawer(reminder)}
                          className="text-xs hover:bg-slate-50/50 transition-colors duration-150 group cursor-pointer"
                        >
                          <td className="py-4.5 pr-4 font-bold text-gray-900 group-hover:text-black">
                            <span className="inline-flex items-center gap-1">
                              {reminder.invoice.invoiceNumber}
                              <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all duration-150" />
                            </span>
                          </td>

                          <td className="py-4.5 pr-4 font-semibold text-gray-800">
                            {reminder.customer.name}
                          </td>

                          <td className="py-4.5 pr-4 text-gray-500 font-semibold">
                            {reminder.sentTo}
                          </td>

                          <td className="py-4.5 pr-4 font-bold text-rose-600">
                            {formatCurrency(reminder.invoice.balanceAmount)}
                          </td>

                          <td className="py-4.5 pr-4 text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 border border-slate-200/50">
                              {reminder.reminderType.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-4.5 pr-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border uppercase ${getStatusClass(
                                reminder.status
                              )}`}
                            >
                              <span className={`h-1 w-1 rounded-full ${
                                reminder.status === "SENT" ? "bg-emerald-500" :
                                reminder.status === "FAILED" ? "bg-rose-500" : "bg-amber-500"
                              }`} />
                              {reminder.status}
                            </span>
                          </td>

                          <td className="py-4.5 text-right text-gray-500 font-semibold">
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              {formatDate(reminder.sentAt)}
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Reminder Detail Side Drawer Overlay Panel */}
      {showDrawer && activeReminder && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 md:p-0 md:justify-end">
          {/* Glassmorphic backdrop with smooth overlay transition */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
            onClick={handleCloseDrawer}
          />
          
          {/* Drawer Container Panel */}
          <div className="relative z-10 w-full max-w-2xl h-auto max-h-[calc(100vh-2rem)] md:h-full md:max-h-none bg-white flex flex-col shadow-2xl border border-slate-100 md:border-none rounded-[28px] md:rounded-none transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-10 md:zoom-in-100 md:slide-in-from-right-20">
            {/* Header info */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reminder Dossier</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border transition-colors uppercase ${getStatusClass(activeReminder.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      activeReminder.status === "SENT" ? "bg-emerald-500" :
                      activeReminder.status === "FAILED" ? "bg-rose-500" : "bg-amber-500"
                    }`}></span>
                    {activeReminder.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1.5 tracking-tight flex items-center gap-1.5">
                  <Mail className="w-5 h-5 text-indigo-500" />
                  Email Dispatch Log
                </h2>
                
                {/* Customer card specs */}
                <div className="flex items-center gap-2.5 mt-3">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-[10px] shadow-2xs ${getAvatarColor(activeReminder.customer.name)}`}>
                    {getInitials(activeReminder.customer.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-none">{activeReminder.customer.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{activeReminder.sentTo}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCloseDrawer}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="px-4 sm:px-6 pt-4 grid grid-cols-2 gap-2 sm:gap-3 flex-shrink-0 bg-white">
              <div className="rounded-2xl bg-indigo-50/40 border border-indigo-100/60 p-2.5 sm:p-3 flex flex-col justify-between shadow-2xs">
                <span className="text-[8px] sm:text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none">Trigger Type</span>
                <span className="text-xs sm:text-xs font-bold text-indigo-700 mt-2 truncate">{activeReminder.reminderType.replace("_", " ")}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5 sm:p-3 flex flex-col justify-between shadow-2xs">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dispatched On</span>
                <span className="text-xs sm:text-xs font-bold text-slate-700 mt-2 truncate">{formatDate(activeReminder.sentAt)}</span>
              </div>
            </div>

            {/* Notice blocks inside drawer */}
            {drawerNotice && (
              <div className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl text-xs font-semibold border flex-shrink-0 animate-shake ${
                drawerNotice.type === "success" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" 
                  : "bg-red-50 text-red-650 border-red-200/50"
              }`}>
                {drawerNotice.message}
              </div>
            )}

            {/* Scrollable Panel Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Custom Mockup Email Client Viewport */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Mockup Toolbar Header */}
                <div className="bg-slate-50 p-3.5 border-b border-gray-150 text-[10px] sm:text-[11px] font-semibold text-gray-500 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-400 w-12 text-right">From:</span>
                    <span className="text-gray-800 bg-gray-200/60 px-2 py-0.5 rounded text-[9px] sm:text-[10px]">Payment System &lt;no-reply@payments.dev&gt;</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-400 w-12 text-right">To:</span>
                    <span className="text-indigo-650 bg-indigo-50/70 px-2 py-0.5 rounded text-[9px] sm:text-[10px] border border-indigo-150/40 font-bold">{activeReminder.sentTo}</span>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1">
                    <span className="font-bold text-gray-400 w-12 text-right mt-0.5">Subject:</span>
                    <span className="text-gray-900 font-extrabold text-xs leading-tight">{activeReminder.subject}</span>
                  </div>
                </div>

                {/* Simulated Email Body text container */}
                <div className="p-4 bg-[#fbfbfb] min-h-[160px] max-h-[250px] overflow-y-auto">
                  <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-700 select-all font-medium">
                    {activeReminder.message}
                  </p>
                </div>
              </div>

              {/* Connected Invoice Card widget */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h4 className="text-xs font-black text-gray-800 tracking-tight flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    Linked Invoice Dossier
                  </h4>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[8px] font-bold border transition-colors uppercase ${
                    activeReminder.invoice.status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    activeReminder.invoice.status === "OVERDUE" ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {activeReminder.invoice.status.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-[10px] sm:text-[11px] font-bold text-gray-700">
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Invoice No.</span>
                    <span className="text-xs font-black text-gray-800 mt-1 block">{activeReminder.invoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Amount Due</span>
                    <span className="text-xs font-black text-rose-600 mt-1 block">{formatCurrency(activeReminder.invoice.balanceAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Payment Due</span>
                    <span className="text-xs font-bold text-gray-800 mt-1 block">{formatDateOnly(activeReminder.invoice.dueDate)}</span>
                  </div>
                </div>

                {/* Direct quick redirect link */}
                <button
                  onClick={() => handleViewInvoice(activeReminder.invoice.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-indigo-150 rounded-xl bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-bold text-xs cursor-pointer transition-colors active:scale-99 mt-2.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Original Invoice Dossier
                </button>
              </div>
            </div>

            {/* Footer buttons / Operations panel */}
            <div className="p-3 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex flex-row gap-1.5 sm:gap-3">
              <button 
                onClick={handleCloseDrawer}
                className="w-1/3 flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2 sm:py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer active:scale-97"
              >
                Close
              </button>

              {activeReminder.invoice.status !== "PAID" && (
                <button 
                  onClick={() => handleResendReminder(activeReminder.invoice.id)}
                  disabled={resending}
                  className="w-2/3 flex items-center justify-center gap-1.5 rounded-xl bg-black py-2 sm:py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition cursor-pointer active:scale-97 shadow-sm"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      Re-dispatching...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 text-white" />
                      Re-dispatch Reminder Email
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
