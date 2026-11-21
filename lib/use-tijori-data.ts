"use client";

import { useSyncExternalStore } from "react";
import { emptyData, getSnapshot, subscribe } from "./store";
import type { AppData } from "./types";

const serverSnapshot: AppData = emptyData();

function getServerSnapshot(): AppData {
  return serverSnapshot;
}

export function useTijoriData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}