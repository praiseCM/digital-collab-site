import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
const server=createServer(async(request,response)=>{try{const url=new URL(request.url,'http://localhost');const relative=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}const body=await readFile(file);response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});if(request.method==='HEAD')response.end();else response.end(body);}catch{response.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
