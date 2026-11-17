export interface ReleaseInfo {
  version: string;
  url: string;
  beta: boolean;
}
export interface UpdateState {
  checkedAt?: number;
  latest?: ReleaseInfo | null;
}
export const RELEASES_REPO: string;
export const RELEASES_API: string;
export const RELEASES_PAGE: string;
export const DAY_MS: number;
export function parseVersion(text: unknown): { major: number; minor: number; patch: number; pre: (string | number)[] } | null;
export function compareVersions(a: string, b: string): -1 | 0 | 1;
export function isPrerelease(v: string): boolean;
export function safeReleaseUrl(url: unknown): string;
export function newestRelease(releases: unknown, current: string): ReleaseInfo | null;
export function dueForCheck(lastCheckedAt: number | undefined, now: number): boolean;
export function checkForUpdate(opts: {
  current: string;
  now: number;
  state: UpdateState | null | undefined;
  fetchReleases: () => Promise<unknown>;
}): Promise<{ update: ReleaseInfo | null; state: UpdateState }>;
