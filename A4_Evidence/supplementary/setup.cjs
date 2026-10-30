const fs=require('fs'),path=require('path');
const root=__dirname, source=fs.readFileSync(path.join(root,'app/backend/server.js'),'utf8');
const prefix=`let a4seed=1;let a4logs=[];let a4run='pilot';Math.random=()=>{a4seed=(Math.imul(a4seed,1664525)+1013904223)>>>0;return a4seed/4294967296;};\n`;
const insertion=`
app.post('/a4/reset',(req,res)=>{a4seed=(Number(req.body.seed)||1)>>>0;a4run=String(req.body.run_id);a4logs=[];client.register.resetMetrics();res.json({run_id:a4run,seed:a4seed});});
app.get('/a4/logs',(_req,res)=>res.json(a4logs));
app.use((req,res,next)=>{const start=process.hrtime.bigint();if(req.path==='/api/items'){res.on('finish',()=>a4logs.push({run_id:a4run,mode:req.query.mode,page:Number(req.query.page),limit:Number(req.query.limit),status:res.statusCode,duration_ms:Number(process.hrtime.bigint()-start)/1e6}));}next();});
`;
fs.writeFileSync(path.join(root,'app/backend/server_instrumented.cjs'),prefix+source.replace("app.get('/api/items'",insertion+"\napp.get('/api/items'"));
console.log('Instrumented copy created. Original application components and loading rules unchanged.');
