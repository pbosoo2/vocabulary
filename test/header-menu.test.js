'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('account buttons live in a native initially closed disclosure',()=>{const menu=html.match(/<details\b[^>]*id="accountTools"[^>]*>[\s\S]*?<\/details>/)[0];assert.ok(menu);assert.doesNotMatch(menu.split('>')[0],/\bopen\b/);assert.match(menu,/<summary id="accountToggle"/);for(const id of ['refresh','fullRefresh','logout'])assert.match(menu,new RegExp('id="'+id+'"'));});
test('disclosure chevron is centered and action buttons retain equal columns',()=>{assert.match(html,/\.account-menu summary\{[^}]*justify-content:center/);assert.match(html,/\.account-menu-body\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);assert.match(html,/\.account-menu\[open\] \.account-chevron\{transform:rotate\(180deg\)/);});
test('menu toggling changes labels and layout only, never starts synchronization',()=>{const listener=html.match(/\$\('accountTools'\)\.addEventListener\('toggle',[^\n]+/)[0];assert.doesNotMatch(listener,/syncWords|fetch\(/);assert.match(html,/\$\('accountTools'\)\.open=false/);});

test('action disclosure follows the footer inside the library, not the header',()=>{const header=html.match(/<header>[\s\S]*?<\/header>/)[0],library=html.match(/<main[^>]*id="library"[\s\S]*?<\/main>/)[0];assert.doesNotMatch(header,/id="accountTools"/);assert.ok(library.indexOf('<footer>')<library.indexOf('id="accountTools"'));assert.match(library,/<\/details><\/main>$/);});
