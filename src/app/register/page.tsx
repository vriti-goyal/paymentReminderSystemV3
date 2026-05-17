"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    email: "",
    password: "",
    emailPass: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    if (!formData.name || !formData.email || !formData.password || !formData.emailPass) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(data.message || "Registration failed");
      return;
    }

    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Register your business to manage invoices and automated reminders.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Owner Name</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Business Name</label>
            <input
              name="businessName"
              type="text"
              value={formData.businessName}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              placeholder="ABC Services"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Gmail App Password</label>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
            </div>
            <input
              name="emailPass"
              type="password"
              value={formData.emailPass}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              placeholder="••••••••••••••••"
              required
            />
            
            {/* Steps to generate App Password */}
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                💡 How to Generate Your App Password:
              </h3>
              <ol className="text-[11px] text-slate-500 space-y-1.5 list-decimal list-inside pl-0.5 leading-relaxed font-medium">
                <li>Go to your <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="text-black font-semibold underline hover:text-slate-700 transition-colors">Google Account</a>.</li>
                <li>Enable <strong className="text-slate-700">2-Step Verification</strong> under the <span className="font-semibold text-slate-600">Security</span> tab.</li>
                <li>Search or navigate to <strong className="text-slate-700">App Passwords</strong>.</li>
                <li>Select App: <span className="font-semibold text-slate-600">Other (Custom Name)</span>, type <code className="bg-slate-200 px-1 rounded text-slate-800 text-[10px] font-mono">Payment Reminder</code>, and click Generate.</li>
                <li>Copy the 16-character code and paste it above!</li>
              </ol>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2.5 font-medium text-white disabled:opacity-60 mt-2"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}