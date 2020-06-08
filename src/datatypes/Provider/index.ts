import {
  Loader,
  ConfigurableLoaderProperties,
  LoaderOutputType
} from "@datatypes/Loader";
import {
  Option,
  DeploymentType,
  none,
  optionfold,
  some,
  fromNullable,
  ProviderOutputType,
  ProviderSchemaType
} from "@/core/types";
import {
  isPlainObject,
  isNonEmptyString,
  isNumber,
  isNullish
} from "@/core/operators";
import {
  DEFAULT_PROVIDER_DEPLOYMENT,
  DEPLOYMENT_TYPE,
  OMNI_SELECTOR,
  DEFAULT_PROVIDER_MODE,
  DEFAULT_PROVIDER_INSTANCE,
  DEFAULT_PROVIDER_HOSTNAME,
  LOADER_TYPE
} from "@/core/constants";
import { Either, left, right } from "@/core/types/Either";

export interface ProviderLoaderConfig {
  readonly use: Readonly<Loader>;
  readonly for: string;
  readonly options: ConfigurableLoaderProperties;
}

export interface ProviderSchemaConfig {
  readonly name: string;
  readonly type: ProviderSchemaType;
  readonly transform: <T>(
    context: Readonly<Record<string, unknown>>,
    data: Readonly<LoaderOutputType>
  ) => T;
  readonly use: 
}

export interface Provider {
  readonly name: string;
  readonly deployment: ReadonlyArray<DeploymentType>;
  readonly instance: ReadonlyArray<string | number>;
  readonly hostname: ReadonlyArray<string>;
  readonly mode: ReadonlyArray<string | number>;
  readonly loaders: ReadonlyArray<ProviderLoaderConfig>;
  readonly schema: Readonly<ProviderSchemaConfig>;
}

export const createprovider = (
  context: Record<string, unknown>,
  someinput: unknown
): Option<Provider> => {
  if (!isPlainObject(someinput)) return none;
  if (!isNonEmptyString(someinput.name)) return none;
  if (!isNonEmptyString(someinput.schema)) return none;

  // const schema = () => {
  //   if (!isPlainObject(context) || !isPlainObject(context.availableschemas))
  //     return Object.freeze([]) as ReadonlyArray<ProviderLoaderConfig>;
  // };

  const deployment = (): ReadonlyArray<DeploymentType> => {
    if (!Array.isArray(someinput.deployment))
      return DEFAULT_PROVIDER_DEPLOYMENT as ReadonlyArray<DeploymentType>;

    const selected = Object.freeze(
      someinput.deployment.filter((deployment: unknown) =>
        Object.values<string>(DEPLOYMENT_TYPE).includes(deployment as string)
      )
    );
    if (selected.includes(OMNI_SELECTOR))
      return DEFAULT_PROVIDER_DEPLOYMENT as ReadonlyArray<DeploymentType>;
    return selected as ReadonlyArray<DeploymentType>;
  };

  const mode = (): ReadonlyArray<string | number> => {
    if (!Array.isArray(someinput.mode))
      return DEFAULT_PROVIDER_MODE as ReadonlyArray<string | number>;

    const selected = Object.freeze(
      someinput.mode.filter(
        (opt: unknown) => isNonEmptyString(opt) || isNumber(opt)
      )
    );
    if (selected.includes(OMNI_SELECTOR))
      return DEFAULT_PROVIDER_MODE as ReadonlyArray<string | number>;

    return selected as ReadonlyArray<string | number>;
  };

  const instance = (): ReadonlyArray<string | number> => {
    if (!Array.isArray(someinput.instance))
      return DEFAULT_PROVIDER_INSTANCE as ReadonlyArray<string | number>;

    const selected = Object.freeze(
      someinput.instance.filter(
        (opt: unknown) => isNonEmptyString(opt) || isNumber(opt)
      )
    );
    if (selected.includes(OMNI_SELECTOR))
      return DEFAULT_PROVIDER_INSTANCE as ReadonlyArray<string | number>;

    return selected as ReadonlyArray<string | number>;
  };

  const hostname = (): ReadonlyArray<string> => {
    if (!Array.isArray(someinput.hostname))
      return DEFAULT_PROVIDER_HOSTNAME as ReadonlyArray<string>;

    const selected = Object.freeze(
      someinput.hostname.filter(
        (opt: unknown) => isNonEmptyString(opt) || isNumber(opt)
      )
    );

    if (selected.includes(OMNI_SELECTOR))
      return DEFAULT_PROVIDER_HOSTNAME as ReadonlyArray<string>;

    return selected as ReadonlyArray<string>;
  };

  const loaders = (): ReadonlyArray<ProviderLoaderConfig> => {
    if (!isPlainObject(context) || !isPlainObject(context.availableloaders))
      return Object.freeze([]) as ReadonlyArray<ProviderLoaderConfig>;

    if (!Array.isArray(someinput.loaders))
      return Object.freeze([]) as ReadonlyArray<ProviderLoaderConfig>;

    const availableloaders = context.availableloaders as Record<string, Loader>;
    const loadersconf = someinput.loaders as ReadonlyArray<
      { use: string } & Omit<ProviderLoaderConfig, "use">
    >;

    const options = (
      conf: { use: string } & Omit<ProviderLoaderConfig, "use">,
      loader: Loader
    ): ConfigurableLoaderProperties => {
      switch (loader.type) {
        case LOADER_TYPE.ENV:
        case LOADER_TYPE.ARGV: {
          if (!isPlainObject(conf.options)) return { prefix: "" };
          if (!Object.keys(conf.options).includes("prefix"))
            return { prefix: "" };

          const options = conf.options as ConfigurableLoaderProperties<
            typeof loader.type
          >;

          if (!isNonEmptyString(options.prefix)) return { prefix: "" };
          return { prefix: options.prefix.trim() };
        }

        case LOADER_TYPE.FS: {
          if (!isPlainObject(conf.options)) return { dirpath: "" };
          if (!Object.keys(conf.options).includes("prefix"))
            return { prefix: "" };

          const options = conf.options as ConfigurableLoaderProperties<
            typeof loader.type
          >;

          if (!isNonEmptyString(options.dirpath)) return { dirpath: "" };
          return { dirpath: options.dirpath.trim() };
        }
      }
    };

    return Object.freeze(
      loadersconf.reduce<ProviderLoaderConfig[]>(
        (
          collectedloaders: ProviderLoaderConfig[],
          loaderconf: { use: string } & Omit<ProviderLoaderConfig, "use">
        ) => {
          if (!isNonEmptyString(loaderconf.use)) return collectedloaders;
          const alias = isNonEmptyString(loaderconf.for)
            ? loaderconf.for.trim()
            : loaderconf.use.trim();

          return optionfold(
            () => collectedloaders,
            (value: Loader) =>
              collectedloaders.concat({
                use: Object.freeze(value),
                for: alias,
                options: options(loaderconf, value)
              })
          )(fromNullable(availableloaders[loaderconf.use.trim()]));
        },
        [] as ProviderLoaderConfig[]
      )
    );
  };

  return some(
    Object.freeze({
      name: someinput.name.trim(),
      schema: someinput.schema.trim(),
      deployment: deployment(),
      mode: mode(),
      instance: instance(),
      hostname: hostname(),
      loaders: loaders()
    })
  );
};

export async function runprovider(
  context: Record<string, unknown>,
  provider: Provider
): Promise<Either<Record<string, Error[]>, ProviderOutputType>> {
  return new Promise((resolve) => {
    Promise.resolve()
      .then(() => {
        return right({});
      })
      .then(resolve)
      .catch((err: unknown) => {
        resolve(
          left({
            err: [
              new Error(
                isNullish(err)
                  ? "Unexpected error occured"
                  : isNonEmptyString(err)
                  ? err
                  : JSON.stringify(err)
              )
            ]
          })
        );
      });
  });
}
