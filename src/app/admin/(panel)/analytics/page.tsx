import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart, type SeriesPoint } from "@/components/admin/Charts";

export const metadata: Metadata = { title: "Аналитика" };

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default async function AnalyticsPage() {
  const db = createSupabaseAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const [{ data: views }, { data: searches }] = await Promise.all([
    db.from("page_views").select("path,created_at").gte("created_at", sinceIso).limit(5000),
    db.from("search_queries").select("query,results_count,created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  const viewRows = (views ?? []) as { path: string; created_at: string }[];

  // Просмотры по дням
  const byDay: Record<string, number> = {};
  for (const v of viewRows) byDay[v.created_at.slice(0, 10)] = (byDay[v.created_at.slice(0, 10)] ?? 0) + 1;
  const series: SeriesPoint[] = lastNDays(30).map((d) => ({
    label: d.slice(5).replace("-", "."),
    value: byDay[d] ?? 0,
  }));

  // Топ-страниц
  const byPath: Record<string, number> = {};
  for (const v of viewRows) byPath[v.path] = (byPath[v.path] ?? 0) + 1;
  const topPaths = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const searchRows = (searches ?? []) as { query: string; results_count: number; created_at: string }[];
  const totalViews = viewRows.length;

  return (
    <>
      <PageHeader title="Аналитика" description={`Просмотры, топ-страницы и поиск за 30 дней. Всего просмотров: ${totalViews}.`} />

      <Panel>
        <PanelHeader><PanelTitle>Просмотры страниц по дням</PanelTitle></PanelHeader>
        <div className="p-4">
          {totalViews === 0 ? (
            <p className="py-10 text-center text-sm text-ink-subtle">Данных пока нет — трекинг начнёт собирать просмотры с публичного сайта.</p>
          ) : (
            <TimeSeriesChart data={series} valueFormatter={(v) => String(v)} />
          )}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader><PanelTitle>Топ-страниц</PanelTitle></PanelHeader>
          {topPaths.length === 0 ? (
            <div className="p-5"><EmptyState title="Нет данных" /></div>
          ) : (
            <Table>
              <THead><TH>Путь</TH><TH className="w-24 text-right">Просмотры</TH></THead>
              <TBody>
                {topPaths.map(([path, n]) => (
                  <TR key={path}>
                    <TD className="font-mono text-[13px]">{path}</TD>
                    <TD className="text-right font-medium">{n}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader><PanelTitle>Поисковые запросы</PanelTitle></PanelHeader>
          {searchRows.length === 0 ? (
            <div className="p-5"><EmptyState title="Запросов пока нет" hint="Появятся, когда подключим поиск по сайту." /></div>
          ) : (
            <Table>
              <THead><TH>Запрос</TH><TH className="w-24 text-right">Результатов</TH></THead>
              <TBody>
                {searchRows.map((s, i) => (
                  <TR key={i}>
                    <TD>{s.query}</TD>
                    <TD className="text-right text-ink-muted">{s.results_count}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
