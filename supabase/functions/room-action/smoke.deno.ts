// Deno side of `pnpm functions:smoke` (see supabase/tests/deno-smoke.ts). Not deployed:
// exercises the built bundle + postgres.js exactly as index.ts does, minus HTTP/auth.
import postgres from "postgres";
import { createRoomActionHandler } from "./_bundle/handler.js";

const sql = postgres(Deno.env.get("SMOKE_DB_URL")!, { max: 1, prepare: false, onnotice: () => {} });
const handle = createRoomActionHandler(sql);
const [host, guest] = Deno.env.get("SMOKE_USERS")!.split(",");

function check(cond: unknown, message: string): void {
  if (!cond) {
    console.error(`✖ ${message}`);
    Deno.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

type Ok = { status: number; body: { code: string; view: { status: string; turn: number; members: unknown[] } } };

const created = (await handle(host!, { op: "create", chapterId: "ch2-first-job" })) as Ok;
check(created.status === 200, `create → 200 (got ${created.status})`);
const code = created.body.code;

const joined = await handle(guest!, { code, op: "join" });
check(joined.status === 200, joined.status === 200 ? "guest joins" : `guest joins (got ${joined.status} ${JSON.stringify(joined.body)})`);
const started = (await handle(host!, { code, op: "start" })) as Ok;
check(started.body.view.status === "playing" && started.body.view.members.length >= 3, "host starts; bots fill seats");

await handle(host!, { code, op: "act", action: { type: "invest", optionId: "savings", amount: 500000 } });
await handle(host!, { code, op: "submit_turn" });
const turn = (await handle(guest!, { code, op: "submit_turn" })) as Ok;
check(turn.body.view.turn === 1, "turn resolves when both humans submit");

const bad = await handle(guest!, { code, op: "place_bid", amount: -1 });
check(bad.status === 400, "invalid input rejected with 400");

const decisions = await sql`select count(*)::int as n from decisions`;
check(decisions[0]!.n > 0, `decisions written (${decisions[0]!.n})`);
const views = await sql`select count(*)::int as n from room_views where room_code = ${code}`;
check(views[0]!.n === 2, "one room_views row per human");

await sql.end();
console.log("all Deno checks passed");
