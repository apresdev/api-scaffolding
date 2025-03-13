/**
 * Converts a string into a GraphQL comment.
 *
 * @param v The comment string.
 * @returns A GraphQL comment containing the given comment string.
 */
export function comment(v: string): string {
  return `# ${v}`;
}

/**
 * Converts a string into a GraphQL description.
 *
 * @param v The description string.
 * @returns A GraphQL description containing the given description string.
 */
export function description(v: string): string {
  return `"""
${v}  
"""
`;
}

/**
 * Indents a string.
 *
 * @param v The string to indent.
 * @returns The indented string.
 */
export function indent(v: string, n: number): string {
  return " ".repeat(n * 2) + v;
}
