// Minimal in-memory Supabase fake used by API endpoint tests.
// Supports only the chain patterns the production code actually uses.

type Row = Record<string, unknown>;

export interface FakeState {
  users: Row[];
  projects: Row[];
  keywords: Row[];
  audits: Row[];
}

export interface FakeAuthUser {
  id: string;
  email?: string;
}

export interface FakeOptions {
  user?: FakeAuthUser | null;
  state?: Partial<FakeState>;
}

export function makeFakeSupabase(opts: FakeOptions = {}) {
  const state: FakeState = {
    users: opts.state?.users ?? [],
    projects: opts.state?.projects ?? [],
    keywords: opts.state?.keywords ?? [],
    audits: opts.state?.audits ?? [],
  };
  const authUser = opts.user ?? null;

  return {
    state,
    client: {
      auth: {
        getUser: async () => ({ data: { user: authUser }, error: null }),
      },
      from(table: keyof FakeState) {
        return new QueryBuilder(table, state);
      },
    },
  };
}

interface Filter {
  op: "eq" | "gte" | "lt" | "in";
  col: string;
  val: unknown;
}

type Op = "select" | "insert" | "update" | "delete";

interface RunResult {
  data: Row[] | null;
  error: { message: string; code?: string } | null;
  count: number | null;
}

class QueryBuilder implements PromiseLike<RunResult> {
  private op: Op = "select";
  private payload: Row | Row[] | null = null;
  private filters: Filter[] = [];
  private headCount = false;
  private orderCol?: string;
  private orderAsc = true;
  private rangeStart?: number;
  private rangeEnd?: number;
  private limitN?: number;

  constructor(private table: keyof FakeState, private state: FakeState) {}

  select(_cols?: string, opts?: { head?: boolean; count?: string }): this {
    if (this.op === "select" && !this.payload) this.op = "select";
    this.headCount = !!opts?.head;
    return this;
  }

  insert(payload: Row | Row[]): this { this.op = "insert"; this.payload = payload; return this; }
  update(payload: Row): this { this.op = "update"; this.payload = payload; return this; }
  delete(_opts?: { count?: string }): this { this.op = "delete"; return this; }

  eq(col: string, val: unknown): this  { this.filters.push({ op: "eq",  col, val }); return this; }
  gte(col: string, val: unknown): this { this.filters.push({ op: "gte", col, val }); return this; }
  lt(col: string, val: unknown): this  { this.filters.push({ op: "lt",  col, val }); return this; }
  in(col: string, vals: unknown[]): this { this.filters.push({ op: "in", col, val: vals }); return this; }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col; this.orderAsc = opts?.ascending !== false; return this;
  }
  range(a: number, b: number): this { this.rangeStart = a; this.rangeEnd = b; return this; }
  limit(n: number): this { this.limitN = n; return this; }

  async single(): Promise<{ data: Row | null; error: RunResult["error"] }> {
    const r = await this.run();
    if (r.error) return { data: null, error: r.error };
    const row = r.data?.[0] ?? null;
    if (!row) return { data: null, error: { message: "no rows" } };
    return { data: row, error: null };
  }

  async maybeSingle(): Promise<{ data: Row | null; error: RunResult["error"] }> {
    const r = await this.run();
    return { data: r.data?.[0] ?? null, error: r.error };
  }

  then<T1, T2 = never>(
    onFulfilled?: ((v: RunResult) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return this.run().then(onFulfilled, onRejected) as PromiseLike<T1 | T2>;
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => {
      const v = row[f.col];
      if (f.op === "eq")  return v === f.val;
      if (f.op === "gte") return (v as string | number) >= (f.val as string | number);
      if (f.op === "lt")  return (v as string | number) <  (f.val as string | number);
      if (f.op === "in")  return (f.val as unknown[]).includes(v);
      return false;
    });
  }

  private async run(): Promise<RunResult> {
    const rows = this.state[this.table];

    if (this.op === "insert") {
      const payload = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const inserted: Row[] = [];
      for (const p of payload) {
        const row = { id: cryptoUuid(), created_at: new Date().toISOString(), ...p };
        // Enforce unique (project_id, keyword) on keywords table.
        if (this.table === "keywords") {
          const r: Row = row;
          const clash = rows.find(
            (x) => x["project_id"] === r["project_id"] && x["keyword"] === r["keyword"],
          );
          if (clash) {
            return { data: null, error: { message: "duplicate", code: "23505" }, count: null };
          }
        }
        rows.push(row);
        inserted.push(row);
      }
      return { data: inserted, error: null, count: inserted.length };
    }

    let result = rows.filter((r) => this.matches(r));

    if (this.orderCol) {
      const col = this.orderCol;
      result = [...result].sort((a, b) => {
        const av = a[col] as string | number;
        const bv = b[col] as string | number;
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * (this.orderAsc ? 1 : -1);
      });
    }
    if (this.rangeStart != null && this.rangeEnd != null) {
      result = result.slice(this.rangeStart, this.rangeEnd + 1);
    }
    if (this.limitN != null) result = result.slice(0, this.limitN);

    if (this.op === "delete") {
      const ids = new Set(result.map((r) => r["id"]));
      const before = rows.length;
      this.state[this.table] = rows.filter((r) => !ids.has(r["id"])) as Row[];
      // Mutate in place too so external refs see it.
      rows.length = 0;
      rows.push(...this.state[this.table]);
      return { data: null, error: null, count: before - rows.length };
    }
    if (this.op === "update") {
      for (const r of result) Object.assign(r, this.payload as Row);
      return { data: result, error: null, count: result.length };
    }

    // select
    return {
      data: this.headCount ? null : result,
      error: null,
      count: this.headCount ? result.length : null,
    };
  }
}

function cryptoUuid(): string {
  // randomUUID is available in Node 20+ / Web Crypto.
  return globalThis.crypto.randomUUID();
}
