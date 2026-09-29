/** Learner Accounts persist Progress; everyone else previews the Course as a guest. */
export function isLearnerRole(roles: string[] | undefined): boolean {
  return (roles ?? []).includes("student");
}

/** Fetch a Student profile only when the Account might be a learner. Unknown roles still try; 404 is not fatal. */
export function shouldFetchStudentProfile(opts: {
  userId?: string;
  roles?: string[];
}): boolean {
  if (!opts.userId) return false;
  if (opts.roles == null) return true;
  return isLearnerRole(opts.roles);
}

export type IdeRole =
  | "student"
  | "teacher"
  | "admin"
  | "organization"
  | "parent";

export function primaryUserRole(roles: string[] | undefined): IdeRole {
  const list = roles ?? [];
  if (list.includes("student")) return "student";
  if (list.includes("teacher")) return "teacher";
  if (list.includes("admin")) return "admin";
  if (list.includes("organization")) return "organization";
  if (list.includes("parent")) return "parent";
  return "student";
}

/** Student-profile 404s are not fatal — the IDE is open to any signed-in Account. */
export function idePageError(opts: {
  invalidCourseId: boolean;
  signedOut: boolean;
  courseFailed: boolean;
}): string | null {
  if (opts.invalidCourseId) {
    return "Invalid course link. Please open the course from the learning portal.";
  }
  if (opts.signedOut) {
    return "Please sign in to continue. Open the course from the learning portal.";
  }
  if (opts.courseFailed) {
    return "Failed to load course.";
  }
  return null;
}
