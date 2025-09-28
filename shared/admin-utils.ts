import type { User } from "./schema";

/**
 * Check if a user is an admin based on username or email
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Check if username is exactly "admin"
  if (user.username === "admin") return true;
  
  // Check if email contains "admin"
  if (user.email && user.email.includes("admin")) return true;
  
  return false;
}

/**
 * Check if a user should be exempt from profile requirements
 * Currently this includes admin users
 */
export function isExemptFromProfileRequirements(user: User | null | undefined): boolean {
  return isAdminUser(user);
}

/**
 * Check if a user should be exempt from meal plan requirements
 * Currently this includes admin users
 */
export function isExemptFromMealPlanRequirements(user: User | null | undefined): boolean {
  return isAdminUser(user);
}