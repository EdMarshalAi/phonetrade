const { readFileSync } = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
const raw = readFileSync(".env.local","utf8");
for (const l of raw.split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}
(async()=>{
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  for(const k of ["welcome","order","cart","review","crosssell","campaign","birthday"]){
    const buf=readFileSync(`/tmp/hdr/${k}.jpg`);
    const up=await db.storage.from("product-images").upload(`email/headers/${k}.png`,buf,{contentType:"image/jpeg",upsert:true});
    console.log(up.error?("✗ "+k+" "+up.error.message):("✓ "+k));
  }
})();
