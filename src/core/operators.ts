import path from "path";
import fs from "fs";
import tomlparser from "toml";
import {
  Option,
  none,
  some,
  FileParsedDataType,
  Primitive,
  Nullish
} from "@/core/types";

import yargsparser from "yargs-parser";

export const isNullish = (x: unknown): x is Nullish => {
  return x === null || typeof x === "undefined";
};

export const isNumber = (x: unknown): x is number => typeof x === "number";

export const isString = (x: unknown): x is string => typeof x === "string";

export const isNonEmptyString = (x: unknown): x is string =>
  Boolean(isString(x) && x.trim().length);

export const isPlainObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" &&
  x !== null &&
  !Array.isArray(x) &&
  x.constructor.name === "Object";

export const isObject = (x: unknown): x is object => typeof x === "object";

export const isPrimitive = (x: unknown): x is Primitive => {
  if (x === null) return true;
  const filter = ["boolean", "string", "number", "undefined", "symbol"];
  return filter.includes(typeof x);
};

export const isFunction = (x: unknown): x is Function => {
  return typeof x === "function";
};

export const fspathresolver = (...args: unknown[]): Option<string> => {
  try {
    if (!Array.isArray(args)) return none;

    return some(
      path.normalize(
        path.resolve(...args.filter(isNonEmptyString).map((arg) => arg.trim()))
      )
    );
  } catch (error) {
    return none;
  }
};

export const fileExtension = (someinput: unknown): Option<string> => {
  if (!isNonEmptyString(someinput)) return none;
  return some(path.extname(someinput));
};

export const parseTOMLFile = (
  somefilepath: string
): Option<FileParsedDataType> => {
  if (!isNonEmptyString(somefilepath)) return none;
  try {
    if (!fs.existsSync(somefilepath)) return none;
    const data = fs.readFileSync(somefilepath, "utf-8");
    return tomlparser.parse(data);
  } catch (error) {
    return none;
  }
};

export const deepfreeze = <T>(someinput: T): T | Readonly<T> => {
  if (isPrimitive(someinput)) return someinput;
  Object.freeze(someinput);

  const checkprop = Object.prototype.hasOwnProperty;

  Object.getOwnPropertyNames(someinput).forEach((property: string) => {
    const isNonStandardFunctionProperty = ![
      "caller",
      "callee",
      "arguments"
    ].includes(property);

    const predicate =
      checkprop.call(someinput, property) &&
      (isFunction(someinput) ? isNonStandardFunctionProperty : true) &&
      (isObject((someinput as never)[property]) ||
        isFunction((someinput as never)[property])) &&
      !Object.isFrozen((someinput as never)[property]);

    if (predicate) {
      deepfreeze((someinput as never)[property]);
    }
  });

  return someinput;
};

export const getargv = (): Option<yargsparser.Arguments> => {
  try {
    return some(
      yargsparser(process.argv.slice(2), {
        configuration: {
          "camel-case-expansion": false,
          "dot-notation": false,
          "short-option-groups": false,
          "boolean-negation": false,
          "strip-aliased": true
        }
      })
    );
  } catch (error) {
    return none;
  }
};
