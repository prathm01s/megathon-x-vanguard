// PLACEHOLDER until the first `pnpm db:types` run (needs `pnpm db:start`, i.e. Docker).
// The generated file replaces this one completely.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Empty = Record<string, never>;

export type Database = {
  public: {
    Tables: Empty;
    Views: Empty;
    Functions: Empty;
    Enums: Empty;
    CompositeTypes: Empty;
  };
};
