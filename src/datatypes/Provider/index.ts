import {
  Loader,
  createloader,
  ConfigurableLoaderProperties
} from "@datatypes/Loader";
import {
  Option,
  DeploymentType,
  none,
  fold,
  some,
  fromNullable
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

export interface ProviderLoaderConfig {
  use: Readonly<Loader>;
  for: string;
  options: ConfigurableLoaderProperties;
}

export interface Provider {
  readonly name: string;
  readonly deployment: ReadonlyArray<DeploymentType>;
  readonly instance: ReadonlyArray<string | number>;
  readonly hostname: ReadonlyArray<string>;
  readonly mode: ReadonlyArray<string | number>;
  readonly loaders: ReadonlyArray<ProviderLoaderConfig>;
  readonly schema: string;
}

export const createprovider = (
  someinput: unknown,
  context: Record<string, unknown>
): Option<Provider> => {
  if (!isPlainObject(someinput)) return none;
  if (!isNonEmptyString(someinput.name)) return none;
  if (!isNonEmptyString(someinput.schema)) return none;

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

          return fold(
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
