"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Clock, DollarSign, XCircle, Trash2, FileText, MoreHorizontal, Loader2, X, Calendar, History, Send, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
};

type Payment = {
  id: string;
  amountPaid: string;
  paymentMode: string;
  paymentDate: string;
  remarks: string | null;
};

type Reminder = {
  id: string;
  reminderType?: string;
  status: string;
  sentAt: string | null;
  subject?: string;
  message?: string;
  sentTo?: string;
  createdAt?: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: string;
  paidAmount: string;
  balanceAmount: string;
  dueDate: string;
  status: string;
  description: string | null;
  notes?: string | null;
  customer: Customer;
  payments: Payment[];
  reminders: Reminder[];
  createdAt?: string;
};

interface InvoicesClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    businessName?: string | null;
  };
  openInvoiceId?: string;
}

export default function InvoicesClient({ user, openInvoiceId }: InvoicesClientProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  // Side panel state for detailed invoice actions
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [showInvoicePanel, setShowInvoicePanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Drawer enhanced states
  const [showInlinePaymentForm, setShowInlinePaymentForm] = useState(false);
  const [inlinePaymentData, setInlinePaymentData] = useState({
    amountPaid: "",
    paymentMode: "UPI",
    remarks: "",
  });
  const [inlinePaymentSaving, setInlinePaymentSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [drawerTab, setDrawerTab] = useState<"details" | "payments" | "reminders">("details");

  // Open side panel for a specific invoice
  function handleOpenInvoicePanel(invoice: Invoice) {
    setActiveInvoice(invoice);
    setShowInvoicePanel(true);
    setShowInlinePaymentForm(false);
    setDrawerNotice(null);
    setDrawerTab("details");
  }

  // Close the side panel
  function handleCloseInvoicePanel() {
    setActiveInvoice(null);
    setShowInvoicePanel(false);
    setShowInlinePaymentForm(false);
    setDrawerNotice(null);
  }

  // Cancel invoice (set status to CANCELLED)
  async function handleCancelInvoice(id: string) {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!response.ok) throw new Error("Cancel failed");
      setDrawerNotice({ type: "success", message: "Invoice cancelled successfully!" });
      fetchInvoices(search, filter);
    } catch (e) {
      console.error(e);
      setDrawerNotice({ type: "error", message: "Failed to cancel invoice" });
    }
  }

  // Delete invoice permanently
  async function handleDeleteInvoice(id: string) {
    const confirmDelete = confirm("Are you sure you want to permanently delete this invoice?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      handleCloseInvoicePanel();
      fetchInvoices(search, filter);
    } catch (e) {
      console.error(e);
      setDrawerNotice({ type: "error", message: "Failed to delete invoice" });
    }
  }

  // Generate and download PDF on the client side dynamically
  async function handlePrintInvoice(invoiceToPrint: Invoice) {
    setPdfDownloading(true);
    setDrawerNotice(null);
    try {
      // Dynamically load dependencies only when the button is clicked
      const { pdf } = await import("@react-pdf/renderer");
      const { InvoicePDFDocument } = await import("@/components/InvoicePDFDocument");

      const doc = (
        <InvoicePDFDocument
          invoice={invoiceToPrint}
          businessName={user.businessName || "My Business"}
          businessEmail={user.email || ""}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${invoiceToPrint.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setDrawerNotice({ type: "success", message: "PDF downloaded successfully!" });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setDrawerNotice({ type: "error", message: "Failed to generate PDF. Please try again." });
    } finally {
      setPdfDownloading(false);
    }
  }

  // Drawer inline payment handler
  async function handleInlinePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeInvoice) return;

    setInlinePaymentSaving(true);
    setDrawerNotice(null);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: activeInvoice.id,
          amountPaid: inlinePaymentData.amountPaid,
          paymentMode: inlinePaymentData.paymentMode,
          remarks: inlinePaymentData.remarks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDrawerNotice({ type: "error", message: data.message || "Failed to record payment" });
        return;
      }

      setDrawerNotice({ type: "success", message: "Payment recorded successfully!" });
      setShowInlinePaymentForm(false);
      setInlinePaymentData({
        amountPaid: "",
        paymentMode: "UPI",
        remarks: "",
      });

      // Refresh data
      await fetchInvoices(search, filter);
    } catch (err) {
      console.error(err);
      setDrawerNotice({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setInlinePaymentSaving(false);
    }
  }

  // Drawer inline send reminder dispatcher
  async function handleSendReminderInline(invoiceId: string) {
    setSendingReminder(true);
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

      setDrawerNotice({ type: "success", message: "Reminder email sent successfully!" });
      await fetchInvoices(search, filter);
    } catch (err) {
      console.error(err);
      setDrawerNotice({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setSendingReminder(false);
    }
  }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"invoice" | "payment">("invoice");

  const [formData, setFormData] = useState({
    customerId: "",
    amount: "",
    dueDate: "",
    description: "",
    notes: "",
  });

  const [paymentData, setPaymentData] = useState({
    invoiceId: "",
    amountPaid: "",
    paymentMode: "UPI",
    remarks: "",
  });

  async function fetchCustomers() {
    const response = await fetch("/api/customers");
    const data = await response.json();

    if (response.ok) {
      setCustomers(data);
    }
  }

  async function fetchInvoices(searchValue = search, filterValue = filter) {
    setLoading(true);

    const params = new URLSearchParams();

    if (searchValue) params.set("search", searchValue);
    if (filterValue) {
      if (["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].includes(filterValue)) {
        params.set("status", filterValue);
      } else if (["this_week", "this_month"].includes(filterValue)) {
        params.set("due", filterValue);
      }
    }

    const response = await fetch(`/api/invoices?${params.toString()}`);
    const data = await response.json();

    setLoading(false);

    if (response.ok) {
      setInvoices(data);
      // Auto-refresh activeInvoice if it is currently open in the Side Drawer
      if (activeInvoice) {
        const updated = data.find((inv: Invoice) => inv.id === activeInvoice.id);
        if (updated) {
          setActiveInvoice(updated);
        }
      }
    }
  }

  useEffect(() => {
    fetchCustomers();
    fetchInvoices("", "");
  }, []);

  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  useEffect(() => {
    if (openInvoiceId && invoices.length > 0 && !hasAutoOpened) {
      const targetInvoice = invoices.find((inv) => inv.id === openInvoiceId);
      if (targetInvoice) {
        handleOpenInvoicePanel(targetInvoice);
        setHasAutoOpened(true);
      }
    }
  }, [openInvoiceId, invoices, hasAutoOpened]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  function handlePaymentChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setPaymentData({
      ...paymentData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Failed to create invoice");
      return;
    }

    setFormData({
      customerId: "",
      amount: "",
      dueDate: "",
      description: "",
      notes: "",
    });

    setIsActionsExpanded(false);
    fetchInvoices(search, filter);
  }

  async function handlePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const response = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Failed to add payment");
      return;
    }

    setPaymentData({
      invoiceId: "",
      amountPaid: "",
      paymentMode: "UPI",
      remarks: "",
    });

    setIsActionsExpanded(false);
    fetchInvoices(search, filter);
  }

  async function handleSendReminder(invoiceId: string) {
    setError("");
    setSuccess("");

    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoiceId }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Failed to send reminder");
      return;
    }

    setSuccess("Reminder email sent successfully!");
    setTimeout(() => {
      setSuccess("");
    }, 5000);
    fetchInvoices(search, filter);
  }

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setSearch(value);
    fetchInvoices(value, filter);
  }

  function handleFilterChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    setFilter(value);
    fetchInvoices(search, value);
  }

  function formatCurrency(value: string) {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-IN");
  }

  function getStatusClass(invoiceStatus: string) {
    if (invoiceStatus === "PAID") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    }

    if (invoiceStatus === "OVERDUE") {
      return "bg-rose-50 text-rose-700 border-rose-200/60";
    }

    if (invoiceStatus === "PARTIALLY_PAID") {
      return "bg-amber-50 text-amber-700 border-amber-200/60";
    }

    return "bg-zinc-50 text-zinc-600 border-zinc-200/80";
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
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  }

  return (
    <DashboardShell
      user={user}
      title="Invoices"
    >
      <div className="space-y-6">

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100 shadow-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-600 border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
            <div 
              className="flex items-center justify-between cursor-pointer lg:cursor-default select-none"
              onClick={() => setIsActionsExpanded(!isActionsExpanded)}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Quick Actions
              </h2>
              <button
                type="button"
                className="lg:hidden flex items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-500 hover:text-slate-900 transition-all duration-200 cursor-pointer active:scale-95"
              >
                {isActionsExpanded ? (
                  <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>

            <div className={`${isActionsExpanded ? "block animate-in fade-in slide-in-from-top-4 duration-300 space-y-6" : "hidden"} lg:block lg:space-y-6`}>
              {/* Tabs tray styled as premium segmented control */}
              <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-200/50">
              <button
                type="button"
                onClick={() => setActiveTab("invoice")}
                className={`flex-1 flex items-center justify-center py-2 px-3 text-xs font-bold rounded-lg transition-all duration-300 ${
                  activeTab === "invoice"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100 scale-[1.02]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Create Invoice
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payment")}
                className={`flex-1 flex items-center justify-center py-2 px-3 text-xs font-bold rounded-lg transition-all duration-300 ${
                  activeTab === "payment"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100 scale-[1.02]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Add Payment
              </button>
            </div>

            {activeTab === "invoice" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    Create Invoice
                  </h2>
                  {customers.length === 0 && (
                    <div className="mt-3 rounded-xl bg-yellow-50 p-3 text-xs font-semibold text-yellow-700 border border-yellow-100">
                      Please add a customer first from the Customers page.
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Customer *
                      </label>
                      <select
                        name="customerId"
                        value={formData.customerId}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 bg-white"
                      >
                        <option value="">Select customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customer.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Amount *
                      </label>
                      <input
                        name="amount"
                        type="number"
                        min="1"
                        value={formData.amount}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                        placeholder="5000"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Due Date *
                      </label>
                      <input
                        name="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                        placeholder="Website design service..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                        placeholder="Internal note"
                        rows={2}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-all duration-200 shadow-sm"
                    >
                      Create Invoice
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    Add Payment
                  </h2>

                  <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Invoice *
                      </label>
                      <select
                        name="invoiceId"
                        value={paymentData.invoiceId}
                        onChange={handlePaymentChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 bg-white"
                      >
                        <option value="">Select unpaid invoice</option>
                        {invoices
                          .filter((invoice) => invoice.status !== "PAID")
                          .map((invoice) => (
                            <option key={invoice.id} value={invoice.id}>
                              {invoice.invoiceNumber} - {invoice.customer.name} - Bal {formatCurrency(invoice.balanceAmount)}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Payment Amount *
                      </label>
                      <input
                        name="amountPaid"
                        type="number"
                        min="1"
                        value={paymentData.amountPaid}
                        onChange={handlePaymentChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                        placeholder="3000"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Payment Mode *
                      </label>
                      <select
                        name="paymentMode"
                        value={paymentData.paymentMode}
                        onChange={handlePaymentChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 bg-white"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CARD">Card</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Remarks
                      </label>
                      <input
                        name="remarks"
                        value={paymentData.remarks}
                        onChange={handlePaymentChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                        placeholder="Paid through UPI"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-all duration-200 shadow-sm"
                    >
                      Add Payment
                    </button>
                  </form>
                </div>
              </div>
            )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Invoice List
                </h2>
                <p className="text-xs font-medium text-gray-400 mt-1">
                  Manage your active financial ledgers and billing records
                </p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 md:w-64"
                  placeholder="Search invoice/customer"
                />

                <select
                  value={filter}
                  onChange={handleFilterChange}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 bg-white font-medium"
                >
                  <option value="">Filters</option>
                  <optgroup label="Status">
                    <option value="PENDING">Pending</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </optgroup>
                  <optgroup label="Due Date">
                    <option value="this_week">Due This Week</option>
                    <option value="this_month">Due This Month</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-gray-500">Loading invoices...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl bg-gray-50/50 border border-dashed border-gray-200">
                  <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-3 text-sm font-semibold text-gray-500">No invoices found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {invoices.map((invoice) => {
                    const isPaid = invoice.status === "PAID";
                    const avatarColor = getAvatarColor(invoice.customer.name);
                    const initials = getInitials(invoice.customer.name);
                    const balance = Number(invoice.balanceAmount);

                    return (
                      <div 
                        key={invoice.id} 
                        onClick={() => handleOpenInvoicePanel(invoice)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 overflow-hidden"
                      >
                        {/* Status top accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-[3px] transition-all duration-300 ${
                          invoice.status === "PAID" ? "bg-emerald-500" :
                          invoice.status === "OVERDUE" ? "bg-rose-500" :
                          invoice.status === "PARTIALLY_PAID" ? "bg-amber-500" : "bg-zinc-300"
                        }`} />

                        {/* Header Area */}
                        <div className="flex items-start justify-between mb-4 mt-1">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Invoice</span>
                              <span className="text-[10px] font-semibold text-gray-300">•</span>
                              <span className="text-[10px] font-medium text-gray-500">{formatDate(invoice.dueDate)}</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 mt-0.5 tracking-tight group-hover:text-black transition-colors">
                              {invoice.invoiceNumber}
                            </h4>
                          </div>

                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${getStatusClass(invoice.status)}`}>
                            <span className={`h-1 w-1 rounded-full ${
                              invoice.status === "PAID" ? "bg-emerald-500" :
                              invoice.status === "OVERDUE" ? "bg-rose-500" :
                              invoice.status === "PARTIALLY_PAID" ? "bg-amber-500" : "bg-zinc-400"
                            }`}></span>
                            {invoice.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Customer Area */}
                        <div className="flex items-center gap-3 py-3 border-t border-b border-gray-100/50 my-1">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shadow-sm transition-transform duration-300 group-hover:scale-105 ${avatarColor}`}>
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800 truncate">{invoice.customer.name}</p>
                            <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{invoice.customer.email}</p>
                          </div>
                        </div>

                        {/* Financials Widget */}
                        <div className="grid grid-cols-3 gap-2 bg-gray-50/50 rounded-xl p-3 text-[11px] border border-gray-100/30 my-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total</span>
                            <span className="text-xs font-bold text-gray-800 mt-0.5">{formatCurrency(invoice.amount)}</span>
                          </div>
                          <div className="flex flex-col border-l border-gray-200/50 pl-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Paid</span>
                            <span className="text-xs font-semibold text-emerald-600 mt-0.5">{formatCurrency(invoice.paidAmount)}</span>
                          </div>
                          <div className="flex flex-col border-l border-gray-200/50 pl-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Balance</span>
                            <span className={`text-xs font-bold mt-0.5 ${balance > 0 ? "text-rose-600" : "text-gray-400"}`}>
                              {balance > 0 ? formatCurrency(invoice.balanceAmount) : "—"}
                            </span>
                          </div>
                        </div>


                        {/* Metrics Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[10px] font-bold">
                          <div className="flex items-center gap-1 bg-zinc-100 text-zinc-600 border border-zinc-200/40 rounded-lg px-2 py-0.5">
                            <svg className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Due {formatDate(invoice.dueDate)}</span>
                          </div>

                          <div className="flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg px-2 py-0.5">
                            <svg className="h-3 w-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{invoice.payments.length} Pay</span>
                          </div>

                          <div className="flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-lg px-2 py-0.5">
                            <svg className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span>{invoice.reminders.length} Rem</span>
                          </div>
                        </div>

                        {/* Actions bar */}
                        <div className="pt-3 border-t border-gray-100/50 flex items-center justify-between">
                          <div className="text-[10px] font-semibold text-gray-400">
                            {isPaid ? (
                              <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Fully paid
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {invoice.status === "OVERDUE" ? "Overdue" : "Awaiting"}
                              </span>
                            )}
                          </div>

                          {isPaid ? (
                            <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Paid</span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendReminder(invoice.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-xs font-bold text-white transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              <span>Reminder</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

        {/* Invoice Detail Side Drawer */}
        {showInvoicePanel && activeInvoice && (
          <div className="fixed inset-0 z-50 flex justify-center items-center p-4 md:p-0 md:justify-end">
            {/* Glassmorphic overlay backdrop with fade-in */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
              onClick={handleCloseInvoicePanel}
            />
            
            {/* Drawer Container */}
            <div className="relative z-10 w-full max-w-2xl h-auto max-h-[calc(100vh-2rem)] md:h-full md:max-h-none bg-white flex flex-col shadow-2xl border border-slate-100 md:border-none rounded-[28px] md:rounded-none transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-10 md:zoom-in-100 md:slide-in-from-right-20">
                       {/* 1. Header (Fixed/Flex-shrink-0) */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoice Dossier</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border transition-colors ${getStatusClass(activeInvoice.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        activeInvoice.status === "PAID" ? "bg-emerald-500" :
                        activeInvoice.status === "OVERDUE" ? "bg-rose-500" :
                        activeInvoice.status === "PARTIALLY_PAID" ? "bg-amber-500" : "bg-zinc-400"
                      }`}></span>
                      {activeInvoice.status.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1 tracking-tight">#{activeInvoice.invoiceNumber}</h2>
                  
                  {/* Customer Card Info */}
                  <div className="flex items-center gap-2.5 mt-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-[10px] shadow-xs ${getAvatarColor(activeInvoice.customer.name)}`}>
                      {getInitials(activeInvoice.customer.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-none">{activeInvoice.customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{activeInvoice.customer.email}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleCloseInvoicePanel}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Aggregated Financial Health Banner */}
              <div className="px-4 sm:px-6 pt-4 grid grid-cols-3 gap-2 sm:gap-3 flex-shrink-0 bg-white">
                <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-2.5 sm:p-3 flex flex-col justify-between shadow-2xs">
                  <span className="text-[8px] sm:text-[9px] font-bold text-rose-500 uppercase tracking-widest leading-none">Total Due</span>
                  <span className="text-xs sm:text-sm font-bold text-rose-600 mt-2 truncate">{formatCurrency(activeInvoice.balanceAmount)}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5 sm:p-3 flex flex-col justify-between shadow-2xs">
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Billed</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2 truncate">{formatCurrency(activeInvoice.amount)}</span>
                </div>
                <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-2.5 sm:p-3 flex flex-col justify-between shadow-2xs">
                  <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Cleared Rate</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 mt-2 truncate">
                    {Number(activeInvoice.amount) > 0 ? Math.round((Number(activeInvoice.paidAmount) / Number(activeInvoice.amount)) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Operation Notices */}
              {drawerNotice && (
                <div className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl text-xs font-semibold border flex-shrink-0 animate-shake ${
                  drawerNotice.type === "success" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" 
                    : "bg-red-50 text-red-600 border-red-200/50"
                }`}>
                  {drawerNotice.message}
                </div>
              )}

              {/* Segmented Control tab buttons */}
              <div className="mx-4 sm:mx-6 mt-4 p-1 bg-slate-50 rounded-xl border border-slate-200/50 flex flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setDrawerTab("details"); setShowInlinePaymentForm(false); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                    drawerTab === "details"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-100 scale-[1.02]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => { setDrawerTab("payments"); setShowInlinePaymentForm(false); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                    drawerTab === "payments"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-100 scale-[1.02]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Payments Log
                </button>
                <button
                  type="button"
                  onClick={() => { setDrawerTab("reminders"); setShowInlinePaymentForm(false); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                    drawerTab === "reminders"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-100 scale-[1.02]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Reminders Log
                </button>
              </div>

              {/* 2. Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                
                {/* DETAILS TAB VIEW */}
                {drawerTab === "details" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* INSET INLINE PAYMENT FORM OVERLAY (QUICK PAY) */}
                    {showInlinePaymentForm && (
                      <div className="rounded-2xl border border-slate-300 bg-[#fafaff] p-4 shadow-inner space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 tracking-tight">Record Invoice Payment</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Quick Pay Panel</p>
                          </div>
                          <button
                            onClick={() => setShowInlinePaymentForm(false)}
                            className="text-slate-400 hover:text-slate-650 rounded-full p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleInlinePaymentSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Payment Amount (₹) *</label>
                              <input
                                type="number"
                                required
                                min="1"
                                max={Number(activeInvoice.balanceAmount)}
                                value={inlinePaymentData.amountPaid}
                                onChange={(e) => setInlinePaymentData(p => ({ ...p, amountPaid: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-955 font-bold focus:ring-2 focus:ring-black focus:border-black outline-none"
                              />
                              <span className="text-[9px] font-bold text-rose-505 block mt-1">Due: {formatCurrency(activeInvoice.balanceAmount)}</span>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Payment Mode *</label>
                              <select
                                value={inlinePaymentData.paymentMode}
                                onChange={(e) => setInlinePaymentData(p => ({ ...p, paymentMode: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 font-semibold focus:ring-2 focus:ring-black focus:border-black outline-none bg-white"
                              >
                                <option value="UPI">UPI</option>
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CARD">Card</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Remarks / Note</label>
                            <input
                              value={inlinePaymentData.remarks}
                              onChange={(e) => setInlinePaymentData(p => ({ ...p, remarks: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 font-semibold focus:ring-2 focus:ring-black focus:border-black outline-none"
                              placeholder="e.g. UPI Ref #987654"
                            />
                          </div>

                          <div className="flex gap-2 justify-end border-t border-slate-200/60 pt-3">
                            <button
                              type="button"
                              onClick={() => setShowInlinePaymentForm(false)}
                              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={inlinePaymentSaving}
                              className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:bg-zinc-400 transition-colors cursor-pointer shadow-sm hover:shadow"
                            >
                              {inlinePaymentSaving ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Record Transaction"
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Description, Dates & Info Cards */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3.5 shadow-2xs">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billing Date</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {formatDate(activeInvoice.dueDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Due Date</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {formatDate(activeInvoice.dueDate)}
                          </span>
                        </div>
                      </div>

                      {activeInvoice.description && (
                        <div className="pt-2.5 border-t border-slate-100 text-xs">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                          <p className="text-slate-650 mt-1 bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 leading-relaxed font-medium">
                            {activeInvoice.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interactive Actions Tray (Quick Pay & Send Reminder Buttons) */}
                    {activeInvoice.status !== "PAID" && activeInvoice.status !== "CANCELLED" && !showInlinePaymentForm && (
                      <div className="grid grid-cols-2 gap-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowInlinePaymentForm(true);
                            setInlinePaymentData({
                              amountPaid: String(activeInvoice.balanceAmount),
                              paymentMode: "UPI",
                              remarks: "Direct Quick Pay",
                            });
                            setDrawerNotice(null);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs tracking-wide active:scale-98 transition-all cursor-pointer shadow-sm hover:shadow"
                        >
                          <DollarSign className="w-4 h-4 flex-shrink-0" />
                          Quick Pay
                        </button>
                        
                        <button
                          type="button"
                          disabled={sendingReminder}
                          onClick={() => handleSendReminderInline(activeInvoice.id)}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs tracking-wide active:scale-98 disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
                        >
                          {sendingReminder ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />
                          ) : (
                            <Send className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          {sendingReminder ? "Sending..." : "Reminder"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* PAYMENTS TAB VIEW */}
                {drawerTab === "payments" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {activeInvoice.payments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-250">
                        <DollarSign className="w-10 h-10 text-slate-350" />
                        <p className="mt-3 text-sm font-semibold text-slate-500">No payments received yet</p>
                      </div>
                    ) : (
                      activeInvoice.payments.map((pmt) => (
                        <div key={pmt.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs flex justify-between items-center transition-all hover:border-slate-200 animate-in slide-in-from-bottom-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-600">₹{Number(pmt.amountPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              <span className="inline-flex items-center text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.2 rounded border border-indigo-100 uppercase">{pmt.paymentMode}</span>
                            </div>
                            {pmt.remarks && <p className="text-[10px] text-slate-500 mt-1.5 font-medium italic">Remarks: {pmt.remarks}</p>}
                          </div>
                          <div className="text-right flex flex-col justify-center">
                            <span className="text-xs font-bold text-slate-800">{new Date(pmt.paymentDate).toLocaleDateString("en-IN")}</span>
                            <span className="text-[9px] text-slate-400 font-medium mt-0.5">Recorded</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* REMINDERS TAB VIEW */}
                {drawerTab === "reminders" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {activeInvoice.reminders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-250">
                        <Send className="w-10 h-10 text-slate-350" />
                        <p className="mt-3 text-sm font-semibold text-slate-500">No reminders dispatched yet</p>
                      </div>
                    ) : (
                      activeInvoice.reminders.map((rem) => (
                        <div key={rem.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs flex justify-between items-center transition-all hover:border-slate-200 animate-in slide-in-from-bottom-2">
                          <div className="min-w-0 pr-4">
                            <h6 className="text-xs font-bold text-slate-850 truncate">{rem.status === "SENT" ? "Email Reminder Sent" : "Reminder Attempt Failed"}</h6>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">Recipient: {activeInvoice.customer.email}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`inline-flex items-center text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                              rem.status === "SENT" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-650 border-red-100"
                            }`}>{rem.status}</span>
                            {rem.sentAt && <p className="text-xs font-bold text-slate-800 mt-1">{new Date(rem.sentAt).toLocaleDateString("en-IN")}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>

              {/* 3. Footer (Fixed/Flex-shrink-0) */}
              <div className="p-3 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex flex-row gap-1.5 sm:gap-3">
                {activeInvoice.status !== "PAID" && activeInvoice.status !== "CANCELLED" && (
                  <button 
                    onClick={() => handleCancelInvoice(activeInvoice.id)} 
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-rose-200 bg-white py-2 sm:py-2.5 px-1 sm:px-3 text-[10px] sm:text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition cursor-pointer active:scale-97"
                  >
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" /> Cancel
                  </button>
                )}
                
                {/* Delete Invoice Button - allowed only if no payments registered */}
                <button 
                  onClick={() => handleDeleteInvoice(activeInvoice.id)} 
                  disabled={activeInvoice.payments.length > 0}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-red-200 bg-white text-red-600 py-2 sm:py-2.5 px-1 sm:px-3 text-[10px] sm:text-xs font-bold hover:bg-red-50/50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer active:scale-97"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" /> Delete
                </button>

                <button 
                  onClick={() => handlePrintInvoice(activeInvoice)} 
                  disabled={pdfDownloading}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-black py-2 sm:py-2.5 px-1 sm:px-3 text-[10px] sm:text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition cursor-pointer active:scale-97 shadow-sm"
                >
                  {pdfDownloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-white" /> <span className="hidden xs:inline">Compiling...</span><span className="xs:hidden">Wait...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Download </span>PDF
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}
    </DashboardShell>
  );
}
