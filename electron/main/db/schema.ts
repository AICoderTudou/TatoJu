// SQLite DDL —— 单一应用数据库（所有项目共用一个 app.db），媒体文件落盘、库内只存相对路径。
// 用 IF NOT EXISTS + 外键级联，删除项目可干净清理整棵层级。

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  genre_default TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  style_ref TEXT,
  style_bible TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  source TEXT NOT NULL CHECK(source IN ('generated','uploaded')),
  raw_text TEXT,
  outline TEXT,
  status TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scripts_project ON scripts(project_id);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  title TEXT,
  synopsis TEXT
);
CREATE INDEX IF NOT EXISTS idx_episodes_script ON episodes(script_id);

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  slugline TEXT,
  location TEXT,
  time_of_day TEXT,
  description TEXT,
  dialogues TEXT,
  scene_goal TEXT,
  value_shift TEXT,
  target_duration_sec REAL
);
CREATE INDEX IF NOT EXISTS idx_scenes_episode ON scenes(episode_id);

CREATE TABLE IF NOT EXISTS beats (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  summary TEXT,
  beat_type TEXT,
  value_shift TEXT,
  dialogue_refs TEXT
);
CREATE INDEX IF NOT EXISTS idx_beats_scene ON beats(scene_id);

CREATE TABLE IF NOT EXISTS scene_elements (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_scene_elements_scene ON scene_elements(scene_id);

CREATE TABLE IF NOT EXISTS shots (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  shot_size TEXT,
  camera_angle TEXT,
  camera_move TEXT,
  duration_sec REAL,
  dialogue TEXT,
  action TEXT,
  storyboard_prompt TEXT,
  video_prompt TEXT,
  beat_id TEXT,
  lens TEXT,
  subject_in_frame TEXT,
  screen_direction TEXT,
  eyeline TEXT,
  axis_side TEXT,
  sound_type TEXT,
  audio_cue TEXT,
  continuity_notes TEXT,
  dialogue_refs TEXT
);
CREATE INDEX IF NOT EXISTS idx_shots_scene ON shots(scene_id);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('character','scene','prop')),
  name TEXT NOT NULL,
  description TEXT,
  t2i_prompt TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);

CREATE TABLE IF NOT EXISTS asset_images (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  generation_id TEXT,
  file_path TEXT NOT NULL,
  is_reference INTEGER NOT NULL DEFAULT 0,
  view TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_images_asset ON asset_images(asset_id);

CREATE TABLE IF NOT EXISTS shot_images (
  id TEXT PRIMARY KEY,
  shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  generation_id TEXT,
  file_path TEXT NOT NULL,
  is_selected INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shot_images_shot ON shot_images(shot_id);

CREATE TABLE IF NOT EXISTS shot_videos (
  id TEXT PRIMARY KEY,
  shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  generation_id TEXT,
  file_path TEXT NOT NULL,
  is_selected INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shot_videos_shot ON shot_videos(shot_id);

CREATE TABLE IF NOT EXISTS shot_asset_refs (
  shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (shot_id, asset_id)
);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('llm','image','video')),
  provider TEXT,
  model TEXT,
  params TEXT,
  seed INTEGER,
  external_task_id TEXT,
  status TEXT NOT NULL,
  inputs TEXT,
  output_paths TEXT,
  error TEXT,
  cost REAL,
  ref_kind TEXT,
  ref_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generations_project ON generations(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
`
