#!/usr/bin/env node
// 跨平台验证启动器：构建后以 SELFTEST / SMOKE 模式运行 Electron（无界面）。
// 用法：node scripts/verify.cjs selftest | smoke
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const mode = (process.argv[2] || 'selftest').toLowerCase()
const isWin = process.platform === 'win32'
const bin = (name) => path.join(__dirname, '..', 'node_modules', '.bin', isWin ? `${name}.cmd` : name)

console.log('> 构建 electron-vite …')
const build = spawnSync(bin('electron-vite'), ['build'], { stdio: 'inherit', shell: isWin })
if (build.status !== 0) process.exit(build.status || 1)

const env = { ...process.env }
if (mode === 'smoke') env.SMOKE = '1'
else env.SELFTEST = '1'

console.log(`> 运行 Electron（${mode.toUpperCase()} 模式）…`)
const run = spawnSync(bin('electron'), ['.'], { stdio: 'inherit', shell: isWin, env })
process.exit(run.status || 0)
