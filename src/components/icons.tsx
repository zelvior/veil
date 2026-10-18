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

/** Discord brand icon. */
export function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

/** YouTube brand icon. */
export function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

/** Linktree brand icon. */
export function LinktreeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M7.953 15.066c-.08.175-.236.295-.453.295H5.75a.499.499 0 0 1-.5-.5v-2.32c0-.217.12-.373.295-.453l4.835-2.025-4.835-2.025a.499.499 0 0 1-.295-.453V5.066c0-.217.12-.373.295-.453l1.263-.526a.499.499 0 0 1 .652.295l2.025 4.835 2.025-4.835a.499.499 0 0 1 .652-.295l1.263.526c.175.08.295.236.295.453v2.32c0 .217-.12.373-.295.453l-4.835 2.025 4.835 2.025c.175.08.295.236.295.453v2.32c0 .217-.12.373-.295.453l-1.263.526a.499.499 0 0 1-.652-.295l-2.025-4.835-2.025 4.835a.499.499 0 0 1-.652.295l-1.263-.526Z M13.5 3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v18a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V3Z" />
    </svg>
  );
}
