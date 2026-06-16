"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../setup");
const cache_1 = require("../../utils/cache");
describe("MemoryCache", () => {
    beforeEach(() => {
        cache_1.memoryCache.clear();
    });
    it("should set and get a value", () => {
        cache_1.memoryCache.set("key1", { name: "test" }, 60);
        const result = cache_1.memoryCache.get("key1");
        expect(result).toEqual({ name: "test" });
    });
    it("should return null for expired entries", () => {
        cache_1.memoryCache.set("key2", "value2", -1);
        const result = cache_1.memoryCache.get("key2");
        expect(result).toBeNull();
    });
    it("should delete a key", () => {
        cache_1.memoryCache.set("key3", "value3", 60);
        cache_1.memoryCache.delete("key3");
        const result = cache_1.memoryCache.get("key3");
        expect(result).toBeNull();
    });
    it("should clear all entries", () => {
        cache_1.memoryCache.set("a", 1, 60);
        cache_1.memoryCache.set("b", 2, 60);
        cache_1.memoryCache.clear();
        expect(cache_1.memoryCache.get("a")).toBeNull();
        expect(cache_1.memoryCache.get("b")).toBeNull();
    });
    it("should overwrite an existing key", () => {
        cache_1.memoryCache.set("key4", "old", 60);
        cache_1.memoryCache.set("key4", "new", 60);
        const result = cache_1.memoryCache.get("key4");
        expect(result).toBe("new");
    });
    it("should return null for non-existent keys", () => {
        const result = cache_1.memoryCache.get("nonexistent");
        expect(result).toBeNull();
    });
});
