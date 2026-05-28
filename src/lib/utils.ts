import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatUpcomingTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();

  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins >= 0 && diffMins <= 60) {
    if (diffMins === 0) {
      return `Locks: in < 1 minute`;
    }
    if (diffMins === 1) {
      return `Locks: in 1 minute`;
    }
    return `Locks: in ${diffMins} minutes`;
  }

  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).getDate() === date.getDate() && new Date(now.getTime() + 24 * 60 * 60 * 1000).getMonth() === date.getMonth();

  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today @ ${timeString}`;
  } else if (isTomorrow) {
    return `Tomorrow @ ${timeString}`;
  } else {
    const dayString = date.toLocaleDateString([], { weekday: 'short' });
    return `${dayString} ${timeString}`;
  }
};
