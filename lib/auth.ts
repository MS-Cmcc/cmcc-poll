import { NextRequest } from "next/server";

export function isAdminAuthorized(req: NextRequest): boolean {
  const code = req.headers.get("x-admin-code");
  return !!code && code === process.env.ADMIN_CODE;
}
