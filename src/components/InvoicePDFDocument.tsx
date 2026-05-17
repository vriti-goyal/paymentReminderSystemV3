import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Define TypeScript types
export interface Customer {
  name: string;
  email: string;
  companyName?: string | null;
}

export interface Payment {
  id: string;
  amountPaid: string;
  paymentMode: string;
  paymentDate: string;
}

export interface Invoice {
  invoiceNumber: string;
  amount: string;
  paidAmount: string;
  balanceAmount: string;
  dueDate: string;
  status: string;
  description: string | null;
  customer: Customer;
  payments: Payment[];
  createdAt?: string;
}

interface InvoicePDFDocumentProps {
  invoice: Invoice;
  businessName?: string;
  businessEmail?: string;
}

// Styling system mimicking our premium Tailwind design system
const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 24,
    marginBottom: 24,
  },
  businessSection: {
    flexDirection: "column",
  },
  businessName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  businessEmail: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },
  invoiceMetaSection: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  billedToSection: {
    flexDirection: "column",
    maxWidth: 260,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  customerName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
  },
  customerEmail: {
    fontSize: 10,
    color: "#475569",
    marginTop: 2,
  },
  customerCompany: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  statusSection: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  statusBadgePaid: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  statusTextPaid: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#047857",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadgeOverdue: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  statusTextOverdue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#b91c1c",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadgePartial: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  statusTextPartial: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#b45309",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadgeDefault: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  statusTextDefault: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#3f3f46",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  datesSection: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateItem: {
    flexDirection: "column",
    flex: 1,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#334155",
    marginTop: 2,
  },
  descriptionCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.5,
  },
  financialGrid: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  financialSummary: {
    width: 220,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  financialLabel: {
    fontSize: 9,
    color: "#64748b",
  },
  financialValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
  },
  totalValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export function InvoicePDFDocument({ invoice, businessName = "My Business", businessEmail = "" }: InvoicePDFDocumentProps) {
  const formatDate = (val: string) => new Date(val).toLocaleDateString("en-IN");
  const formatCurrency = (val: string) => `INR ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // Determine which status badge stylesheet to use
  let statusBadgeStyle = styles.statusBadgeDefault;
  let statusTextStyle = styles.statusTextDefault;

  if (invoice.status === "PAID") {
    statusBadgeStyle = styles.statusBadgePaid;
    statusTextStyle = styles.statusTextPaid;
  } else if (invoice.status === "OVERDUE") {
    statusBadgeStyle = styles.statusBadgeOverdue;
    statusTextStyle = styles.statusTextOverdue;
  } else if (invoice.status === "PARTIALLY_PAID") {
    statusBadgeStyle = styles.statusBadgePartial;
    statusTextStyle = styles.statusTextPartial;
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header section with business & title */}
        <View style={styles.header}>
          <View style={styles.businessSection}>
            <Text style={styles.businessName}>{businessName}</Text>
            {businessEmail && <Text style={styles.businessEmail}>{businessEmail}</Text>}
          </View>
          <View style={styles.invoiceMetaSection}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* Customer & status metadata */}
        <View style={styles.detailsContainer}>
          <View style={styles.billedToSection}>
            <Text style={styles.sectionLabel}>Billed To</Text>
            <Text style={styles.customerName}>{invoice.customer.name}</Text>
            <Text style={styles.customerEmail}>{invoice.customer.email}</Text>
            {invoice.customer.companyName && (
              <Text style={styles.customerCompany}>{invoice.customer.companyName}</Text>
            )}
          </View>
          <View style={styles.statusSection}>
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={statusBadgeStyle}>
              <Text style={statusTextStyle}>{invoice.status.replace("_", " ")}</Text>
            </View>
          </View>
        </View>

        {/* Issue / Due Dates block */}
        <View style={styles.datesSection}>
          <View style={styles.dateItem}>
            <Text style={styles.sectionLabel}>Billing Date</Text>
            <Text style={styles.dateValue}>
              {invoice.createdAt ? formatDate(invoice.createdAt) : formatDate(invoice.dueDate)}
            </Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.sectionLabel}>Due Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        {/* Description section */}
        <Text style={styles.sectionLabel}>Description</Text>
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>
            {invoice.description || "Website design, software consulting, and developer services rendered."}
          </Text>
        </View>

        {/* Financial calculations */}
        <View style={styles.financialGrid}>
          <View style={styles.financialSummary}>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Total Billed</Text>
              <Text style={styles.financialValue}>{formatCurrency(invoice.amount)}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Total Paid</Text>
              <Text style={styles.financialValue}>{formatCurrency(invoice.paidAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Balance Due</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.balanceAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Thank you note footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business! If you have any questions, feel free to contact us.</Text>
        </View>
      </Page>
    </Document>
  );
}
