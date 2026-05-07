const fs = require('fs');
const path = require('path');
const viewsDir = 'C:/Users/Administrator/Desktop/SuperClaw/src/views';
const storesDir = 'C:/Users/Administrator/Desktop/SuperClaw/src/stores';
const libDir = 'C:/Users/Administrator/Desktop/SuperClaw/src/lib';
const composablesDir = 'C:/Users/Administrator/Desktop/SuperClaw/src/composables';

const issues = [];

function walk(dir) {
    const results = [];
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.')) results.push(...walk(p));
        else if (e.isFile() && (e.name.endsWith('.vue') || e.name.endsWith('.ts'))) results.push(p);
    }
    return results;
}

const files = [...walk(viewsDir), ...walk(storesDir), ...walk(libDir), ...walk(composablesDir)];

// 1. Check all store files have proper catch coverage
console.log('--- STORE CATCH ANALYSIS ---');
for (const f of fs.readdirSync(storesDir).filter(f => f.endsWith('.ts'))) {
    const c = fs.readFileSync(path.join(storesDir, f), 'utf-8');
    const asyncFuncs = (c.match(/async function/g) || []).length;
    const catches = (c.match(/catch\s*\(/g) || []).length;
    if (asyncFuncs > catches) {
        console.log('  ' + f + ': ' + asyncFuncs + ' async, ' + catches + ' catch - MISSING CATCH');
        issues.push({ f, s: 'medium', msg: asyncFuncs + ' async funcs but only ' + catches + ' catch' });
    }
}

// 2. Check all views for potential issues with composable usage
console.log('\n--- VIEW ANALYSIS ---');
for (const f of files.filter(f => f.endsWith('.vue'))) {
    const name = path.relative(viewsDir, f);
    const c = fs.readFileSync(f, 'utf-8');
    
    // Check: invoke() without try/catch
    if (c.includes('invoke(')) {
        const hasTry = c.includes('try {');
        const hasCatch = c.includes('catch');
        if (!hasTry || !hasCatch) {
            console.log('  ' + name + ': invoke() without try/catch');
            issues.push({ f: name, s: 'high', msg: 'invoke() without try/catch - Tauri commands can throw' });
        }
    }
    
    // Check: onMounted calls async without error boundary
    const omMatch = c.match(/onMounted\(async\s*\(\)\s*=>\s*\{/);
    if (omMatch) {
        const start = omMatch.index;
        const chunk = c.slice(start, start + 500);
        if (!chunk.includes('try {')) {
            // Check if it only calls useGatewayPage (which has its own try)
            if (!c.includes('useGatewayPage')) {
                console.log('  ' + name + ': onMounted async without try/catch');
            }
        }
    }
    
    // Check: template null safety for composable data
    // (data from useGatewayData can be null)
    if (c.includes('useGatewayData')) {
        // Extract v-for usage of composable data
        const templateStart = c.indexOf('<template>');
        const templateEnd = c.indexOf('</template>');
        if (templateStart > -1 && templateEnd > -1) {
            const tmpl = c.slice(templateStart, templateEnd);
            // Check if v-for uses data that could be null without fallback
            const matches = tmpl.match(/v-for=\"\w+\s+in\s+(\w+)/g);
            if (matches) {
                for (const m of matches) {
                    const arr = m.match(/in\s+(\w+)/)[1];
                    // Skip if array could be null - Vue handles null gracefully
                }
            }
        }
    }
}

// 3. Check WebSocket leak
console.log('\n--- WEBSOCKET ANALYSIS ---');
const allCode = files.map(f => { try { return fs.readFileSync(f, 'utf-8'); } catch { return ''; } }).join('\n');
if (allCode.includes('gatewayWs') && !allCode.includes('gatewayWs.disconnect(')) {
    if (!allCode.includes('.disconnect()')) {
        console.log('  websocket.ts: disconnect() defined but never called in any file - potential connection leak');
        issues.push({ f: 'global', s: 'medium', msg: 'gatewayWs.disconnect() never called' });
    }
}

// 4. Check router vs sidebar consistency
console.log('\n--- ROUTER vs SIDEBAR ---');
const router = fs.readFileSync('C:/Users/Administrator/Desktop/SuperClaw/src/router/index.ts', 'utf-8');
const home = fs.readFileSync(path.join(viewsDir, 'Home.vue'), 'utf-8');
const rtPaths = [...router.matchAll(/path:\s+'([^']+)'/g)].map(m => m[1]).filter(p => p !== '' && p !== '/');
const menuPaths = [...home.matchAll(/path:\s+'([^']+)'/g)].map(m => m[1]);
const missingFromMenu = rtPaths.filter(p => !menuPaths.includes(p));
const missingFromRoutes = menuPaths.filter(p => !rtPaths.includes(p));
if (missingFromMenu.length) console.log('  MISSING menu items: ' + missingFromMenu.join(', '));
if (missingFromRoutes.length) console.log('  MISSING routes: ' + missingFromRoutes.join(', '));
if (!missingFromMenu.length && !missingFromRoutes.length) console.log('  All routes <-> menu aligned OK');

// 5. Check for all view files existence
console.log('\n--- VIEW EXISTENCE ---');
const vueMap = { chat:'Chat', channels:'Channels', models:'Models', skills:'Skills', cron:'Cron',
    agents:'Agents', memory:'Memory', devices:'Devices', tools:'Tools', environments:'Environments',
    artifacts:'Artifacts', voice:'Voice', approvals:'Approvals', secrets:'Secrets',
    diagnostics:'Diagnostics', push:'PushNotifications', settings:'Settings' };
let allExist = true;
for (const [route, name] of Object.entries(vueMap)) {
    if (!fs.existsSync(path.join(viewsDir, name + '.vue'))) {
        console.log('  MISSING: ' + name + '.vue for /' + route);
        allExist = false;
    }
}
if (allExist) console.log('  All 17 view files exist');

// 6. Cross-file analysis: check gateway.ts return type consistency
console.log('\n--- TYPE CONSISTENCY ---');
const gt = fs.readFileSync('C:/Users/Administrator/Desktop/SuperClaw/src/lib/gateway.ts', 'utf-8');
const gwMethods = [...gt.matchAll(/(\w+):\s*\([^)]*\)\s*=>\s*Promise<GatewayResponse<[^>]+>>/g)];
const callCount = (gt.match(/callGateway\(/g) || []).length;
const endpointCount = gwMethods.length;
console.log('  gateway.ts: ' + endpointCount + ' typed endpoints, ' + callCount + ' callGateway usages');

// 7. Check for potential race conditions
console.log('\n--- RACE CONDITIONS ---');
for (const f of files.filter(f => f.endsWith('.vue'))) {
    const c = fs.readFileSync(f, 'utf-8');
    const name = path.relative(viewsDir, f);
    
    // Check: watch + immediate API call without guard
    if (c.includes('watch(') && c.includes('immediate: true') && c.includes('await ')) {
        console.log('  ' + name + ': watch with immediate:true and async - potential race');
    }
    
    // Check: concurrent Promise.all with state mutations
    if (c.includes('Promise.all([') && c.includes('.value =')) {
        console.log('  ' + name + ': Promise.all with direct state mutation - potential race');
    }
}

// 8. Check Settings.vue for the switchTab fix
console.log('\n--- PREVIOUS FIX VERIFICATION ---');
const settings = fs.readFileSync(path.join(viewsDir, 'Settings.vue'), 'utf-8');
if (settings.includes('async function switchTab') && settings.includes('await loadCurrentTab()')) {
    console.log('  Settings.vue: switchTab await fix confirmed');
} else {
    console.log('  WARNING: Settings.vue switchTab await fix NOT found');
}

const diag = fs.readFileSync(path.join(viewsDir, 'Diagnostics.vue'), 'utf-8');
if (diag.includes(':key="index"')) {
    console.log('  Diagnostics.vue: v-for key fix confirmed');
}

const gwStore = fs.readFileSync(path.join(storesDir, 'gateway.ts'), 'utf-8');
if (gwStore.includes('pidMatch') && gwStore.includes('parseInt')) {
    console.log('  gateway.ts store: PID capture fix confirmed');
}

console.log('\n=== SUMMARY ===');
console.log('Files checked: ' + files.length);
console.log('Issues found: ' + issues.length);
issues.forEach(i => console.log('  [' + i.s.toUpperCase() + '] ' + i.f + ': ' + i.msg));
