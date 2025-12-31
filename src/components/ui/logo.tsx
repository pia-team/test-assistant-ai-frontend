import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-8 h-8", className)}
      {...props}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      <circle
        cx="12"
        cy="12"
        r="3"
        className="fill-primary/20 stroke-primary"
      />
      <path d="M12 22v-5" />
      <path d="M12 7v5" />
    </svg>
  );
}

export function LogoIcon({ className, ...props }: LogoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20",
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className="w-5 h-5 text-primary-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Hexagon shape */}
        <path d="M50 5 L90 28 V72 L50 95 L10 72 V28 Z" className="opacity-40" />

        {/* Checkmark style circuit */}
        <path d="M30 50 L45 65 L75 35" strokeWidth="10" />

        {/* AI Dots */}
        <circle cx="90" cy="28" r="6" fill="currentColor" stroke="none" />
        <circle cx="10" cy="72" r="6" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
