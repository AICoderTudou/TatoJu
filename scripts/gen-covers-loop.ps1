# 风格封面批量生成 · 断点自动续跑
# 用法：在项目根目录执行  powershell -ExecutionPolicy Bypass -File scripts\gen-covers-loop.ps1
# 原理：Electron GENCOVERS 模式会跳过已存在的封面，崩了就重启，直到 75/75 或重试用尽。
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
$stylesDir = Join-Path $root 'public\styles'
$target = 75
$maxRounds = 12

for ($round = 1; $round -le $maxRounds; $round++) {
  $have = (Get-ChildItem $stylesDir -Filter *.png -File -ErrorAction SilentlyContinue).Count
  Write-Host "===== 第 $round 轮：已有 $have / $target =====" -ForegroundColor Cyan
  if ($have -ge $target) { Write-Host "全部完成 ✔" -ForegroundColor Green; break }

  $env:GENCOVERS = 'all'
  $env:GENCOVERS_CONC = '3'
  & npx electron .   # Key 从 safeStorage 取，无需命令行传入

  Start-Sleep -Seconds 2
}

$final = (Get-ChildItem $stylesDir -Filter *.png -File -ErrorAction SilentlyContinue).Count
Write-Host "结束：$final / $target" -ForegroundColor Yellow
