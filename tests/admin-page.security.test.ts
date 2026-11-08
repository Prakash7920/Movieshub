import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";

vi.stubGlobal("React", React);

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error("REDIRECT:" + destination);
  }),
  userFindUnique: vi.fn(),
}));

vi.mock("next-auth/next", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}));
vi.mock("@/components/admin/admin-movies", () => ({ default: () => null }));
vi.mock("@/components/admin/admin-licenses", () => ({ default: () => null }));

import AdminPage from "../app/admin/page";

const USER_ID = "admin-page-user-123";

describe("admin page privilege boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: USER_ID } });
    mocks.userFindUnique.mockResolvedValue({ role: "USER", isBanned: false });
  });

  it("redirects unauthenticated visitors to login", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(AdminPage()).rejects.toThrow("REDIRECT:/auth/login?callbackUrl=%2Fadmin");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("does not query the database when the session has no user id", async () => {
    mocks.getServerSession.mockResolvedValue({ user: {} });

    await expect(AdminPage()).rejects.toThrow("REDIRECT:/auth/login?callbackUrl=%2Fadmin");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["USER", false],
    ["ADMIN", true],
    ["SUPERADMIN", true],
  ])("applies the database %s role to page access", async (role, allowed) => {
    mocks.userFindUnique.mockResolvedValue({ role, isBanned: false });

    const result = await AdminPage();

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { role: true, isBanned: true },
    });
    if (allowed) {
      expect(result).toBeTruthy();
      expect(mocks.redirect).not.toHaveBeenCalled();
    } else {
      expect(result.type).toBe(Symbol.for("react.fragment"));
      expect(mocks.redirect).not.toHaveBeenCalled();
    }
  });

  it("denies a banned administrator even when the database role is privileged", async () => {
    mocks.userFindUnique.mockResolvedValue({ role: "SUPERADMIN", isBanned: true });

    const result = await AdminPage();

    expect(result.props.children[0].props.children).toBe("Admin access required");
  });

  it("does not trust a forged role stored in the client session", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: USER_ID, role: "SUPERADMIN" } });
    mocks.userFindUnique.mockResolvedValue({ role: "USER", isBanned: false });

    const result = await AdminPage();

    expect(result.props.children.props.children[0].props.children).toBe("Admin access required");
  });
});
