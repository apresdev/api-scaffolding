import _ = require("underscore");

/**
 * Joins a list of terms using the oxford comma.  For example: "a, b, or c".
 *
 * @param list        The list of terms to join.
 * @param conjunction The conjunction to use when joining the terms (i.e. and | or)
 *
 * @returns The list of terms joined using the oxford comma.
 */

export function oxfordJoin(list: Array<string>, conjunction: "and" | "or"): string {
  return _.chain(list)
    .reduce((memo, value, index, list) => {
      if (index === 0) {
        return memo + value;
      }
      if (list.length >= 3) {
        if (index === list.length - 1) {
          return memo + `, ${conjunction} ` + value;
        }
        return memo + ", " + value;
      }
      return memo + ` ${conjunction} ` + value;
    }, "")
    .value();
}

const vowels = ["a", "e", "i", "o", "u"];
const vowelExceptions = ["ho", "un", "use", "u.", "one"];

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
  if (!vowels.includes(term[0])) {
    return "a";
  }

  // If the term starts with a vowel, but also starts with an exception, return "a"
  if (vowelExceptions.find((ex) => term.startsWith(ex))) {
    return "a";
  }

  // Otherwise, return "an", this is a normal noun that starts with a vowel.
  return "an";
}

function applyCase(value: string, delimiter: string, transform: (term: string, index: number) => string) {
  if (typeof value !== "string") {
    throw new Error("cannot apply case formatting to non-string");
  }

  const breakpoints = /\.|-|_|\s+|[a-z][A-Z]/g;
  let match;
  let pos = 0;

  const terms: Array<string> = [];
  do {
    match = breakpoints.exec(value);
    if (match) {
      const seperator = match[0];
      switch (seperator) {
        case ".":
        case "-":
        case "_":
          terms.push(value.substring(pos, match.index));
          pos = match.index + 1;
          break;
        default:
          if (/\s+/.test(seperator)) {
            terms.push(value.substring(pos, match.index));
            pos = match.index + seperator.length;
          } else {
            terms.push(value.substring(pos, match.index + 1));
            pos = match.index + 1;
          }

          break;
      }
    }
  } while (match);

  terms.push(value.substring(pos));

  return terms.map(transform).join(delimiter);
}

function capitalize(s: string): string {
  if (s.length <= 1) {
    return s.toUpperCase();
  }

  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

export function toKebabCase(value: string | undefined): string {
  if (!value) {
    return "undefined";
  }
  return applyCase(value, "-", (s: string) => s.toLowerCase());
}

export function toSnakeCase(value: string | undefined): string {
  if (!value) {
    return "undefined";
  }
  return applyCase(value, "_", (s: string) => s.toLowerCase());
}

export function toCamelCase(value: string | undefined): string {
  if (!value) {
    return "undefined";
  }
  return applyCase(value, "", (s: string, i: number) => {
    if (0 === i) {
      return s.toLowerCase();
    }

    return capitalize(s);
  });
}

export function toPascalCase(value: string | undefined): string {
  if (!value) {
    return "Undefined";
  }

  return applyCase(value, "", capitalize);
}

export function toTitleCase(value: string | undefined): string {
  if (!value) {
    return "Undefined";
  }

  return applyCase(value, " ", capitalize);
}

export function entityIdentifier(entity: string): string {
  return `${toPascalCase(entity)}Identifier`;
}

/**
 * Pluralizes a noun.
 *
 * If the noun ends with an "s", then it appends an "es".
 * If the noun ends with an "t", then it removes the "y" and appends an "ies".
 * Otherwise, it appends an "s".
 *
 * @param noun The noun to pluralize.
 * @returns The pluralized noun
 */

export function pluralize(noun: string | undefined): string {
  if (!noun) {
    return "undefined";
  }

  if (noun.endsWith("s")) {
    return noun + "es";
  }
  if (noun.endsWith("y")) {
    return noun.substring(0, noun.length - 1) + "ies";
  }

  return noun + "s";
}

export function singularize(noun: string): string {
  if (!noun) {
    return "undefined";
  }
  if (noun.endsWith("ies")) {
    return noun.substring(0, noun.length - 2) + "y";
  }

  if (noun.endsWith("es")) {
    return noun.substring(0, noun.length - 2);
  }

  return noun.substring(0, noun.length - 1);
}
