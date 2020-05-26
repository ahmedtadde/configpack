export const OMNI_SELECTOR = "*";

export const DEPLOYMENT_TYPE = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
  "*": OMNI_SELECTOR
} as const;

export const LOADER_TYPE = {
  ENV: "env",
  FS: "fs",
  ARGV: "argv"
} as const;

export const ENVIRONMENT_VALUES_DESERIALIZATION_TYPE = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  JSON: "json",
  ARRAY_OF_STRING: "[string]",
  ARRAY_OF_NUMBER: "[number]"
} as const;

export const ENVIRONMENT_VARIABLE_NAME_REGEX_VALIDATOR = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const DEFAULT_ENVIRONMENT_VALUES_DESERIALIZATION_TYPE =
  ENVIRONMENT_VALUES_DESERIALIZATION_TYPE.STRING;

export const DEFAULT_ENVIRONMENT_VARIABLE_ARRAY_SEPARATOR = ",";
export const DEFAULT_ENV_LOADER_PREFIX = "";
export const DEFAULT_ENV_LOADER_VARIABLE_TYPE = "string";

export const DEFAULT_ARGV_LOADER_PREFIX = "";

export const FS_LOADER_FILE_EXTENSION = {
  JSON: "json",
  TOML: "toml"
} as const;

export const DEFAULT_FS_LOADER_DIR_PATH = "./";
export const DEFAULT_PROVIDER_DEPLOYMENT = [OMNI_SELECTOR] as const;
export const DEFAULT_PROVIDER_INSTANCE = [OMNI_SELECTOR] as const;
export const DEFAULT_PROVIDER_MODE = [OMNI_SELECTOR] as const;
export const DEFAULT_PROVIDER_HOSTNAME = [OMNI_SELECTOR] as const;
