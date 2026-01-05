import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-xl bg-white p-6 shadow-xl ${className}`}>{children}</div>;
}
