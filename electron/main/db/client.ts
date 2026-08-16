import Database from 'better-sqlite3'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

function ensureColumn(d: Database.Database, table: string, column: string, ddl: string): void {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) {
    d.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}

export function initDb(dbPath: string): Database.Database {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  // 旧库迁移：补齐新增列
  ensureColumn(db, 'projects', 'style_ref', 'style_ref TEXT')
  ensureColumn(db, 'projects', 'style_bible', 'style_bible TEXT')
  ensureColumn(db, 'assets', 'confirmed', 'confirmed INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'scenes', 'dialogues', 'dialogues TEXT')
  // 旗舰·院线级拆解：场景目标/价值/时长预算 + 镜头电影级字段（老库零迁移成本）
  ensureColumn(db, 'scenes', 'scene_goal', 'scene_goal TEXT')
  ensureColumn(db, 'scenes', 'value_shift', 'value_shift TEXT')
  ensureColumn(db, 'scenes', 'target_duration_sec', 'target_duration_sec REAL')
  for (const [col, ddl] of [
    ['beat_id', 'beat_id TEXT'],
    ['lens', 'lens TEXT'],
    ['subject_in_frame', 'subject_in_frame TEXT'],
    ['screen_direction', 'screen_direction TEXT'],
    ['eyeline', 'eyeline TEXT'],
    ['axis_side', 'axis_side TEXT'],
    ['sound_type', 'sound_type TEXT'],
    ['audio_cue', 'audio_cue TEXT'],
    ['continuity_notes', 'continuity_notes TEXT'],
    ['dialogue_refs', 'dialogue_refs TEXT']
  ] as const) {
    ensureColumn(db, 'shots', col, ddl)
  }
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB 未初始化，请先调用 initDb()')
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
