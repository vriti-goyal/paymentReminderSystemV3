"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Briefcase, MapPin, Phone, Mail, FileText, Pencil, User, X, Camera, Trash2, Loader2, Calendar, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Send, History, DollarSign } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  companyName: string | null;
  createdAt: string;
  totalDueAmount?: number;
  image?: string | null;
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
  reminderType: string;
  status: string;
  sentAt: string | null;
  subject: string;
  message: string;
  sentTo: string;
  createdAt: string;
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
  notes: string | null;
  createdAt: string;
  payments: Payment[];
  reminders: Reminder[];
};

interface CustomersClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    businessName?: string | null;
  };
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

export default function CustomersClient({ user }: CustomersClientProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    companyName: "",
  });

  const [error, setError] = useState("");
  const [isAddFormExpanded, setIsAddFormExpanded] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    companyName: "",
    image: "",
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Invoices Drawer State hooks
  const [activeDrawerCustomer, setActiveDrawerCustomer] = useState<Customer | null>(null);
  const [drawerInvoices, setDrawerInvoices] = useState<Invoice[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"invoices" | "payments" | "reminders">("invoices");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Inset Inline Recording Payment forms
  const [inlinePaymentInvoice, setInlinePaymentInvoice] = useState<Invoice | null>(null);
  const [inlinePaymentData, setInlinePaymentData] = useState({
    amountPaid: "",
    paymentMode: "UPI",
    remarks: "",
  });
  const [inlinePaymentSaving, setInlinePaymentSaving] = useState(false);

  // Send Reminder Dispatcher Status
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  async function fetchCustomerInvoices(customerId: string) {
    setDrawerLoading(true);
    setDrawerNotice(null);
    try {
      const response = await fetch(`/api/invoices?customerId=${customerId}`);
      const data = await response.json();
      if (response.ok) {
        setDrawerInvoices(data);
      } else {
        setDrawerNotice({ type: "error", message: data.message || "Failed to load invoices" });
      }
    } catch (err) {
      console.error(err);
      setDrawerNotice({ type: "error", message: "Failed to load invoices due to network error" });
    } finally {
      setDrawerLoading(false);
    }
  }

  function handleOpenInvoicesDrawer(customer: Customer) {
    setActiveDrawerCustomer(customer);
    setDrawerTab("invoices");
    setExpandedInvoiceId(null);
    setInlinePaymentInvoice(null);
    setDrawerNotice(null);
    fetchCustomerInvoices(customer.id);
  }

  async function handleInlinePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inlinePaymentInvoice || !activeDrawerCustomer) return;

    setInlinePaymentSaving(true);
    setDrawerNotice(null);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: inlinePaymentInvoice.id,
          amountPaid: inlinePaymentData.amountPaid,
          paymentMode: inlinePaymentData.paymentMode,
          remarks: inlinePaymentData.remarks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDrawerNotice({ type: "error", message: data.message || "Failed to add payment" });
        return;
      }

      setDrawerNotice({ type: "success", message: "Payment recorded successfully!" });
      setInlinePaymentInvoice(null);
      setInlinePaymentData({
        amountPaid: "",
        paymentMode: "UPI",
        remarks: "",
      });

      await fetchCustomerInvoices(activeDrawerCustomer.id);
      await fetchCustomers(search);
    } catch (err) {
      console.error(err);
      setDrawerNotice({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setInlinePaymentSaving(false);
    }
  }

  async function handleSendReminderInline(invoiceId: string) {
    if (!activeDrawerCustomer) return;
    setSendingReminderId(invoiceId);
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
      await fetchCustomerInvoices(activeDrawerCustomer.id);
    } catch (err) {
      console.error(err);
      setDrawerNotice({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setSendingReminderId(null);
    }
  }

  async function fetchCustomers(searchValue = "") {
    setLoading(true);

    const response = await fetch(`/api/customers?search=${searchValue}`);
    const data = await response.json();

    setLoading(false);

    if (response.ok) {
      setCustomers(data);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Failed to create customer");
      return;
    }

    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      companyName: "",
    });

    setIsAddFormExpanded(false);
    fetchCustomers(search);
  }

  async function handleDelete(id: string) {
    const confirmDelete = confirm("Are you sure you want to delete this customer?");

    if (!confirmDelete) return;

    const response = await fetch(`/api/customers/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      fetchCustomers(search);
    }
  }

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setSearch(value);
    fetchCustomers(value);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setEditError("Image is too large. Maximum size is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditFormData((prev) => ({
        ...prev,
        image: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCustomer) return;

    setEditError("");
    setEditSaving(true);

    try {
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.message || "Failed to update customer");
        return;
      }

      setEditingCustomer(null);
      fetchCustomers(search);
    } catch (err) {
      console.error(err);
      setEditError("An unexpected error occurred");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!editingCustomer) return;

    try {
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEditingCustomer(null);
        fetchCustomers(search);
      } else {
        const data = await response.json();
        setEditError(data.message || "Failed to delete customer");
      }
    } catch (err) {
      console.error(err);
      setEditError("An unexpected error occurred");
    }
  }

  return (
    <DashboardShell
      user={user}
      title="Customers"
    >
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div 
              className="flex items-center justify-between cursor-pointer lg:cursor-default select-none"
              onClick={() => setIsAddFormExpanded(!isAddFormExpanded)}
            >
              <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Add Customer
              </h2>
              <button
                type="button"
                className="lg:hidden flex items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-500 hover:text-slate-900 transition-all duration-200 cursor-pointer active:scale-95"
              >
                {isAddFormExpanded ? (
                  <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>

            <div className={`${isAddFormExpanded ? "block animate-in fade-in slide-in-from-top-4 duration-300" : "hidden"} lg:block`}>
              {error && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Customer Name *
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                    placeholder="Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                    placeholder="rahul@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                    placeholder="9876543210"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Company Name
                  </label>
                  <input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                    placeholder="ABC Traders"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                    placeholder="Customer address"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-all duration-200 shadow-sm"
                >
                  Add Customer
                </button>
              </form>
            </div>
          </section>

          <section className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Customer List
                </h2>
                <p className="text-xs font-medium text-gray-400 mt-1">
                  Manage your active directory of customers
                </p>
              </div>

              <input
                value={search}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 md:w-72"
                placeholder="Search name, email, phone..."
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              {loading ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-gray-500">Loading customers...</p>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl bg-gray-50/50 border border-dashed border-gray-200">
                  <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-3 text-sm font-semibold text-gray-500">No customers found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {customers.map((customer) => {
                    const avatarColor = getAvatarColor(customer.name);

                    return (
                      <div
                        key={customer.id}
                        className="group relative flex flex-col justify-between rounded-[20px] border border-slate-100/80 bg-gradient-to-br from-[#f5f7ff] via-white to-white p-3 shadow-[0_4px_15px_rgb(0,0,0,0.01)] hover:shadow-[0_10px_25px_rgb(59,130,246,0.03)] hover:border-slate-200/90 hover:-translate-y-0.5 transition-all duration-300 ease-out"
                      >
                        {/* Glassmorphic highlights */}
                        <div className="absolute inset-0 rounded-[20px] bg-white/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="relative z-10">
                          {/* Top Row: Name Block (Left) + Avatar Block (Right) */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex flex-col justify-center">
                              {/* Full Name */}
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 truncate leading-none">
                                {customer.name}
                              </h4>
                              
                              {/* Total Due Amount Badge */}
                              <div className="mt-0.5 flex items-center">
                                {customer.totalDueAmount && customer.totalDueAmount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/40 rounded-full uppercase tracking-wider">
                                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                    Due: ₹{customer.totalDueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/40 rounded-full uppercase tracking-wider">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                    No Due
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Circular Profile Pic (Top Right) */}
                            <div className="flex-shrink-0">
                              {customer.image ? (
                                <img
                                  src={customer.image}
                                  alt={customer.name}
                                  className="w-8 h-8 rounded-lg border border-slate-200/80 object-cover shadow-xs transition-all duration-300 group-hover:scale-105 group-hover:rotate-3"
                                />
                              ) : (
                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-xs flex-shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 ${avatarColor}`}>
                                  <span className="text-[10px] font-bold leading-none">{getInitials(customer.name)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Grid of Key-Value Fields */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100/70 space-y-0.5">
                            {/* Business Row */}
                            <div className="flex items-center justify-between py-0.5 border-b border-slate-100/40 group/row">
                              <div className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/50 text-blue-600 shadow-[0_1.5px_4px_rgba(59,130,246,0.05)] group-hover/row:from-blue-500 group-hover/row:to-indigo-600 group-hover/row:text-white group-hover/row:border-blue-500 group-hover/row:shadow-[0_3px_8px_rgba(59,130,246,0.2)] group-hover/row:scale-105 group-hover/row:-rotate-3 transition-all duration-200 ease-out">
                                  <Briefcase className="w-3 h-3 stroke-[2.2]" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 group-hover/row:text-slate-600 uppercase tracking-wider transition-colors duration-200">Business</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 group-hover/row:text-indigo-600 truncate max-w-[130px] transition-colors duration-200" title={customer.companyName || ""}>
                                {customer.companyName || "Individual"}
                              </span>
                            </div>

                            {/* Phone Row */}
                            <div className="flex items-center justify-between py-0.5 border-b border-slate-100/40 group/row">
                              <div className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-violet-50 to-fuchsia-50/50 border border-violet-100/50 text-violet-600 shadow-[0_1.5px_4px_rgba(139,92,246,0.05)] group-hover/row:from-violet-500 group-hover/row:to-fuchsia-600 group-hover/row:text-white group-hover/row:border-violet-500 group-hover/row:shadow-[0_3px_8px_rgba(139,92,246,0.2)] group-hover/row:scale-105 group-hover/row:rotate-3 transition-all duration-200 ease-out">
                                  <Phone className="w-3 h-3 stroke-[2.2]" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 group-hover/row:text-slate-600 uppercase tracking-wider transition-colors duration-200">Phone</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 group-hover/row:text-indigo-600 truncate max-w-[130px] transition-colors duration-200">
                                {customer.phone || "Not Specified"}
                              </span>
                            </div>

                            {/* Email Row */}
                            <div className="flex items-center justify-between py-0.5 group/row">
                              <div className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-pink-50 to-rose-50/50 border border-pink-100/50 text-pink-600 shadow-[0_1.5px_4px_rgba(244,63,94,0.05)] group-hover/row:from-pink-500 group-hover/row:to-rose-600 group-hover/row:text-white group-hover/row:border-pink-500 group-hover/row:shadow-[0_3px_8px_rgba(244,63,94,0.2)] group-hover/row:scale-105 group-hover/row:-rotate-3 transition-all duration-200 ease-out">
                                  <Mail className="w-3 h-3 stroke-[2.2]" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 group-hover/row:text-slate-600 uppercase tracking-wider transition-colors duration-200">Email</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 group-hover/row:text-indigo-600 truncate max-w-[130px] transition-colors duration-200" title={customer.email}>
                                {customer.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="relative z-10 mt-2.5 pt-2.5 border-t border-slate-100/70 flex gap-2">
                          <button
                            type="button"
                            className="group/btn flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200/80 bg-white text-slate-700 font-bold text-[9.5px] whitespace-nowrap tracking-wide hover:bg-slate-50/80 hover:border-slate-300 hover:text-indigo-600 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer active:scale-[0.97]"
                            onClick={() => handleOpenInvoicesDrawer(customer)}
                          >
                            <FileText className="w-3 h-3 stroke-[2.2] text-slate-400 group-hover/btn:text-indigo-600 group-hover/btn:scale-110 group-hover/btn:-rotate-6 transition-all duration-200" />
                            View Invoices
                          </button>
                          <button
                            type="button"
                            className="group/btn2 flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-[9.5px] whitespace-nowrap tracking-wide shadow-sm shadow-indigo-500/10 hover:shadow-md hover:shadow-indigo-500/20 active:scale-[0.97] transition-all duration-200 cursor-pointer"
                            onClick={() => {
                              setEditingCustomer(customer);
                              setEditFormData({
                                name: customer.name,
                                email: customer.email,
                                phone: customer.phone || "",
                                address: customer.address || "",
                                companyName: customer.companyName || "",
                                image: customer.image || "",
                              });
                              setEditError("");
                              setIsConfirmingDelete(false);
                            }}
                          >
                            <Pencil className="w-3 h-3 stroke-[2.2] text-white/90 group-hover/btn2:scale-110 group-hover/btn2:rotate-12 transition-all duration-200" />
                            Edit Profile
                          </button>
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

      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glassmorphic overlay backdrop with fade-in */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
            onClick={() => setEditingCustomer(null)}
          />
          
          {/* Modal container with scale-up and slide-in animation */}
          <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-10">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Customer Profile</h3>
                <p className="text-xs font-medium text-slate-400 mt-1">Update customer details, picture, and preferences</p>
              </div>
              <button 
                onClick={() => setEditingCustomer(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleEditSubmit} className="mt-6 space-y-6 flex-1 overflow-y-auto pr-1">
              
              {/* Profile Picture Selector */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  {editFormData.image ? (
                    <img 
                      src={editFormData.image} 
                      alt="Profile Preview" 
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xs font-bold text-lg ${getAvatarColor(editFormData.name || "A")}`}>
                      {getInitials(editFormData.name || "A")}
                    </div>
                  )}
                  <label 
                    htmlFor="edit-image-upload" 
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-black text-white hover:bg-zinc-800 shadow-sm transition-transform active:scale-90"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input 
                    id="edit-image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
                </div>
                
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile Picture</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById("edit-image-upload")?.click()}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Upload Photo
                    </button>
                    {editFormData.image && (
                      <button
                        type="button"
                        onClick={() => setEditFormData(prev => ({ ...prev, image: "" }))}
                        className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Name *</label>
                  <input
                    name="name"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Email *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Phone</label>
                  <input
                    name="phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Company Name</label>
                  <input
                    name="companyName"
                    value={editFormData.companyName}
                    onChange={(e) => setEditFormData(p => ({ ...p, companyName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Address</label>
                <textarea
                  name="address"
                  rows={3}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData(p => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                />
              </div>

              {editError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100 animate-shake">
                  {editError}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-100 pt-4 mt-6">
                {/* Delete Button (Left side on desktop, full width mobile) */}
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-red-600 animate-pulse">Are you sure?</span>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-colors duration-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Customer
                  </button>
                )}

                {/* Cancel/Save (Right side) */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="w-1/2 sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:bg-zinc-400 transition-colors duration-200 cursor-pointer"
                  >
                    {editSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Invoices */}
      {activeDrawerCustomer && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 md:p-0 md:justify-end">
          {/* Glassmorphic overlay backdrop with fade-in */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
            onClick={() => setActiveDrawerCustomer(null)}
          />
          
          {/* Drawer Panel Container */}
          <div className="relative z-10 w-full max-w-2xl h-auto max-h-[calc(100vh-2rem)] md:h-full md:max-h-none bg-white flex flex-col shadow-2xl border border-slate-100 md:border-none rounded-[28px] md:rounded-none transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-10 md:zoom-in-100 md:slide-in-from-right-full">
            
            {/* 1. Header (Customer Profile summary) */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between flex-shrink-0 gap-3 sm:gap-4">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                {activeDrawerCustomer.image ? (
                  <img
                    src={activeDrawerCustomer.image}
                    alt={activeDrawerCustomer.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover border border-slate-200 flex-shrink-0"
                  />
                ) : (
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${getAvatarColor(activeDrawerCustomer.name)}`}>
                    {getInitials(activeDrawerCustomer.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">{activeDrawerCustomer.name}</h3>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                    {activeDrawerCustomer.companyName || "Individual Customer"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 font-bold text-[10px] sm:text-[11px] tracking-wide transition-all duration-200 hover:bg-slate-100/70 hover:border-slate-200 hover:shadow-[0_1px_4px_rgba(0,0,0,0.02)] group/contact-email">
                      <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover/contact-email:text-indigo-600 group-hover/contact-email:scale-105 transition-all duration-200 stroke-[2.2]" />
                      <span className="truncate max-w-[130px] xs:max-w-[170px] sm:max-w-none">{activeDrawerCustomer.email}</span>
                    </span>
                    {activeDrawerCustomer.phone && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 font-bold text-[10px] sm:text-[11px] tracking-wide transition-all duration-200 hover:bg-slate-100/70 hover:border-slate-200 hover:shadow-[0_1px_4px_rgba(0,0,0,0.02)] group/contact-phone">
                        <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover/contact-phone:text-indigo-600 group-hover/contact-phone:scale-105 transition-all duration-200 stroke-[2.2]" />
                        <span className="truncate max-w-[100px] xs:max-w-[130px] sm:max-w-none">{activeDrawerCustomer.phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveDrawerCustomer(null)}
                className="rounded-full p-1.5 sm:p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aggregated Stats Overview Banner */}
            {!drawerLoading && drawerInvoices.length > 0 && (
              (() => {
                const totalBilled = drawerInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
                const totalPaid = drawerInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
                const totalDue = drawerInvoices.reduce((sum, inv) => inv.status !== 'CANCELLED' ? sum + Number(inv.balanceAmount) : sum, 0);
                const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

                return (
                  <div className="px-4 sm:px-6 pt-4 grid grid-cols-3 gap-2 flex-shrink-0">
                    <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-2.5 sm:p-3 flex flex-col justify-between">
                      <span className="text-[8px] sm:text-[9px] font-bold text-rose-500 uppercase tracking-widest leading-none">Total Due</span>
                      <span className="text-xs sm:text-sm font-bold text-rose-600 mt-2 truncate">₹{totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5 sm:p-3 flex flex-col justify-between">
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Billed</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2 truncate">₹{totalBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-2.5 sm:p-3 flex flex-col justify-between">
                      <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Collection Rate</span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-600 mt-2 truncate">{collectionRate}%</span>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Operation Notice Displays */}
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
                onClick={() => { setDrawerTab("invoices"); setInlinePaymentInvoice(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                  drawerTab === "invoices"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-100 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Invoices
              </button>
              <button
                type="button"
                onClick={() => { setDrawerTab("payments"); setInlinePaymentInvoice(null); }}
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
                onClick={() => { setDrawerTab("reminders"); setInlinePaymentInvoice(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                  drawerTab === "reminders"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-100 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Reminders Log
              </button>
            </div>

            {/* 2. Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {drawerLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading dossier...</span>
                </div>
              ) : drawerInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                  <FileText className="w-10 h-10 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">No invoices generated yet</p>
                  <p className="text-xs text-slate-400 mt-1">Create an invoice from the main invoices menu to start tracking billing.</p>
                </div>
              ) : (
                <>
                  {/* INVOICES TAB VIEW */}
                  {drawerTab === "invoices" && !inlinePaymentInvoice && (
                    <div className="space-y-4">
                      {drawerInvoices.map((invoice) => {
                        const isExpanded = expandedInvoiceId === invoice.id;
                        const isPaid = invoice.status === "PAID";
                        const balance = Number(invoice.balanceAmount);

                        return (
                          <div 
                            key={invoice.id}
                            className={`rounded-2xl border bg-white shadow-xs overflow-hidden transition-all duration-300 ${
                              isExpanded ? "border-slate-300 ring-1 ring-slate-200 shadow-md animate-in fade-in duration-200" : "border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            {/* Invoice Accordion Title Bar */}
                            <div 
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/30 transition-colors"
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900 tracking-tight">{invoice.invoiceNumber}</span>
                                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                                    invoice.status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                                    invoice.status === "OVERDUE" ? "bg-rose-50 text-rose-700 border-rose-200/50" :
                                    invoice.status === "PARTIALLY_PAID" ? "bg-amber-50 text-amber-700 border-amber-200/50" : "bg-slate-50 text-slate-600 border-slate-200/50"
                                  }`}>
                                    {invoice.status.replace("_", " ")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                  <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3 flex-shrink-0" /> Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</span>
                                  <span>•</span>
                                  <span>Created: {new Date(invoice.createdAt).toLocaleDateString("en-IN")}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Balance</p>
                                  <p className={`text-sm font-bold mt-1 ${balance > 0 ? "text-rose-600" : "text-slate-400"}`}>
                                    {balance > 0 ? `₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                  </p>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </div>

                            {/* Expanded Details Pane */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50/20 p-4 space-y-4 animate-in slide-in-from-top-3 duration-250">
                                
                                {/* Financial Stats Summary */}
                                <div className="grid grid-cols-3 gap-2 bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-xs">
                                  <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
                                    <span className="font-bold text-slate-800">₹{Number(invoice.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="border-l border-slate-200 pl-3">
                                    <span className="text-[9px] font-bold text-slate-400 tracking-wider block">Amount Paid</span>
                                    <span className="font-bold text-emerald-600">₹{Number(invoice.paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="border-l border-slate-200 pl-3">
                                    <span className="text-[9px] font-bold text-slate-400 tracking-wider block">Outstanding Due</span>
                                    <span className={`font-bold ${balance > 0 ? "text-rose-600" : "text-slate-400"}`}>
                                      {balance > 0 ? `₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                    </span>
                                  </div>
                                </div>

                                {/* Description & Notes */}
                                {(invoice.description || invoice.notes) && (
                                  <div className="space-y-2 text-xs">
                                    {invoice.description && (
                                      <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billing Description</span>
                                        <p className="text-slate-600 mt-0.5 bg-white border border-slate-100 rounded-lg p-2 font-medium">{invoice.description}</p>
                                      </div>
                                    )}
                                    {invoice.notes && (
                                      <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Internal Notes</span>
                                        <p className="text-slate-500 mt-0.5 italic">{invoice.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* COLLAPSIBLE TIMELINE FOR THE INVOICE */}
                                <div className="space-y-3">
                                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1 mt-2">
                                    <History className="w-3.5 h-3.5 flex-shrink-0" />
                                    Invoice Activity logs
                                  </h5>

                                  {/* Payments Log */}
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Payments Received</span>
                                    {invoice.payments.length === 0 ? (
                                      <p className="text-[11px] font-semibold text-slate-400 bg-white border border-slate-100 rounded-lg p-2 text-center shadow-2xs">No payments received for this invoice yet.</p>
                                    ) : (
                                      <div className="space-y-1 bg-white border border-slate-100 rounded-xl p-2.5 shadow-2xs">
                                        {invoice.payments.map((pmt) => (
                                          <div key={pmt.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0">
                                            <div>
                                              <span className="font-bold text-slate-850">₹{Number(pmt.amountPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                              <span className="ml-1.5 inline-flex items-center text-[8px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100">{pmt.paymentMode}</span>
                                              {pmt.remarks && <p className="text-[10px] text-slate-400 font-medium mt-0.5">Remarks: {pmt.remarks}</p>}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-semibold">{new Date(pmt.paymentDate).toLocaleDateString("en-IN")}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Reminders Dispatch Log */}
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Reminder Dispatches</span>
                                    {invoice.reminders.length === 0 ? (
                                      <p className="text-[11px] font-semibold text-slate-400 bg-white border border-slate-100 rounded-lg p-2 text-center shadow-2xs">No reminders triggered yet.</p>
                                    ) : (
                                      <div className="space-y-1 bg-white border border-slate-100 rounded-xl p-2.5 shadow-2xs">
                                        {invoice.reminders.map((rem) => (
                                          <div key={rem.id} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-50 last:border-0">
                                            <div className="min-w-0 pr-2">
                                              <p className="font-bold text-slate-800 truncate">{rem.subject}</p>
                                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Sent to: {rem.sentTo}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                              <span className={`inline-flex items-center text-[8px] font-bold px-1.5 py-0.2 border rounded ${
                                                rem.status === "SENT" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                                              }`}>{rem.status}</span>
                                              {rem.sentAt && <p className="text-[9px] text-slate-400 font-medium mt-0.5">{new Date(rem.sentAt).toLocaleDateString("en-IN")}</p>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Active CTAs inside timeline drawer */}
                                <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2 text-xs">
                                  {!isPaid && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={sendingReminderId === invoice.id}
                                        onClick={() => handleSendReminderInline(invoice.id)}
                                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
                                      >
                                        <Send className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                        {sendingReminderId === invoice.id ? "Sending..." : "Send Reminder"}
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setInlinePaymentInvoice(invoice);
                                          setInlinePaymentData({
                                            amountPaid: String(balance),
                                            paymentMode: "UPI",
                                            remarks: "Direct Customer Payment",
                                          });
                                          setDrawerNotice(null);
                                        }}
                                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-black hover:bg-zinc-800 text-white font-bold active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                                      >
                                        <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                                        Quick Payment
                                      </button>
                                    </>
                                  )}
                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* FLAT PAYMENTS TAB VIEW */}
                  {drawerTab === "payments" && (
                    (() => {
                      // Flatten and sort payments
                      const flatPayments = drawerInvoices
                        .flatMap((inv) => inv.payments.map((p) => ({ ...p, invoiceNumber: inv.invoiceNumber })))
                        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

                      if (flatPayments.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 animate-in fade-in">
                            <DollarSign className="w-10 h-10 text-slate-300" />
                            <p className="mt-3 text-sm font-semibold text-slate-500">No payment records found</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          {flatPayments.map((pmt) => (
                            <div key={pmt.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs flex justify-between items-center transition-all hover:border-slate-200">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-emerald-600">₹{Number(pmt.amountPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                  <span className="inline-flex items-center text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.2 rounded border border-indigo-100 uppercase">{pmt.paymentMode}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1">Invoice: {pmt.invoiceNumber}</p>
                                {pmt.remarks && <p className="text-xs text-slate-500 mt-1 font-medium italic">Remarks: {pmt.remarks}</p>}
                              </div>
                              <div className="text-right flex flex-col justify-center">
                                <span className="text-xs font-bold text-slate-800">{new Date(pmt.paymentDate).toLocaleDateString("en-IN")}</span>
                                <span className="text-[9px] text-slate-400 font-medium mt-0.5">Recorded</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}

                  {/* FLAT REMINDERS TAB VIEW */}
                  {drawerTab === "reminders" && (
                    (() => {
                      // Flatten and sort reminders
                      const flatReminders = drawerInvoices
                        .flatMap((inv) => inv.reminders.map((r) => ({ ...r, invoiceNumber: inv.invoiceNumber })))
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                      if (flatReminders.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 animate-in fade-in">
                            <Send className="w-10 h-10 text-slate-300" />
                            <p className="mt-3 text-sm font-semibold text-slate-500">No reminder notifications triggered</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          {flatReminders.map((rem) => (
                            <div key={rem.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs flex justify-between items-center transition-all hover:border-slate-200">
                              <div className="min-w-0 pr-4">
                                <h6 className="text-xs font-bold text-slate-850 truncate">{rem.subject}</h6>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1">Invoice: {rem.invoiceNumber} • Recipient: {rem.sentTo}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={`inline-flex items-center text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                                  rem.status === "SENT" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                                }`}>{rem.status}</span>
                                <p className="text-[10px] font-bold text-slate-800 mt-1">{new Date(rem.createdAt).toLocaleDateString("en-IN")}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}

                  {/* INSET INLINE PAYMENT FORM OVERLAY */}
                  {inlinePaymentInvoice && (
                    <div className="rounded-2xl border border-slate-300 bg-[#fafaff] p-5 shadow-inner space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight">Record Invoice Payment</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Invoice: {inlinePaymentInvoice.invoiceNumber}</p>
                        </div>
                        <button
                          onClick={() => setInlinePaymentInvoice(null)}
                          className="text-slate-400 hover:text-slate-600 rounded-full p-1 cursor-pointer"
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
                              max={Number(inlinePaymentInvoice.balanceAmount)}
                              value={inlinePaymentData.amountPaid}
                              onChange={(e) => setInlinePaymentData(p => ({ ...p, amountPaid: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 font-semibold focus:ring-2 focus:ring-black focus:border-black outline-none"
                            />
                            <span className="text-[9px] font-bold text-rose-500 block mt-1">Outstanding: ₹{Number(inlinePaymentInvoice.balanceAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Payment Mode *</label>
                            <select
                              value={inlinePaymentData.paymentMode}
                              onChange={(e) => setInlinePaymentData(p => ({ ...p, paymentMode: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 font-semibold focus:ring-2 focus:ring-black focus:border-black outline-none"
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
                            placeholder="e.g. UPI Ref #123456"
                          />
                        </div>

                        <div className="flex gap-2 justify-end border-t border-slate-200/60 pt-3">
                          <button
                            type="button"
                            onClick={() => setInlinePaymentInvoice(null)}
                            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={inlinePaymentSaving}
                            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:bg-zinc-400 transition-colors cursor-pointer shadow-sm hover:shadow"
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
                </>
              )}

            </div>

          </div>
        </div>
      )}
    </DashboardShell>
  );
}
