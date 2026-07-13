// This file is intentionally minimal — pulse circle membership is managed
// exclusively via the owner-only circle-management API endpoints in pulse.ts.
// There is no auto-seeding or blanket startup seeding. Circles start empty
// (least-privilege: each user sees only their own posts) and are grown by the
// app owner who explicitly adds users via POST /pulse/circle/:userId.
export {};
