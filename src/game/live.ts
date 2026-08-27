import type { FolkPost } from "./inhabit";

export type LiveWalk = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  job: string;
  alt: number;
};

export type LiveSnap = {
  t: "snap";
  host: string;
  res: number;
  howls: number;
  walk: LiveWalk[];
  folk: FolkPost[];
  city?: { shape: string; x: number; z: number; h?: number; r?: number; rot?: number; mat?: string }[];
};

export type LiveWish = {
  t: "wish";
  folkId: string;
  wish: string;
  name: string;
};

export type LiveBirth = {
  t: "birth";
  name: string;
  crew: string;
};

export type LiveHost = { t: "host"; id: string };
export type LiveWho = { t: "who" };
export type LiveMsg = LiveSnap | LiveWish | LiveBirth | LiveHost | LiveWho;
