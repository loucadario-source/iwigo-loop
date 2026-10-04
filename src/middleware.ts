import { NextResponse, type NextRequest } from "next/server";

/** Protection du dashboard par cookie admin (les webhooks/API restent publics, avec leurs propres vérifs). */
export function middleware(req: NextRequest) {
  if (req.cookies.get("iwigo_admin")?.value === process.env.ADMIN_TOKEN) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/review/:path*", "/leads/:path*", "/trends/:path*"] };
