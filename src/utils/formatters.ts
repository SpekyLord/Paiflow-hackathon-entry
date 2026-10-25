// Date and number formatting helpers

import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a date using date-fns
 * @param date - Date string or Date object
 * @param formatString - Optional format pattern (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, formatString: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format a date with time
 * @param date - Date string or Date object
 * @returns Formatted date and time string (e.g., "Mar 16, 2026 at 2:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy \'at\' h:mm a');
}

/**
 * Format a number as Philippine Peso (PHP) currency
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "₱1,234,567.89")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format bytes to human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format a number with thousands separators
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-PH').format(num);
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Format a hash for display (show first and last few characters)
 * @param hash - Hash string
 * @param prefixLength - Number of characters to show at start (default: 8)
 * @param suffixLength - Number of characters to show at end (default: 8)
 * @returns Formatted hash (e.g., "a1b2c3d4...x7y8z9")
 */
export function formatHash(hash: string, prefixLength: number = 8, suffixLength: number = 8): string {
  if (hash.length <= prefixLength + suffixLength + 3) return hash;
  return `${hash.substring(0, prefixLength)}...${hash.substring(hash.length - suffixLength)}`;
}
