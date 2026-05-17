import React from "react";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    businessName?: string | null;
    image?: string | null;
  };
  onMenuClick: () => void;
  onProfileClick?: () => void;
  title?: string;
}

export default function Navbar({ user, onMenuClick, onProfileClick, title }: NavbarProps) {
  // Extract initials for the profile avatar
  const displayName = user.businessName || user.name || "User";
  
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left section: Hamburger (mobile only) & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:hidden focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/20"
          aria-label="Open sidebar"
        >
          {/* Hamburger Icon */}
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="flex items-center">
          {title && (
            <h1 className="text-lg md:text-2xl font-extrabold text-gray-900 tracking-tight leading-none">{title}</h1>
          )}
        </div>
      </div>

      {/* Right section: Profile & Dynamic Greetings */}
      <div className="flex items-center gap-4">
        {/* Dynamic greeting message */}
        <div className="hidden md:flex flex-col text-right">
          <span className="text-sm font-semibold text-gray-900">
            {displayName}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            {user.email || "Active Session"}
          </span>
        </div>

        {/* Profile Avatar Component */}
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 p-1.5 pr-3 hover:bg-gray-100 transition-all duration-200 cursor-pointer group"
        >
          {user.image ? (
            <img
              src={user.image}
              alt={displayName}
              className="flex h-8 w-8 rounded-full border border-gray-250 object-cover shadow-sm shadow-black/5 transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white shadow-sm shadow-black/10 transition-transform group-hover:scale-105">
              {initials}
            </div>
          )}
          <span className="text-xs font-semibold text-gray-700 md:hidden">
            {displayName.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
