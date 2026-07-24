CREATE TABLE IF NOT EXISTS provas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  data TEXT NOT NULL,
  distancia_metros INTEGER NOT NULL,
  organizador TEXT,
  link_oficial TEXT,
  link_resultados TEXT,
  plataforma TEXT,
  status TEXT NOT NULL DEFAULT 'em-breve',
  destaque INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resultados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prova_id TEXT NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  atleta_nome TEXT NOT NULL,
  atleta_cidade TEXT,
  atleta_uf TEXT,
  categoria TEXT,
  tempo_liquido_seg INTEGER NOT NULL,
  tempo_bruto_seg INTEGER,
  colocacao_geral INTEGER,
  colocacao_categoria INTEGER,
  importado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_resultados_prova ON resultados(prova_id);
CREATE INDEX IF NOT EXISTS idx_resultados_tempo ON resultados(tempo_liquido_seg);
CREATE INDEX IF NOT EXISTS idx_resultados_uf ON resultados(atleta_uf);
CREATE INDEX IF NOT EXISTS idx_resultados_nome ON resultados(atleta_nome);
CREATE INDEX IF NOT EXISTS idx_provas_data ON provas(data);
CREATE INDEX IF NOT EXISTS idx_provas_uf ON provas(uf);
