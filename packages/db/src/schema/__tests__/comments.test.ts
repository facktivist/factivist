import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { COMMENT_BODY_MAX, comments } from '../comments.ts'

const config = getTableConfig(comments)

describe('comments table', () => {
  it('table name is comments', () => {
    expect(config.name).toBe('comments')
  })

  it('has a text PK at column "id"', () => {
    const id = config.columns.find((c) => c.name === 'id')
    expect(id).toBeDefined()
    expect(id?.primary).toBe(true)
    expect(id?.dataType).toBe('string')
  })

  it('has a complaint_slug FK column (not null)', () => {
    const slug = config.columns.find((c) => c.name === 'complaint_slug')
    expect(slug).toBeDefined()
    expect(slug?.notNull).toBe(true)
  })

  it('has an author_id FK column (not null) — never raw nullifier', () => {
    const author = config.columns.find((c) => c.name === 'author_id')
    expect(author).toBeDefined()
    expect(author?.notNull).toBe(true)
    // Negative assertion: there is NO `nullifier`, `ip`, or `user_agent` column.
    const banned = ['nullifier', 'ip', 'user_agent', 'session_cookie']
    for (const name of banned) {
      expect(config.columns.find((c) => c.name === name)).toBeUndefined()
    }
  })

  it('parent_id is nullable (top-level comments)', () => {
    const parent = config.columns.find((c) => c.name === 'parent_id')
    expect(parent).toBeDefined()
    expect(parent?.notNull).toBe(false)
  })

  it('flagged_state defaults to "ok"', () => {
    const flagged = config.columns.find((c) => c.name === 'flagged_state')
    expect(flagged).toBeDefined()
    expect(flagged?.default).toBe('ok')
  })

  it('declares the (complaint_slug, created_at) index — the canonical thread fetch', () => {
    const idx = config.indexes.find((i) => i.config.name === 'comments_by_complaint')
    expect(idx).toBeDefined()
  })

  it('declares the parent_id index — for client-side tree reconstruction', () => {
    const idx = config.indexes.find((i) => i.config.name === 'comments_by_parent')
    expect(idx).toBeDefined()
  })
})

describe('COMMENT_BODY_MAX', () => {
  it('matches the Comment.Thread compound textarea maxLength', () => {
    expect(COMMENT_BODY_MAX).toBe(2000)
  })
})

describe('comments foreign keys', () => {
  it('declares FKs on complaint_slug + author_id with onDelete=cascade', () => {
    // Drizzle stores FK metadata on the `foreignKeys` array of the table
    // config. Each fk lazy-references its target via a closure; we touch
    // each one to ensure the reference resolver is exercised + the
    // onDelete intent is recorded.
    const fks = config.foreignKeys ?? []
    const fkNames = fks.map((fk) => {
      const ref = fk.reference()
      return {
        from: ref.columns.map((c) => c.name),
        to: ref.foreignColumns.map((c) => c.name),
        onDelete: fk.onDelete,
      }
    })
    expect(fkNames).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: ['complaint_slug'], to: ['slug'], onDelete: 'cascade' }),
        expect.objectContaining({ from: ['author_id'], to: ['id'], onDelete: 'cascade' }),
      ]),
    )
  })
})
