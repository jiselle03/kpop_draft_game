import { pgTableCreator } from 'drizzle-orm/pg-core'

export const createTable = pgTableCreator((name) => `kpop_draft_game_${name}`)

// Database tables will be defined here once persistence is introduced.
