import { Low } from "lowdb";
import { JSONFilePreset } from "lowdb/node";
import type { Data } from "./types.ts";

const defaultData: Data = { users: [] };

// Initialize the database
export const db: Low<Data> = await JSONFilePreset<Data>("db.json", defaultData);
