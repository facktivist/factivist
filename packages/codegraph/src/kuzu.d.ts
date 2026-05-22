/**
 * Ambient declaration for the `kuzu` npm package, which ships a CommonJS
 * native binding without TypeScript types. We only consume `Database`,
 * `Connection`, and the query/getAll surface — everything else stays
 * opaque so we're not pinned to the C++ wrapper's signatures.
 */

declare module 'kuzu' {
  export class Database {
    constructor(path: string)
  }
  export class Connection {
    constructor(db: Database)
    query(cypher: string): Promise<{ getAll: () => Promise<unknown[]> }>
    close(): void
  }
}
