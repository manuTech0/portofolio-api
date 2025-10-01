type StoreValue = {
    value: any;
    expiresAt: number;
};

class MemoryStore {
    private store = new Map<string, StoreValue>();

    constructor(private cleanupInterval = 60 * 1000) {
        setInterval(() => this.cleanup(), cleanupInterval);
    }

    set(key: string, value: any, ttlMs: number) {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    get(key: string): any | undefined {
        const item = this.store.get(key);
        if (!item) return undefined;
        if (item.expiresAt < Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return item.value;
    }

    delete(key: string) {
        this.store.delete(key);
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, val] of this.store.entries()) {
            if (val.expiresAt < now) this.store.delete(key);
        }
    }
}

export const memoryStore = new MemoryStore();