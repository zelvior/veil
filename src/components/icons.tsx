"use client";

import {
  Plus,
  X,
  Globe,
  Loader2,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  House,
  Star,
  StarOff,
  Menu,
  Settings,
  Search,
  Shield,
  Clock,
  History,
  Bookmark,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Command,
  KeySquare,
  PlusCircle,
  Pencil,
  GripVertical,
  Download,
  Lock,
  Unlock,
  Sun,
  Moon,
  Monitor,
  Github,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";

export {
  Plus,
  X,
  Globe,
  Loader2,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  House,
  Star,
  StarOff,
  Menu,
  Settings,
  Search,
  Shield,
  Clock,
  History,
  Bookmark,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Command,
  KeySquare,
  PlusCircle,
  Pencil,
  GripVertical,
  Download,
  Lock,
  Unlock,
  Sun,
  Moon,
  Monitor,
  Github,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
};

/** Incognito / private browsing icon (not in lucide). */
export function Incognito({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 11h16a1 1 0 0 0 1-1 8 8 0 0 0-16 0 1 1 0 0 0 1 1Z" />
      <path d="M2 13h20" />
      <circle cx="7" cy="16" r="3" />
      <circle cx="17" cy="16" r="3" />
      <path d="M7 19h10" />
    </svg>
  );
}

/** Globe with shield - proxy brand icon. */
export function GlobeShield({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  );
}
