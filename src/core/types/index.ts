import {
  LOADER_TYPE,
  DEPLOYMENT_TYPE,
  ENVIRONMENT_VALUES_DESERIALIZATION_TYPE,
  PROVIDER_SCHEMA_TYPE
} from "@/core/constants";
export * from "@/core/types/Option";
export * from "@/core/types/Either";

export type BasePrimitive = string | number | boolean;
export type Nullish = undefined | null;

export type Primitive = BasePrimitive | Nullish | symbol;

export type GenerilazedRecordType =
  | BasePrimitive
  | null
  | ReadonlyArray<GenerilazedRecordType>
  | { readonly [property: string]: Readonly<GenerilazedRecordType> };

export type LoaderType = typeof LOADER_TYPE[keyof typeof LOADER_TYPE];
export type DeploymentType = typeof DEPLOYMENT_TYPE[keyof typeof DEPLOYMENT_TYPE];
export type EnvironmentValuesDeserializationType = typeof ENVIRONMENT_VALUES_DESERIALIZATION_TYPE[keyof typeof ENVIRONMENT_VALUES_DESERIALIZATION_TYPE];
export type EnvironmentValuesType =
  | BasePrimitive
  | ReadonlyArray<string>
  | ReadonlyArray<number>
  | Readonly<Record<"fromjson", unknown>>;

export type EnvloaderOutputType = Record<string, EnvironmentValuesType>;
export type ArgvValuesType = BasePrimitive | ReadonlyArray<BasePrimitive>;

export type ArgvloaderOutputType = Record<string, ArgvValuesType>;
export type FileParsedDataType = GenerilazedRecordType;

export type FSloaderOutputType = Record<string, Readonly<FileParsedDataType>>;
export type ProviderOutputType = Record<
  string,
  Readonly<GenerilazedRecordType>
>;

export type ProviderSchemaType = typeof PROVIDER_SCHEMA_TYPE[keyof typeof PROVIDER_SCHEMA_TYPE];

export type Predicate<T> = (x: T) => boolean;
