import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RankRun — Ranking Nacional de Corridas de Rua", template: "%s | RankRun" },
  description: "Ranking nacional de corridas de rua do Brasil. Resultados, tempos e classificações de provas em todo o país.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-orange-500">🏃</span>
              <span>Rank<span className="text-orange-500">Run</span></span>
            </a>
            <nav className="flex gap-6 text-sm font-medium text-slate-600">
              <a href="/ranking" className="hover:text-orange-500 transition-colors">Ranking</a>
              <a href="/provas" className="hover:text-orange-500 transition-colors">Provas</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 mt-16 py-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} RankRun · Ranking Nacional de Corridas de Rua do Brasil
        </footer>
      </body>
    </html>
  );
}
