import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/api/upload",
  "/api/chat",
  "/api/documents",
  "/api/chats",
  "/api/chats/:path*",
]);

export default clerkMiddleware(async (auth, req) => {
  // Let OPTIONS through so CORS preflight succeeds; route handlers return Allow headers
  if (req.method === "OPTIONS") return NextResponse.next();
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
