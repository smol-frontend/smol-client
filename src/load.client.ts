import { TinyClientLoadBundleError } from "./errors";
import { LoadTinyFrontendOptions, TinyFrontendModuleConfig } from "./types";
import { getTinyFrontendModuleConfig } from "./utils/getTinyFrontendModuleConfig";
import { loadUmdBundle } from "./utils/loadUmdBundle";

export const loadTinyFrontendClient = async <T>({
  name,
  contractVersion,
  tinyApiEndpoint,
  dependenciesMap = {},
  loadingOptions = {},
}: LoadTinyFrontendOptions): Promise<T> => {
  const { retryPolicy, cacheTtlInMs = 2 * 60 * 1_000 } = loadingOptions;

  const tinyFrontendModuleConfigFromSsr = (
    window as unknown as Record<string, TinyFrontendModuleConfig | undefined>
  )[`tinyFrontend${name}Config`];

  const tinyFrontendModuleConfig =
    tinyFrontendModuleConfigFromSsr ??
    (await getTinyFrontendModuleConfig({
      libraryName: name,
      libraryVersion: contractVersion,
      hostname: tinyApiEndpoint,
      retryPolicy,
      cacheTtlInMs,
    }));

  if (tinyFrontendModuleConfig.cssBundle) {
    const cssBundleUrl = `${tinyApiEndpoint}/tiny/bundle/${tinyFrontendModuleConfig.cssBundle}`;
    if (!hasStylesheet(cssBundleUrl)) {
      const cssElement = document.createElement("link");
      cssElement.rel = "stylesheet";
      cssElement.href = cssBundleUrl;
      document.head.appendChild(cssElement);
    }
  }

  try {
    return await loadUmdBundle({
      bundleUrl: `${tinyApiEndpoint}/tiny/bundle/${tinyFrontendModuleConfig.umdBundle}`,
      dependenciesMap,
      baseCacheKey: `${name}-${contractVersion}`,
      retryPolicy,
    });
  } catch (err) {
    console.error(err);
    throw new TinyClientLoadBundleError(name);
  }
};

const hasStylesheet = (stylesheetHref: string): boolean =>
  !!document.querySelector(`link[rel="stylesheet"][href="${stylesheetHref}"]`);
