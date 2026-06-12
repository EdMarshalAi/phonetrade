/**
 * GEO: добавляет answer-first блок «Кратко» (TL;DR из excerpt) в начало статьи —
 * ИИ-движки (ChatGPT/Perplexity/AI Overviews) цитируют короткие факт-чанки сверху.
 * Идемпотентно (маркер <!--tldr-->). Запуск: npx tsx scripts/seo-tldr-blog.ts
 */
import { readFileSync } from "node:fs"; import { resolve } from "node:path"; import { createClient } from "@supabase/supabase-js";
function loadEnv(){const raw=readFileSync(resolve(process.cwd(),".env.local"),"utf8");for(const l of raw.split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}}
loadEnv();
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
(async()=>{
  const {data,error}=await db.from("blog_posts").select("slug,excerpt,content").eq("status","published");
  if(error)throw error;
  let done=0;
  for(const p of data as any[]){
    if(!p.excerpt || (p.content||"").includes("<!--tldr-->")) continue;
    const tldr=`<!--tldr--><p><strong>Кратко:</strong> ${p.excerpt}</p>\n`;
    const {error:e2}=await db.from("blog_posts").update({content:tldr+(p.content||"")}).eq("slug",p.slug);
    if(e2){console.error(p.slug,e2.message);continue;}
    done++;
  }
  console.log(`Готово: «Кратко» добавлено в ${done} статей`);
})().catch(e=>{console.error(e);process.exit(1);});
