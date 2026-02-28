import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Simple encryption for email addresses
 * Uses base64 encoding with a simple substitution cipher and salt
 */
export function encryptEmail(email: string): string {
  if (!email) return "guest";

  // Add a salt to make it more secure
  const salt = "beblocky_2024";
  const saltedEmail = email + salt;

  // Simple encryption: reverse the string and encode to base64
  const reversed = saltedEmail.split("").reverse().join("");
  const encoded = btoa(reversed);

  // Replace some characters to make it URL-safe
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Decrypt email address
 */
export function decryptEmail(encrypted: string): string {
  if (!encrypted || encrypted === "guest") return "guest";

  try {
    // Restore base64 padding and characters
    let restored = encrypted.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if needed
    while (restored.length % 4) {
      restored += "=";
    }

    const decoded = atob(restored);
    const reversed = decoded.split("").reverse().join("");

    // Remove the salt
    const salt = "beblocky_2024";
    const original = reversed.replace(salt, "");

    return original;
  } catch (error) {
    console.error("Failed to decrypt email:", error);
    return "guest";
  }
}

/**
 * Generate user initials from name or email
 */
export function generateInitials(name: string, email?: string): string {
  if (!name || name === "Guest User") {
    return "GU";
  }

  // Try to get initials from name first
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  } else if (nameParts.length === 1 && nameParts[0].length > 0) {
    return nameParts[0][0].toUpperCase();
  }

  // Fallback to email initials
  if (email && email !== "guest") {
    const emailParts = email.split("@")[0];
    if (emailParts.length >= 2) {
      return emailParts.substring(0, 2).toUpperCase();
    } else if (emailParts.length === 1) {
      return emailParts[0].toUpperCase();
    }
  }

  return "GU";
}

const COURSE_ID_SALT = "beblocky_2024";

/**
 * Decrypt courseId from URL (clients use encryptCourseId; same algorithm: restore base64, reverse, remove salt).
 */
export function decryptCourseId(encrypted: string): string {
  if (!encrypted) return "";

  try {
    let restored = encrypted.replace(/-/g, "+").replace(/_/g, "/");
    while (restored.length % 4) {
      restored += "=";
    }
    const decoded = atob(restored);
    const reversed = decoded.split("").reverse().join("");
    return reversed.replace(COURSE_ID_SALT, "");
  } catch {
    return "";
  }
}
