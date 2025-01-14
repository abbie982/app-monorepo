import type { IAdaSdk, IEnsureSDKReady } from './types';

const getCardanoApi = async () =>
  Promise.resolve(globalThis.$webembedApiProxy.chainAdaLegacy);

const ensureSDKReady: IEnsureSDKReady = async () => Promise.resolve(true);

const sdk: IAdaSdk = { getCardanoApi, ensureSDKReady };
export default sdk;
