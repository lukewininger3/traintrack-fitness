// Centralized date formatting utilities

/**
 * Format a date as YYYY-MM-DD for storage
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateForStorage = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date as YYYY-MM-DD
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayString = () => {
  return formatDateForStorage(new Date());
};

/**
 * Parse a YYYY-MM-DD string as local date (avoiding timezone issues)
 * This is the preferred method over adding 'T12:00:00' to date strings.
 * Using new Date(year, month, day) creates a date in local timezone at midnight,
 * which is consistent across all timezones.
 *
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in local timezone at midnight
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format date for short display (e.g., "Mon, Jan 15")
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date
 */
export const formatDateShort = (dateString) => {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date for long display (e.g., "January 15, 2024")
 * @param {string} dateString - Date string to format (YYYY-MM-DD or ISO timestamp)
 * @returns {string} Formatted date
 */
export const formatDateLong = (dateString) => {
  if (!dateString) return 'Unknown';

  let date;
  // Check if it's an ISO timestamp (contains 'T') or just a date
  if (dateString.includes('T')) {
    // ISO timestamp - parse directly
    date = new Date(dateString);
  } else {
    // YYYY-MM-DD format - use local parsing
    date = parseLocalDate(dateString);
  }

  // Check for invalid date
  if (isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
