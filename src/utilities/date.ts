export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDate(isoOrDateKey: string): string {
  const date = isoOrDateKey.length === 10
    ? new Date(`${isoOrDateKey}T00:00:00`)
    : new Date(isoOrDateKey);
  if (Number.isNaN(date.getTime())) {
    return isoOrDateKey;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(isoString);
}

export function getRecentDateKeys(daysCount: number, endDate: Date = new Date()): string[] {
  const keys: string[] = [];
  const cursor = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  cursor.setDate(cursor.getDate() - (daysCount - 1));
  for (let i = 0; i < daysCount; i += 1) {
    keys.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
