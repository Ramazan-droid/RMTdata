const http=require('http'),fs=require('fs'),path=require('path');const dist=path.join(__dirname,'app/frontend/dist');
http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')||req.url.startsWith('/a4/')){const p=http.request({hostname:'127.0.0.1',port:3001,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});req.pipe(p);p.on('error',()=>{res.statusCode=502;res.end('backend unavailable')});return;}
 let fp=path.join(dist,decodeURIComponent(req.url.split('?')[0]));if(!fs.existsSync(fp)||fs.statSync(fp).isDirectory())fp=path.join(dist,'index.html');
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};res.setHeader('Content-Type',types[path.extname(fp)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(fp).pipe(res);
}).listen(18080,'127.0.0.1',()=>console.log('A4 gateway http://127.0.0.1:18080'));
