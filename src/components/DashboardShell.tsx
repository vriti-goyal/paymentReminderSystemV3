"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { X, Camera, Loader2, Briefcase, Mail, Lock } from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    businessName?: string | null;
    image?: string | null;
    emailPass?: string | null;
  };
  title?: string;
}

export default function DashboardShell({
  children,
  user,
  title = "Dashboard",
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const [editFormData, setEditFormData] = useState({
    name: "",
    businessName: "",
    image: "",
    emailPass: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Sync with actual database profile state on mount to handle any NextAuth session lagging/caching
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    }
    loadProfile();
  }, []);

  const handleOpenProfile = () => {
    setEditFormData({
      name: currentUser.name || "",
      businessName: currentUser.businessName || "",
      image: currentUser.image || "",
      emailPass: (currentUser as any).emailPass || "",
    });
    setEditError("");
    setEditSuccess("");
    setProfileOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setEditSaving(true);

    if (!editFormData.emailPass || editFormData.emailPass.trim() === "") {
      setEditError("Gmail App Password is required.");
      setEditSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();

      if (res.ok) {
        setEditSuccess("Profile updated successfully!");
        setCurrentUser(data.user);
        setTimeout(() => {
          setProfileOpen(false);
        }, 1200);
      } else {
        setEditError(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      setEditError("An unexpected error occurred");
    } finally {
      setEditSaving(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || "US";
  };

  const getAvatarColor = (name: string) => {
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
  };

  const displayName = currentUser.businessName || currentUser.name || "User";
  const avatarColor = getAvatarColor(displayName);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex">
      {/* Responsive Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area on the right */}
      <div className="flex flex-col flex-1 min-h-screen lg:pl-64 bg-gray-100">
        {/* Top Header Navbar */}
        <Navbar 
          user={currentUser} 
          onMenuClick={() => setSidebarOpen(true)} 
          onProfileClick={handleOpenProfile}
          title={title} 
        />

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto bg-gray-100">
          {children}
        </main>
      </div>

      {/* PROFILE DETAILS OVERLAY MODAL */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glassmorphic backdrop with smooth fade-in */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
            onClick={() => !editSaving && setProfileOpen(false)}
          />
          
          {/* Modal Card container with zoom-in and slide-in */}
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-10">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">User Profile</h3>
                <p className="text-xs font-medium text-slate-400 mt-1">Manage your identity and business details</p>
              </div>
              <button 
                type="button"
                onClick={() => setProfileOpen(false)}
                disabled={editSaving}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6">
              
              {/* Profile Image Sector */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  {editFormData.image ? (
                    <img 
                      src={editFormData.image} 
                      alt="Profile Preview" 
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xs font-bold text-lg transition-transform duration-300 group-hover:scale-105 ${avatarColor}`}>
                      {getInitials(displayName)}
                    </div>
                  )}
                  <label 
                    htmlFor="user-image-upload" 
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-black text-white hover:bg-zinc-800 shadow-sm transition-transform active:scale-90"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input 
                    id="user-image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={editSaving}
                  />
                </div>
                
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile Image</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={editSaving}
                      onClick={() => document.getElementById("user-image-upload")?.click()}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Upload Picture
                    </button>
                    {editFormData.image && (
                      <button
                        type="button"
                        disabled={editSaving}
                        onClick={() => setEditFormData(prev => ({ ...prev, image: "" }))}
                        className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                {/* Email (Disabled / Display Only) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Registered Email</label>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-55 p-0.5 px-1.5 rounded-full"><Lock className="w-2.5 h-2.5" /> System ID</span>
                  </div>
                  <div className="relative">
                    <input
                      name="email"
                      type="email"
                      disabled
                      value={currentUser.email || ""}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 pl-9 text-sm text-slate-400 outline-none cursor-not-allowed"
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Name *</label>
                  <input
                    name="name"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(p => ({ ...p, name: e.target.value }))}
                    disabled={editSaving}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                    placeholder="User Name"
                  />
                </div>

                {/* Business Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Business Name</label>
                    <span className="text-[10px] font-semibold text-slate-400">Optional</span>
                  </div>
                  <div className="relative">
                    <input
                      name="businessName"
                      value={editFormData.businessName}
                      onChange={(e) => setEditFormData(p => ({ ...p, businessName: e.target.value }))}
                      disabled={editSaving}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pl-9 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                      placeholder="My Business Ltd."
                    />
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Email App Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Gmail App Password</label>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
                  </div>
                  <div className="relative">
                    <input
                      name="emailPass"
                      type="password"
                      value={editFormData.emailPass}
                      onChange={(e) => setEditFormData(p => ({ ...p, emailPass: e.target.value }))}
                      disabled={editSaving}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pl-9 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                      placeholder="••••••••••••••••"
                      autoComplete="new-password"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 pl-1 leading-normal">
                    To send reminders from your own Gmail, enter your 16-character Google App Password. This field is mandatory but fully editable.
                  </p>
                </div>
              </div>

              {/* Status Notifications */}
              {editError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100 animate-shake">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-100 animate-in fade-in">
                  {editSuccess}
                </div>
              )}

              {/* Form Actions Footer */}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setProfileOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:bg-zinc-400 transition-colors cursor-pointer"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Details"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

