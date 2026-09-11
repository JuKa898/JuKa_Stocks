const fs=require('fs');
const path=require('path');

module.exports=async function handler(req,res){
  const requiredFiles=[
    '../core.js',
    '../lib/pipeline.js',
    '../lib/symbols.js',
    '../lib/eu-fundamentals.js'
  ];
  const files=Object.fromEntries(requiredFiles.map(rel=>[
    rel.replace('../',''),
    fs.existsSync(path.join(__dirname,rel))
  ]));
  const env={
    TWELVE_DATA_API_KEY:Boolean(process.env.TWELVE_DATA_API_KEY),
    ALPHA_VANTAGE_API_KEY:Boolean(process.env.ALPHA_VANTAGE_API_KEY),
    SEC_USER_AGENT:Boolean(process.env.SEC_USER_AGENT)
  };
  const ok=Object.values(files).every(Boolean)&&Object.values(env).every(Boolean);
  res.setHeader('Cache-Control','no-store');
  return res.status(ok?200:503).json({
    ok,
    service:'JUKA',
    version:'8.0.0-final',
    fairValueEngine:'JUKA Fair Value 6.0 Final',
    environment:process.env.VERCEL_ENV||'unknown',
    files,
    env,
    providerReadiness:{usMarket:env.TWELVE_DATA_API_KEY,euMarket:env.ALPHA_VANTAGE_API_KEY,usFundamentals:env.SEC_USER_AGENT},
    note:'Only presence flags are returned; secret values are never exposed.'
  });
};
