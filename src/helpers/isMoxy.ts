import { Proxifiable, IsMoxyWildcard, IS_MOXY } from '../types';

const isMoxy = (moxied: Proxifiable): boolean =>
  (moxied as IsMoxyWildcard)[IS_MOXY] === true;

export default isMoxy;
