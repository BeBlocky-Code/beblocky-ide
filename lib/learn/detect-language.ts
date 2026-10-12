/** Simple language detection based on code patterns. */
export function detectLanguage(code: string): string {
  const trimmedCode = code.trim().toLowerCase();

  if (
    trimmedCode.includes("def ") &&
    trimmedCode.includes(":") &&
    trimmedCode.includes("import ")
  ) {
    return "python";
  }

  if (
    trimmedCode.includes("public class") ||
    trimmedCode.includes("system.out.print")
  ) {
    return "java";
  }

  if (
    trimmedCode.includes("#include") ||
    trimmedCode.includes("printf(") ||
    trimmedCode.includes("cout")
  ) {
    return "cpp";
  }

  if (
    trimmedCode.includes("<html") ||
    trimmedCode.includes("<div") ||
    trimmedCode.includes("<script")
  ) {
    return "html";
  }

  if (
    trimmedCode.includes("{") &&
    trimmedCode.includes("}") &&
    trimmedCode.includes(":")
  ) {
    return "css";
  }

  // Default to JavaScript for web-based IDE
  return "javascript";
}
