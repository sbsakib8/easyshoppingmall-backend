"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../setup");
const cache_1 = require("../../utils/cache");
describe("Cache", () => {
    beforeEach(async () => {
        await cache_1.cache.delByPrefix("");
    });
    it("should set and get a value", async () => {
        await cache_1.cache.set("key1", { name: "test" }, 60);
        const result = await cache_1.cache.get("key1");
        expect(result).toEqual({ name: "test" });
    });
    it("should return null for expired entries", async () => {
        await cache_1.cache.set("key2", "value2", 1);
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const result = await cache_1.cache.get("key2");
        expect(result).toBeNull();
    });
    it("should delete a key", async () => {
        await cache_1.cache.set("key3", "value3", 60);
        await cache_1.cache.del("key3");
        const result = await cache_1.cache.get("key3");
        expect(result).toBeNull();
    });
    it("should clear all entries", async () => {
        await cache_1.cache.set("a", 1, 60);
        await cache_1.cache.set("b", 2, 60);
        await cache_1.cache.delByPrefix("");
        expect(await cache_1.cache.get("a")).toBeNull();
        expect(await cache_1.cache.get("b")).toBeNull();
    });
    it("should overwrite an existing key", async () => {
        await cache_1.cache.set("key4", "old", 60);
        await cache_1.cache.set("key4", "new", 60);
        const result = await cache_1.cache.get("key4");
        expect(result).toBe("new");
    });
    it("should return null for non-existent keys", async () => {
        const result = await cache_1.cache.get("nonexistent");
        expect(result).toBeNull();
    });
});
