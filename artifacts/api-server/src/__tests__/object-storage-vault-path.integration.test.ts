import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage.js";

describe("ObjectStorageService Vault path validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PRIVATE_OBJECT_DIR;
  });

  it.each([
    ["malformed", "not-a-storage-path", 7, 1],
    ["traversal", "/bucket/private/vault/7/../other", 7, 1],
    ["wrong prefix", "/bucket/private/uploads/7/file", 7, 1],
    ["wrong owner", "/bucket/private/vault/8/1/file", 7, 1],
  ])("rejects %s Vault paths before storage access", async (_label, path, userId, itemId) => {
    process.env.PRIVATE_OBJECT_DIR = "/bucket/private";
    const bucket = vi.spyOn(objectStorageClient, "bucket");
    const service = new ObjectStorageService();
    await expect(service.loadVaultFile(path, userId, itemId)).rejects.toThrow();
    await expect(service.removeVaultFile(path, userId, itemId)).rejects.toThrow();
    expect(bucket).not.toHaveBeenCalled();
  });
});