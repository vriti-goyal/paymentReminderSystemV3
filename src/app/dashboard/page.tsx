import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { InvoiceStatus } from "@/generated/prisma";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import { Clock, DollarSign, Users, AlertCircle, Calendar, CalendarDays } from "lucide-react";

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Auto-mark overdue invoices
  await prisma.invoice.updateMany({
    where: {
      userId,
      dueDate: {
        lt: today,
      },
      status: {
        in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID],
      },
    },
    data: {
      status: InvoiceStatus.OVERDUE,
    },
  });

  // Query all essential counts and invoices concurrently for performance
  const [
    totalCustomers,
    totalInvoices,
    paidInvoices,
    pendingInvoices,
    partiallyPaidInvoices,
    overdueInvoices,
    remindersSent,
    allInvoices,
  ] = await Promise.all([
    prisma.customer.count({
      where: { userId },
    }),
    prisma.invoice.count({
      where: { userId },
    }),
    prisma.invoice.count({
      where: {
        userId,
        status: InvoiceStatus.PAID,
      },
    }),
    prisma.invoice.count({
      where: {
        userId,
        status: InvoiceStatus.PENDING,
      },
    }),
    prisma.invoice.count({
      where: {
        userId,
        status: InvoiceStatus.PARTIALLY_PAID,
      },
    }),
    prisma.invoice.count({
      where: {
        userId,
        status: InvoiceStatus.OVERDUE,
      },
    }),
    prisma.reminder.count({
      where: {
        userId,
        status: "SENT",
      },
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        invoiceNumber: true,
        dueDate: true,
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  // 1. Total Unpaid Amount (Outstanding Dues)
  const totalOutstanding = allInvoices.reduce((sum, inv) => 
    inv.status !== InvoiceStatus.CANCELLED ? sum + Number(inv.balanceAmount) : sum, 0
  );

  // 2. Total Overdue Amount
  const totalOverdue = allInvoices.reduce((sum, inv) => 
    inv.status === InvoiceStatus.OVERDUE ? sum + Number(inv.balanceAmount) : sum, 0
  );

  // 3. Pending this week
  const startOfWeek = new Date(today);
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
  startOfWeek.setDate(today.getDate() - currentDay);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const pendingThisWeek = allInvoices.reduce((sum, inv) => {
    const isPendingOrPartial = inv.status === InvoiceStatus.PENDING || inv.status === InvoiceStatus.PARTIALLY_PAID;
    const dueTime = new Date(inv.dueDate).getTime();
    const isThisWeek = dueTime >= startOfWeek.getTime() && dueTime <= endOfWeek.getTime();
    return (isPendingOrPartial && isThisWeek) ? sum + Number(inv.balanceAmount) : sum;
  }, 0);

  // 4. Pending this month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  const pendingThisMonth = allInvoices.reduce((sum, inv) => {
    const isPendingOrPartial = inv.status === InvoiceStatus.PENDING || inv.status === InvoiceStatus.PARTIALLY_PAID;
    const dueTime = new Date(inv.dueDate).getTime();
    const isThisMonth = dueTime >= startOfMonth.getTime() && dueTime <= endOfMonth.getTime();
    return (isPendingOrPartial && isThisMonth) ? sum + Number(inv.balanceAmount) : sum;
  }, 0);

  const recentInvoices = allInvoices.slice(0, 5);

  // Helper to map invoice statuses to appropriate color badges
  const statusBadgeStyles = {
    [InvoiceStatus.PAID]: "bg-green-50 text-green-700 border-green-200",
    [InvoiceStatus.PENDING]: "bg-yellow-50 text-yellow-700 border-yellow-200",
    [InvoiceStatus.PARTIALLY_PAID]: "bg-orange-50 text-orange-700 border-orange-200",
    [InvoiceStatus.OVERDUE]: "bg-red-50 text-red-700 border-red-200",
    [InvoiceStatus.CANCELLED]: "bg-gray-50 text-gray-400 border-gray-200",
  };

  return (
    <DashboardShell user={session.user}>
      <div className="space-y-8">
        
        {/* Section 1: Consolidated Primary Metrics Grid */}
        <div>
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Overview & Analytics
            </h2>
          </div>
          
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 animate-in fade-in duration-300">
            {/* Total Unpaid Card */}
            <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/50 via-white to-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest leading-none">Total Unpaid</span>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-500">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-black text-rose-600 truncate">₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] font-semibold text-rose-400 mt-1 uppercase tracking-wider">Unpaid amount</p>
              </div>
            </div>

            {/* Total Overdue Card */}
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/50 via-white to-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">Total Overdue</span>
                <div className="p-2 rounded-xl bg-red-50 border border-red-100 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-black text-red-600 truncate">₹{totalOverdue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] font-semibold text-red-400 mt-1 uppercase tracking-wider">Past due</p>
              </div>
            </div>

            {/* Pending This Week Card */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/50 via-white to-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-none">Due This Week</span>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-black text-amber-700 truncate">₹{pendingThisWeek.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] font-semibold text-amber-500 mt-1 uppercase tracking-wider">This week</p>
              </div>
            </div>

            {/* Pending This Month Card */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none">Due This Month</span>
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-500">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-black text-indigo-600 truncate">₹{pendingThisMonth.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] font-semibold text-indigo-400 mt-1 uppercase tracking-wider">This month</p>
              </div>
            </div>

            {/* Active Customers Card */}
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest leading-none">Active Customers</span>
                <div className="p-2 rounded-xl bg-violet-50 border border-violet-100 text-violet-500">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-black text-violet-600 truncate">{totalCustomers}</p>
                <p className="text-[10px] font-semibold text-violet-400 mt-1 uppercase tracking-wider">Registered clients</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Recent Invoices Table (Sleek card design) */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 border-b border-gray-200 pb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Recent Invoices
              </h3>
              <p className="text-xs font-medium text-gray-400 mt-1">
                Displaying up to 5 latest activity records in your account
              </p>
            </div>

            {/* Premium inline status summary pills */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                Total Invoices: <span className="font-black text-gray-900">{totalInvoices}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 border border-yellow-100/70 text-yellow-700 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                Pending: <span className="font-black text-yellow-900">{pendingInvoices}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100/70 text-orange-700 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                Partially Paid: <span className="font-black text-orange-900">{partiallyPaidInvoices}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100/70 text-red-700 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                Overdue: <span className="font-black text-red-900">{overdueInvoices}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100/70 text-blue-700 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                Reminders Sent: <span className="font-black text-blue-900">{remindersSent}</span>
              </span>
            </div>

            <Link
              href="/invoices"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-all duration-200 shrink-0"
            >
              <span>View All Invoices</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="mt-5">
            {recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl bg-gray-50/50 border border-dashed border-gray-200">
                <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-sm font-semibold text-gray-500">No invoices created yet.</p>
                <Link href="/invoices" className="mt-2 text-xs font-semibold text-black hover:underline">
                  Create your first invoice &rarr;
                </Link>
              </div>
            ) : (
              <>
                {/* A. Desktop/Tablet Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <th className="pb-3 pr-4">Invoice #</th>
                        <th className="pb-3 pr-4">Customer</th>
                        <th className="pb-3 pr-4">Total Amount</th>
                        <th className="pb-3 pr-4">Balance due</th>
                        <th className="pb-3 pr-4">Due Date</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100/50">
                      {recentInvoices.map((invoice) => (
                        <tr key={invoice.invoiceNumber} className="text-sm hover:bg-gray-50/40 transition-colors duration-150 group cursor-pointer">
                          <td className="py-4 pr-4 font-bold text-gray-900 group-hover:text-black transition-colors">
                            <Link href={`/invoices?open=${invoice.id}`} className="block">
                              {invoice.invoiceNumber}
                            </Link>
                          </td>

                          <td className="py-4 pr-4">
                            <Link href={`/invoices?open=${invoice.id}`} className="block">
                              <div className="font-semibold text-gray-800">
                                {invoice.customer.name}
                              </div>
                              <div className="text-xs text-gray-400 font-medium mt-0.5">
                                {invoice.customer.email}
                              </div>
                            </Link>
                          </td>

                          <td className="py-4 pr-4 font-semibold text-gray-700">
                            <Link href={`/invoices?open=${invoice.id}`} className="block">
                              {formatCurrency(Number(invoice.amount))}
                            </Link>
                          </td>

                          <td className="py-4 pr-4">
                            <Link href={`/invoices?open=${invoice.id}`} className="block">
                              {Number(invoice.balanceAmount) > 0 ? (
                                <span className="font-semibold text-rose-600">
                                  {formatCurrency(Number(invoice.balanceAmount))}
                                </span>
                              ) : (
                                <span className="font-medium text-gray-400">—</span>
                              )}
                            </Link>
                          </td>

                          <td className="py-4 pr-4 text-gray-500 font-medium">
                            <Link href={`/invoices?open=${invoice.id}`} className="block">
                              {invoice.dueDate.toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </Link>
                          </td>

                          <td className="py-4 text-right">
                            <Link href={`/invoices?open=${invoice.id}`} className="inline-block">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold border ${statusBadgeStyles[invoice.status]}`}>
                                {invoice.status.replace("_", " ")}
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* B. Mobile Stack Layout (Beautiful alternative to horizontal scroll overflow) */}
                <div className="sm:hidden space-y-4">
                  {recentInvoices.map((invoice) => (
                    <Link
                      key={invoice.invoiceNumber}
                      href={`/invoices?open=${invoice.id}`}
                      className="block rounded-2xl border border-gray-200 bg-slate-50/50 p-4 space-y-3 hover:border-black/20 hover:shadow-xs transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${statusBadgeStyles[invoice.status]}`}>
                          {invoice.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{invoice.customer.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{invoice.customer.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-400">Due Date</p>
                          <p className="text-xs font-bold text-gray-600 mt-0.5">
                            {invoice.dueDate.toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-2.5 border border-gray-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-gray-400 font-medium">Total: </span>
                          <span className="font-bold text-gray-800">{formatCurrency(Number(invoice.amount))}</span>
                        </div>
                        {Number(invoice.balanceAmount) > 0 && (
                          <div>
                            <span className="text-gray-400 font-medium">Bal: </span>
                            <span className="font-bold text-rose-600">{formatCurrency(Number(invoice.balanceAmount))}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}