import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('dist/index.html','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ids');
for(const[,href]of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(href.startsWith('#')){if(href.length>1)assert(ids.includes(href.slice(1)),'Missing anchor '+href);}else if(!/^(https?:|data:)/.test(href))assert(existsSync('dist/'+href.split(/[?#]/)[0]),'Missing asset '+href);}
const code=readFileSync('dist/app.js','utf8');new vm.Script(code);
for(const[,id]of code.matchAll(/querySelector\(['"]#([^'"]+)['"]\)/g))assert(ids.includes(id),'Missing interaction target '+id);
const csv=readFileSync('dist/assets/research-results.csv','utf8');
assert(csv.includes('0.455')&&csv.includes('0.623')&&csv.includes('0.632'));
assert(Math.abs((0.623-0.455)*100-16.8)<1e-10);
assert(Math.abs(0.182/0.824*100-22.1)<0.02);
assert(readFileSync('dist/styles.css','utf8').includes('prefers-reduced-motion'));
console.log('Passed: local assets, unique IDs, anchors, interaction targets, JS syntax, research values, and reduced-motion support.');
