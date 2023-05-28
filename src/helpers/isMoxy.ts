import { IS_MOXY } from '../constant.js';
import type { Proxifiable, IsMoxyWildcard } from '../types.js';

/** Check if the target is mocked by moxy */
const isMoxy = (moxied: Proxifiable): boolean =>
  (moxied as IsMoxyWildcard)[IS_MOXY] === true;

export default isMoxy;
