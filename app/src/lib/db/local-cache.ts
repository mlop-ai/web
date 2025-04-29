import Dexie, { type EntityTable } from "dexie";
import { useEffect, useState } from "react";

export interface CacheData<T> {
  id: string;
  syncedAt: Date;
  data: T;
  finishedAt: Date | null;
  // Allow Dexie to attach extra properties if needed.
  [key: string]: any;
}

export class LocalCache<T> extends Dexie {
  store: EntityTable<CacheData<T>, string>;
  maxSize: number;
  constructor(dbName: string, storeName: string, maxSize: number, version = 1) {
    super(dbName);
    this.version(version).stores({
      [storeName]: "id, syncedAt, finishedAt",
    });
    // Explicitly set the table type.
    this.store = this.table<CacheData<T>, string>(storeName);
    this.maxSize = maxSize;
  }

  async checkAndClearIfNeeded() {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage && estimate.usage > this.maxSize) {
        await this.delete();
        console.log("IndexedDB cleared due to size limit exceeded");
      }
    } catch (error) {
      console.error("Error checking storage size:", error);
    }
  }

  async getData(id: string): Promise<CacheData<T> | undefined> {
    return this.store.get(id);
  }

  async setData(
    id: string,
    data: T,
    finishedAt: Date | null = null,
  ): Promise<void> {
    const record: CacheData<T> = {
      id,
      syncedAt: new Date(),
      data,
      finishedAt,
    };

    await this.store.put(record as CacheData<T>);
  }
}

export const useCheckDatabaseSize = (db: LocalCache<any>) => {
  useEffect(() => {
    const checkSize = async () => {
      try {
        await db.checkAndClearIfNeeded();
      } catch (error) {
        console.error("Error checking database size:", error);
      }
    };
    checkSize();
  }, [db]);
};
