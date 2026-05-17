import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorType?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  description?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  colorType = "neutral",
  description,
}: StatCardProps) {
  // Define visual styles based on colorType
  const colorStyles = {
    primary: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-black",
      iconBg: "bg-gray-100 text-black",
      accent: "from-zinc-800 to-black",
    },
    success: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-green-700",
      iconBg: "bg-green-50 text-green-700",
      accent: "from-green-500 to-green-700",
    },
    warning: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-orange-700",
      iconBg: "bg-orange-50 text-orange-700",
      accent: "from-orange-500 to-orange-700",
    },
    danger: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-rose-700",
      iconBg: "bg-rose-50 text-rose-700",
      accent: "from-rose-500 to-rose-700",
    },
    info: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-blue-700",
      iconBg: "bg-blue-50 text-blue-700",
      accent: "from-blue-500 to-blue-700",
    },
    neutral: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-gray-700",
      iconBg: "bg-gray-100 text-gray-700",
      accent: "from-gray-500 to-gray-700",
    },
  };

  const style = colorStyles[colorType];

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${style.border} bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group`}>
      {/* Dynamic glow effect on hover */}
      <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${style.accent}`} />
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </span>
          <h3 className={`text-2xl font-bold ${style.text} tracking-tight`}>
            {value}
          </h3>
        </div>
        
        <div className={`rounded-xl p-3 ${style.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      
      {description && (
        <p className="mt-3 text-xs text-gray-500 font-medium">
          {description}
        </p>
      )}
    </div>
  );
}
