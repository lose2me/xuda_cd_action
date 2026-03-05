import { getLang } from './config';

let cachedLang: any = null;

export function getLanguages() {
  if (!cachedLang) {
    cachedLang = getLang();
  }
  return cachedLang;
}
