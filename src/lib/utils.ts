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
export const getSportFromLeague = (league: string): string => {
  if (["NBA", "WNBA", "MBB", "WBB", "NBAS"].includes(league))
    return "basketball";
  if (["NFL", "COLLEGE-FOOTBALL", "UFL"].includes(league)) return "football";
  if (["MLB"].includes(league)) return "baseball";
  if (["NHL"].includes(league)) return "hockey";
  if (
    ["MLS", "NWSL", "EPL", "RPL", "CSL", "ARG", "TUR", "FRIENDLY"].includes(
      league
    )
  )
    return "soccer";
  if (["PLL"].includes(league)) return "lacrosse";

  return "other";
};

export const getLeagueColor = (league: string): string => {
  switch (league) {
    case "NFL":
      return "hsla(0, 78%, 34%, 1)"; // Red
    case "COLLEGE-FOOTBALL":
      return "hsla(0, 78%, 50%, 1)"; // Red
    case "NBA":
      return "hsla(15, 78%, 50%, 1)"; // Orange
    case "NBAS":
      return "hsla(15, 78%, 50%, 1)"; // Orange
    case "MBB":
      return "hsla(15, 78%, 70%, 1)"; //Light Orange
    case "WNBA":
      return "hsla(15, 78%, 60%, 1)"; // Orange
    case "WBB":
      return "hsla(320, 78%, 63%, 1)"; //Light Pink
    case "MLB":
      return "hsla(229, 78%, 38%, 1)"; // Blue
    case "NHL":
      return "hsla(0, 0%, 40%, 1)"; // grey
    case "MLS":
      return "hsla(115, 78%, 44%, 1)"; //Green
    case "NWSL":
      return "hsla(115, 78%, 30%, 1)"; //Green
    case "EPL":
      return "hsla(115, 78%, 20%, 1)"; //Green
    case "UFL":
      return "hsla(0, 78%, 56%, 1)"; // Red
    case "ARG":
      return "hsla(115, 78%, 550%, 1)"; //Green
    case "TUR":
      return "hsla(115, 78%, 60%, 1)"; //Green
    case "RPL":
      return "hsla(115, 78%, 75%, 1)"; //Green
    default:
      return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
  }
};

export const ACTIVE_LEAGUES: string[] = [
  "NFL",
  "NBA",
  "MLB",
  "NHL",
  "COLLEGE-FOOTBALL",
  "MBB",
  "WBB",
  "WNBA",
  "MLS",
  "NWSL",
  "NBAS",
  "EPL",
  "UFL",
  "ARG",
  "TUR",
  "FRIENDLY",
  "CSL",
  "RPL",
];
