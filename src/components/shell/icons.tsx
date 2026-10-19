import {
  Home, Search, Send, FileText, MessageSquare, Sparkles, Route, Wallet, Image as ImageIcon, User,
  Plus, Briefcase, Users, AlertTriangle, List, Bell,
} from "lucide-react";

const map = {
  home: Home, search: Search, send: Send, file: FileText, chat: MessageSquare, sparkles: Sparkles,
  route: Route, wallet: Wallet, image: ImageIcon, user: User, plus: Plus, briefcase: Briefcase,
  users: Users, alert: AlertTriangle, list: List, bell: Bell,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = map[name as keyof typeof map] ?? Home;
  return <Icon className={className} size={18} strokeWidth={1.75} aria-hidden />;
}
