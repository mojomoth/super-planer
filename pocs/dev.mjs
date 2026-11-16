// Runs all three PoCs at once: step1 :3101, workflow-view :3102, plan-doc :3103
import { spawn } from 'node:child_process';
const apps = [['step1', 3101], ['workflow-view', 3102], ['plan-doc', 3103]];
for (const [dir, port] of apps) {
  const p = spawn('npm', ['run', 'dev', '-w', dir, '--', '-p', String(port)], { stdio: 'inherit' });
  p.on('exit', (code) => console.log(`[${dir}] exited ${code}`));
}
console.log(apps.map(([d, p]) => `${d}: http://localhost:${p}`).join('\n'));
