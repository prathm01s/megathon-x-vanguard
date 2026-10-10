// Supabase Edge Function: the server-authoritative Friends' Room (§7.6). Owner: Samarth.
//
// Thin Deno entry. All logic is in ./handler.ts (tested in Node against PGlite); it is
// bundled with the engine and content into ./_bundle/handler.js by `pnpm functions:build`.
// BUILD BEFORE SERVING OR DEPLOYING:  pnpm functions:build
//
// Request:  POST /functions/v1/room-action   Authorization: Bearer <user JWT>
//           { "op": "create", "chapterId": "ch2-first-job" }
//           { "code": "ABC234", "op": "submit_turn" }   (any RoomRequest from @toss/engine)
// Response: 200 { code, view }  |  4xx/5xx { code, message }
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import postgres from "postgres";
import { createRoomActionHandler } from "./_bundle/handler.js";

// One small pool per worker. `prepare: false` keeps it compatible with the transaction pooler.
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 3, prepare: false });
const handle = createRoomActionHandler(sql);

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ code: "method_not_allowed", message: "use POST" }, { status: 405 });
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ code: "bad_request", message: "body must be JSON" }, { status: 400 });
    }
    // The player is whoever the verified JWT says — never anything in the body.
    const result = await handle(ctx.userClaims?.id ?? null, body);
    return Response.json(result.body, { status: result.status });
  }),
};
