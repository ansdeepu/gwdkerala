import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name?: string) => {
  if (!name || name.trim() === '') return 'U';
  return name
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const formatCase = (str: string | null | undefined): string | null | undefined => {
  if (!str || str.trim().length === 0) return str;
  
  const isAllUpperCase = str === str.toUpperCase() && str !== str.toLowerCase();
  
  if (isAllUpperCase) {
    return str
      .split(' ')
      .map(word => 
        word.length > 0 
          ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          : ''
      )
      .join(' ');
  }
  
  return str;
};
