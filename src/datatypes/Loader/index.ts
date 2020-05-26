import {
  LOADER_TYPE,
  DEFAULT_ENV_LOADER_PREFIX,
  ENVIRONMENT_VALUES_DESERIALIZATION_TYPE,
  DEFAULT_ENVIRONMENT_VALUES_DESERIALIZATION_TYPE,
  DEFAULT_ENVIRONMENT_VARIABLE_ARRAY_SEPARATOR,
  DEFAULT_FS_LOADER_DIR_PATH,
  ENVIRONMENT_VARIABLE_NAME_REGEX_VALIDATOR,
  FS_LOADER_FILE_EXTENSION,
  DEFAULT_ARGV_LOADER_PREFIX
} from "@/core/constants";

import {
  Option,
  none,
  some,
  EnvironmentValuesDeserializationType,
  fold,
  EnvloaderOutputType,
  fromNullable,
  isNone,
  FSloaderOutputType,
  FileParsedDataType,
  ArgvloaderOutputType,
  BasePrimitive
} from "@/core/types";

import {
  isPlainObject,
  isNonEmptyString,
  isString,
  fspathresolver,
  fileExtension,
  parseTOMLFile,
  deepfreeze,
  isNullish
} from "@/core/operators";

import yargsparser from "yargs-parser";

export type LoaderType = typeof LOADER_TYPE[keyof typeof LOADER_TYPE];

export interface FSloaderInput {
  readonly filepath: string;
  readonly for: string;
}

export interface FSloader {
  readonly name: string;
  readonly type: typeof LOADER_TYPE.FS;
  readonly dirpath: string;
  readonly use: ReadonlyArray<FSloaderInput>;
}

export interface EnvloaderInput {
  readonly key: string;
  readonly for: string;
  readonly type: string;
  readonly arrayseparator: string;
}

export interface Envloader {
  readonly name: string;
  readonly type: typeof LOADER_TYPE.ENV;
  readonly prefix: string;
  readonly use: ReadonlyArray<EnvloaderInput>;
}

export interface ArgvloaderInput {
  readonly arg: string;
  readonly for: string;
}

export interface Argvloader {
  readonly name: string;
  readonly type: typeof LOADER_TYPE.ARGV;
  readonly prefix: string;
  readonly use: ReadonlyArray<ArgvloaderInput>;
}

export type Loader = Envloader | FSloader | Argvloader;
export type LoaderInput = EnvloaderInput | FSloaderInput | ArgvloaderInput;

export type ConfigurableLoaderProperties<
  T = LoaderType
> = T extends typeof LOADER_TYPE.ENV
  ? Pick<Envloader, "prefix">
  : T extends typeof LOADER_TYPE.FS
  ? Pick<FSloader, "dirpath">
  : T extends typeof LOADER_TYPE.ARGV
  ? Pick<Argvloader, "prefix">
  : Record<never, never>;

export function createEnvloaderInput(
  someinput: unknown
): Option<EnvloaderInput> {
  if (!isPlainObject(someinput)) return none;
  if (!isNonEmptyString(someinput.key)) return none;

  const alias = isNonEmptyString(someinput.for)
    ? someinput.for.trim()
    : someinput.key.trim();

  const type = Object.keys(ENVIRONMENT_VALUES_DESERIALIZATION_TYPE).includes(
    someinput.type as string
  )
    ? (someinput.type as EnvironmentValuesDeserializationType)
    : DEFAULT_ENVIRONMENT_VALUES_DESERIALIZATION_TYPE;

  const arrayseparator = isString(someinput.sep)
    ? someinput.sep
    : DEFAULT_ENVIRONMENT_VARIABLE_ARRAY_SEPARATOR;

  return some({ key: someinput.key, for: alias, type, arrayseparator });
}

export function createFSloaderInput(someinput: unknown): Option<FSloaderInput> {
  if (!isPlainObject(someinput)) return none;
  if (!isNonEmptyString(someinput.filepath)) return none;
  if (!isNonEmptyString(someinput.for)) return none;

  return some({
    filepath: someinput.filepath.trim(),
    for: someinput.for.trim()
  });
}

export function createArgvloaderInput(
  someinput: unknown
): Option<ArgvloaderInput> {
  if (!isPlainObject(someinput)) return none;
  if (!isNonEmptyString(someinput.arg)) return none;

  const alias = isNonEmptyString(someinput.for)
    ? someinput.for.trim()
    : someinput.arg.trim();
  return some({ arg: someinput.arg.trim(), for: alias });
}

export function createloader(someinput: unknown): Option<Loader> {
  if (!isPlainObject(someinput)) return none;
  if (!isNonEmptyString(someinput.name)) return none;
  if (!Object.values<string>(LOADER_TYPE).includes(someinput.type as string))
    return none;
  if (!Array.isArray(someinput.use)) return none;

  switch (someinput.type) {
    case LOADER_TYPE.ENV: {
      const prefix = isNonEmptyString(someinput.prefix)
        ? someinput.prefix.trim()
        : DEFAULT_ENV_LOADER_PREFIX;

      const use = Object.freeze(
        someinput.use.reduce((inputs: EnvloaderInput[], option: unknown) => {
          return fold(
            () => inputs,
            (value: EnvloaderInput) => inputs.concat(value)
          )(createEnvloaderInput(option));
        }, [] as EnvloaderInput[])
      );

      return some(
        Object.freeze({
          name: someinput.name.trim(),
          type: LOADER_TYPE.ENV,
          prefix,
          use
        })
      );
    }

    case LOADER_TYPE.FS: {
      const dirpath = isNonEmptyString(someinput.dirpath)
        ? someinput.dirpath.trim()
        : DEFAULT_FS_LOADER_DIR_PATH;

      const use = Object.freeze(
        someinput.use.reduce((inputs: FSloaderInput[], option: unknown) => {
          return fold(
            () => inputs,
            (value: FSloaderInput) => inputs.concat(value)
          )(createFSloaderInput(option));
        }, [] as FSloaderInput[])
      );

      return some(
        Object.freeze({
          name: someinput.name.trim(),
          type: LOADER_TYPE.FS,
          dirpath,
          use
        })
      );
    }

    case LOADER_TYPE.ARGV: {
      const prefix = isNonEmptyString(someinput.prefix)
        ? someinput.prefix.trim()
        : DEFAULT_ARGV_LOADER_PREFIX;

      const use = Object.freeze(
        someinput.use.reduce((inputs: ArgvloaderInput[], option: unknown) => {
          return fold(
            () => inputs,
            (value: ArgvloaderInput) => inputs.concat(value)
          )(createArgvloaderInput(option));
        }, [] as ArgvloaderInput[])
      );

      return some(
        Object.freeze({
          name: someinput.name.trim(),
          type: LOADER_TYPE.ARGV,
          prefix,
          use
        })
      );
    }

    default: {
      return none;
    }
  }
}

export function runEnvloader(
  loader: Envloader,
  opts: Record<string, unknown>
): Readonly<EnvloaderOutputType> {
  const prefix = {
    primary:
      isPlainObject(opts) && isNonEmptyString(opts.prefix)
        ? opts.prefix.trim()
        : DEFAULT_ENV_LOADER_PREFIX,

    secondary: loader.prefix
  };

  const extractbool = (someval: unknown): boolean => {
    if (!isNonEmptyString(someval)) return false;
    if (["true", "false"].includes(someval.trim())) {
      return someval.trim() === "true" ? true : false;
    }
    return Boolean(someval);
  };

  return Object.freeze(
    loader.use.reduce((envdata: EnvloaderOutputType, input: EnvloaderInput) => {
      const key = Object.values(prefix).concat(input.key).join("_");
      if (!ENVIRONMENT_VARIABLE_NAME_REGEX_VALIDATOR.test(key)) return envdata;
      const extractedvalue = fromNullable(process.env[key]);
      if (isNone(extractedvalue)) return envdata;

      switch (input.type) {
        case ENVIRONMENT_VALUES_DESERIALIZATION_TYPE.STRING: {
          envdata[key] = extractedvalue.value.trim();
          return envdata;
        }

        case ENVIRONMENT_VALUES_DESERIALIZATION_TYPE.NUMBER: {
          envdata[key] = Number(extractedvalue.value.trim());
          return envdata;
        }

        case ENVIRONMENT_VALUES_DESERIALIZATION_TYPE.BOOLEAN: {
          envdata[key] = extractbool(extractedvalue.value.trim());
          return envdata;
        }

        case ENVIRONMENT_VALUES_DESERIALIZATION_TYPE.ARRAY_OF_STRING: {
          envdata[key] = Object.freeze(
            extractedvalue.value
              .trim()
              .split(input.arrayseparator)
              .filter(isNonEmptyString)
              .map((item) => item.trim())
          );
          return envdata;
        }

        case ENVIRONMENT_VALUES_DESERIALIZATION_TYPE.ARRAY_OF_NUMBER: {
          envdata[key] = Object.freeze(
            extractedvalue.value
              .trim()
              .split(input.arrayseparator)
              .map((item) => Number(item.trim()))
              .filter((item) => !isNaN(item))
          );
          return envdata;
        }

        case ENVIRONMENT_VALUES_DESERIALIZATION_TYPE.JSON: {
          try {
            const json = fromNullable(JSON.parse(extractedvalue.value.trim()));
            if (isNone(json)) return envdata;
            envdata[key] = deepfreeze({ fromjson: json.value });
            return envdata;
          } catch (error) {
            return envdata;
          }
        }

        default: {
          envdata[key] = extractedvalue.value.trim();
          return envdata;
        }
      }
    }, {} as EnvloaderOutputType)
  );
}

export const runArgvloader = (
  loader: Argvloader,
  opts: Record<string, unknown>
): ArgvloaderOutputType => {
  const prefix = {
    primary:
      isPlainObject(opts) && isNonEmptyString(opts.prefix)
        ? opts.prefix.trim()
        : DEFAULT_ARGV_LOADER_PREFIX,
    secondary: loader.prefix
  };

  const argv =
    isPlainObject(opts) && isPlainObject(opts.argv)
      ? (opts.args as yargsparser.Arguments)
      : ({} as yargsparser.Arguments);

  return Object.freeze(
    loader.use.reduce(
      (argvdata: ArgvloaderOutputType, input: ArgvloaderInput) => {
        const arg = Object.values(prefix).concat(input.arg).join("-");

        const extractedvalue = fromNullable<BasePrimitive | BasePrimitive[]>(
          argv[arg]
        );

        if (isNone(extractedvalue)) return argvdata;
        if (Array.isArray(extractedvalue.value)) {
          argvdata[arg] = Object.freeze(
            extractedvalue.value.filter((value) => !isNullish(value))
          );
          return argvdata;
        }

        if (!isNullish(extractedvalue.value)) {
          argvdata[arg] = extractedvalue.value;
          return argvdata;
        }

        return argvdata;
      },
      {} as ArgvloaderOutputType
    )
  );
};

export function runFSloader(
  loader: FSloader,
  opts: Record<string, unknown>
): Readonly<FSloaderOutputType> {
  const cwd =
    isPlainObject(opts) && isNonEmptyString(opts.rootdirpath)
      ? opts.rootdirpath.trim()
      : process.cwd();

  const dirpath = {
    primary:
      isPlainObject(opts) && isNonEmptyString(opts.dirpath)
        ? opts.dirpath.trim()
        : DEFAULT_FS_LOADER_DIR_PATH,
    secondary: loader.dirpath
  };

  return Object.freeze(
    loader.use.reduce((filedata: FSloaderOutputType, input: FSloaderInput) => {
      const filepath = fspathresolver(
        [cwd].concat(Object.values(dirpath)).concat(input.filepath)
      );
      if (isNone(filepath)) return filedata;
      const extension = fileExtension(filepath.value);
      if (isNone(extension)) return filedata;
      if (
        !Object.values<string>(FS_LOADER_FILE_EXTENSION).includes(
          extension.value
        )
      )
        return filedata;

      switch (extension.value) {
        case FS_LOADER_FILE_EXTENSION.JSON: {
          try {
            filedata[input.for] = deepfreeze<FileParsedDataType>(
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              require(filepath.value)
            );
            return filedata;
          } catch (error) {
            return filedata;
          }
        }

        case FS_LOADER_FILE_EXTENSION.TOML: {
          try {
            const data = parseTOMLFile(filepath.value);
            if (isNone(data)) return filedata;
            filedata[input.for] = deepfreeze<FileParsedDataType>(data.value);
            return filedata;
          } catch (error) {
            return filedata;
          }
        }

        default: {
          return filedata;
        }
      }
    }, {} as FSloaderOutputType)
  );
}

export function runloader(
  loader: Loader,
  opts: Record<string, unknown>
): Option<
  Readonly<EnvloaderOutputType | FSloaderOutputType | ArgvloaderOutputType>
> {
  switch (loader.type) {
    case LOADER_TYPE.ENV: {
      return some(runEnvloader(loader, opts));
    }

    case LOADER_TYPE.FS: {
      return some(runFSloader(loader, opts));
    }

    default: {
      return none;
    }
  }
}
