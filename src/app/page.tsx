import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-gray-900">
          Smart Invoice & Payment Reminder System
        </h1>

        <p className="mt-4 text-gray-600">
          Manage invoices, track pending payments, and send payment reminder
          emails to customers.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-lg bg-black px-5 py-3 text-center text-white"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="rounded-lg border px-5 py-3 text-center text-gray-700"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}