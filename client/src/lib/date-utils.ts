/**
 * Frontend date utility functions for meal planning with Sunday-based weeks
 */

/**
 * Normalize any date to the Sunday of that week
 * @param date - Input date (can be string or Date object)
 * @returns ISO date string for the Sunday of that week
 */
export function normalizeToSunday(date: string | Date): string {
  const inputDate = typeof date === 'string' ? new Date(date) : new Date(date);
  
  // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = inputDate.getDay();
  
  // Calculate how many days to subtract to get to Sunday
  const daysToSubtract = dayOfWeek;
  
  // Create new date for the Sunday of this week
  const sunday = new Date(inputDate);
  sunday.setDate(inputDate.getDate() - daysToSubtract);
  
  // Return as ISO date string (YYYY-MM-DD format)
  return sunday.toISOString().split('T')[0];
}

/**
 * Get the next Sunday from the current date
 * @returns ISO date string for next Sunday
 */
export function getNextSunday(): string {
  const today = new Date();
  const daysUntilNextSunday = (7 - today.getDay()) % 7;
  
  // If today is Sunday, get next Sunday (7 days ahead)
  const daysToAdd = daysUntilNextSunday === 0 ? 7 : daysUntilNextSunday;
  
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysToAdd);
  
  return nextSunday.toISOString().split('T')[0];
}

/**
 * Get the current week's Sunday (or today if today is Sunday)
 * @returns ISO date string for this week's Sunday
 */
export function getCurrentWeekSunday(): string {
  return normalizeToSunday(new Date());
}

/**
 * Format a date string for display (e.g., "Jan 15, 2024")
 * @param sundayDate - ISO date string for Sunday
 * @returns Formatted display string
 */
export function formatWeekDisplay(sundayDate: string): string {
  const date = new Date(sundayDate);
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}