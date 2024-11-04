/**
 * Joins a list of terms using the oxford comma.  For example: "a, b, or c".
 *
 * @param list        The list of terms to join.
 * @param conjunction The conjunction to use when joining the terms (i.e. and | or)
 *
 * @returns The list of terms joined using the oxford comma.
 */
export function oxfordJoin(list: string[], conjunction: "and" | "or"): string {
  const copy = [...list];
  switch (list.length) {
    case 0: {
      return "";
    }
    case 1: {
      return list[0];
    }
    case 2: {
      return `${list[0]} ${conjunction} ${list[1]}`;
    }
    default: {
      const last = copy.pop();
      return `${copy.join(", ")}, ${conjunction} ${last}`;
    }
  }
}

const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const CONSONANT_EXCEPTIONS = ["honor", "heir", "honest", "homage"];
const VOWEL_EXCEPTIONS = ["uni", "ubi", "uti", "use", "usu", "ute", "uga"];

/**
 * English has specific rules regarding where a noun should have an "a" or "an" preceding it.
 *
 * The base rule is that if the noun starts with a consonant it then it should be preceded by "an".  If the noun starts with a vowel then
 * the noun should be preceded by "a" with a few exceptions.
 *
 * @param noun The noun that needs an "a" or "an" before it.
 *
 * @returns The "a" or "an" term for the given noun.
 */
export function aOrAn(noun: string): string {
  // Default to "a" if no noun was given.
  if (!noun || noun.length === 0) {
    return "a";
  }

  const term = noun.toLocaleLowerCase();

  // If the term does not start with a vowel, then return "a"
  if (!VOWELS.has(term[0])) {
    // If the term starts with a consonant, but also starts with an exception, return "an"
    if (CONSONANT_EXCEPTIONS.some((ex) => term.startsWith(ex))) {
      return "an";
    }
    // Otherwise, return "a", this is a word that starts with a normal consonant.
    return "a";
  }

  // If the term starts with a vowel, but also starts with a vowel exception, return "a"
  if (VOWEL_EXCEPTIONS.some((ex) => term.startsWith(ex))) {
    return "a";
  }

  // Otherwise, return "an", this is a normal noun that starts with a vowel.
  return "an";
}

/**
 * Splits a string value into its constituent terms, applies a given transformation function to each term, then joins all transformed terms using the given delimiter.
 *
 * Terms are:
 * - separated by delimiters [".", "_", "-"] (e.g. "use.case", "use-case", "use_case")
 * - separated by continuous whitespace (e.g. "use  case")
 * - lowercase followed by upper case values (e.g. the "sC"  in "useCases")
 *
 * @param value The string to be converted
 * @param delimiter The delimiter
 * @param transform The term transformer
 * @returns The converted value is the appropriate case format.
 */
function applyCase(value: string, delimiter: string, transform: (term: string, index: number) => string) {
  const breakpoints = /\.|-|_|\s+|[a-z][A-Z]/g;
  let match;
  let pos = 0;

  const terms: string[] = [];
  do {
    match = breakpoints.exec(value);
    if (match) {
      const separator = match[0];
      switch (separator) {
        case ".":
        case "-":
        case "_": {
          terms.push(value.slice(pos, match.index));
          pos = match.index + 1;
          break;
        }
        default: {
          if (/\s+/.test(separator)) {
            terms.push(value.slice(pos, match.index));
            pos = match.index + separator.length;
          } else {
            terms.push(value.slice(pos, match.index + 1));
            pos = match.index + 1;
          }

          break;
        }
      }
    }
  } while (match);

  terms.push(value.slice(Math.max(0, pos)));

  return terms.map((term, index) => transform(term, index)).join(delimiter);
}

/**
 * Capitalizes the first letter un a string, then converts the remainder to lower case.
 *
 * @param s The string to capitalize.
 * @returns the capitalized string.
 */
function capitalize(s: string): string {
  if (s.length <= 1) {
    return s.toUpperCase();
  }

  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Converts a value into kebab-case.
 *
 * kebab-case lowercase each term and uses the hyphen ("-"") to delimit terms.
 *
 * @param value The value to convert.
 * @returns The converted value is the appropriate case format.
 */
export function toKebabCase(value: string | undefined): string {
  if (!value) {
    return "undefined";
  }
  return applyCase(value, "-", (s: string) => s.toLowerCase());
}

/**
 * Converts a value into snake_case.
 *
 * snake_case lowercase each term and uses the underscore ("_") to delimit terms.
 *
 * @param value The value to convert.
 * @returns The converted value is the appropriate case format.
 */
export function toSnakeCase(value: string | undefined): string {
  if (!value) {
    return "undefined";
  }
  return applyCase(value, "_", (s: string) => s.toLowerCase());
}

/**
 * Converts a value into camelCase.
 *
 * camelCase lowercase the first term, then uppercase all subsequent term.  camelCase and uses no delimiter.
 *
 * @param value The value to convert.
 * @returns The converted value is the appropriate case format.
 */
export function toCamelCase(value: string | undefined): string {
  if (!value) {
    return "undefined";
  }
  return applyCase(value, "", (s: string, index: number) => {
    if (0 === index) {
      return s.toLowerCase();
    }

    return capitalize(s);
  });
}

/**
 * Converts a value into PascalCase.
 *
 * PascalCase uppercase the each term.  PascalCase and uses no delimiter.
 *
 * @param value The value to convert.
 * @returns The converted value is the appropriate case format.
 */
export function toPascalCase(value: string | undefined): string {
  if (!value) {
    return "Undefined";
  }

  return applyCase(value, "", capitalize);
}

/**
 * Converts a value into Title Case.
 *
 * Title Case uppercase each term and uses space (" ") to delimit terms.
 *
 * @param value The value to convert.
 * @returns The converted value is the appropriate case format.
 */
export function toTitleCase(value: string | undefined): string {
  if (!value) {
    return "Undefined";
  }

  return applyCase(value, " ", capitalize);
}

/**
 * The collection of suffixes that should append an "es" when pluralized
 */
const ES_SUFFIXES = ["s", "ss", "sh", "ch", "x", "z"];

/**
 * Pluralizes a singular noun.
 *
 * If the noun ends with an "s", "ss", "sh", "ch", "x", or "z", then it appends an "es".
 * If the noun ends with an "y", then it removes the "y" and appends an "ies" if and only if the preceding character is a consonant.
 * Otherwise, it appends an "s".
 *
 * @param noun The noun to pluralize.
 * @returns The pluralized noun
 */
export function pluralize(noun: string | undefined): string {
  if (!noun) {
    return "undefined";
  }

  const asLower = noun.toLowerCase();

  for (const suffix of ES_SUFFIXES) {
    if (asLower.endsWith(suffix)) {
      return `${noun}es`;
    }
  }

  if (asLower.endsWith("y")) {
    if (asLower.endsWith("ay") || asLower.endsWith("ey") || asLower.endsWith("iy") || asLower.endsWith("oy") || asLower.endsWith("uy")) {
      return `${noun}s`;
    }
    return `${noun.slice(0, Math.max(0, noun.length - 1))}ies`;
  }

  return `${noun}s`;
}

/**
 * Singularize a plural noun.
 *
 * If the noun ends with an "ses", "sses", "shes", "ches", "xes", or "zes", then it removes the "es" suffix.
 * If the noun ends with an "ies", then it removes the "ies" suffix and appends a "y".
 * Otherwise, it removes the "s"  .
 *
 * @param noun The noun to pluralize.
 * @returns The pluralized noun
 */
export function singularize(noun: string | undefined): string {
  if (!noun) {
    return "undefined";
  }
  if (noun.endsWith("ies")) {
    return `${noun.slice(0, Math.max(0, noun.length - 3))}y`;
  }

  for (const suffix of ES_SUFFIXES) {
    if (noun.endsWith(`${suffix}es`)) {
      return noun.slice(0, Math.max(0, noun.length - 2));
    }
  }

  return noun.slice(0, Math.max(0, noun.length - 1));
}
