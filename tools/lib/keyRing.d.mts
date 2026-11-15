export const OUT_OF_QUOTA: RegExp;
export class KeyRing {
  constructor(now?: () => number);
  order(keys: string[]): string[];
  worked(key: string): void;
  failed(key: string, message: string): void;
}
export function withKeys<T>(ring: KeyRing, keys: string[], run: (key: string) => Promise<T>): Promise<T>;
export function splitKeys(text: string | null | undefined): string[];
