import {
  Armchair,
  Cake,
  Camera,
  Car,
  Flame,
  Flower2,
  Landmark,
  Mic,
  Music,
  Shirt,
  Sparkle,
  Tent,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "@/lib/data/types";

const ICONS: Record<CategoryId, LucideIcon> = {
  cars: Car,
  halls: Landmark,
  furniture: Armchair,
  hosts: Mic,
  photo: Camera,
  decor: Flower2,
  music: Music,
  cakes: Cake,
  beauty: Sparkle,
  attire: Shirt,
  traditional: Tent,
  shows: Flame,
};

export function CategoryIcon({ id, className }: { id: CategoryId; className?: string }) {
  const Icon = ICONS[id];
  return <Icon className={className} strokeWidth={1.6} />;
}
