#!/usr/bin/env node
// Script executado pelo workflow .github/workflows/atualizar-catalogo.yml
//
// 1. Lê o catálogo (frontend/src/data/catalogo-corridas.json)
// 2. Marca provas com data passada como "encerradas"
// 3. Verifica HEAD de cada linkOficial e imprime relatório
// 4. Atualiza atualizadoEm com a data de hoje
// 5. Reescreve o JSON

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve(process.env.CATALOGO_PATH ?? "frontend/src/data/catalogo-corridas.json");
const hoje = new Date().toISOString().slice(0, 10);

const raw = await readFile(path, "utf8");
const catalogo = JSON.parse(raw);

let encerradasNovas = 0;
for (const c of catalogo.corridas) {
  if (c.data < hoje && c.status !== "encerradas") {
    c.status = "encerradas";
    encerradasNovas += 1;
  }
}

console.log(`\n=== Relatório semanal (${hoje}) ===`);
console.log(`Provas marcadas como encerradas neste run: ${encerradasNovas}`);

console.log("\n--- Verificando links oficiais ---");
const falhas = [];
for (const c of catalogo.corridas) {
  if (c.status === "encerradas") continue;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(c.linkOficial, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "corridasderua-bot/1.0" },
    });
    clearTimeout(t);
    if (!resp.ok) falhas.push({ id: c.id, status: resp.status, url: c.linkOficial });
  } catch (err) {
    falhas.push({ id: c.id, status: "ERR", url: c.linkOficial, msg: String(err.message ?? err) });
  }
}

if (falhas.length > 0) {
  console.log(`\n⚠️  ${falhas.length} link(s) com problema:`);
  for (const f of falhas) {
    console.log(`  - [${f.status}] ${f.id} → ${f.url}${f.msg ? ` (${f.msg})` : ""}`);
  }
} else {
  console.log("✅ Todos os links responderam ok.");
}

console.log("\n--- Provas em-breve (precisam de revisão humana) ---");
const emBreve = catalogo.corridas.filter((c) => c.status === "em-breve");
console.log(`Total: ${emBreve.length}`);
for (const c of emBreve) {
  console.log(`  - ${c.id}: ${c.titulo} (${c.data})`);
}

catalogo.atualizadoEm = hoje;
await writeFile(path, JSON.stringify(catalogo, null, 2) + "\n", "utf8");
console.log(`\n✓ Catálogo atualizado em ${path}`);
