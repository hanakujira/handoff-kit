param(
  [Parameter(Mandatory=$true)][string]$Path,
  [string]$Out = '',
  [int]$Per = 0,
  [string]$Since = '',
  [string]$From = 'md'
)
$ErrorActionPreference = 'Stop'

# Thin shell: the real implementation is handoff.mjs (core.mjs + adapters/).
# Node resolution order:
#   1. $env:HANDOFF_NODE  (full path to node.exe, or to any Electron binary)
#   2. node on PATH
#   3. $env:HANDOFF_ELECTRON  (an Electron binary; runs JS with ELECTRON_RUN_AS_NODE=1)
# Nothing is hardcoded, so this works on any machine.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$exe = ''
if ($env:HANDOFF_NODE) { $exe = $env:HANDOFF_NODE }
if (-not $exe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $exe = $cmd.Source }
}
if (-not $exe) { $exe = $env:HANDOFF_ELECTRON }
if (-not $exe) {
  throw 'No JavaScript runtime found. Install Node.js, or set HANDOFF_NODE / HANDOFF_ELECTRON (see README).'
}
if (-not (Test-Path -LiteralPath $exe)) { throw "Runtime not found: $exe (see README)" }

$a = @((Join-Path $root 'handoff.mjs'), $Path)
if ($Out) { $a += @('--out', $Out) }
if ($Per -gt 0) { $a += @('--per', "$Per") }
if ($Since) { $a += @('--since', $Since) }
if ($From) { $a += @('--from', $From) }

$old = $env:ELECTRON_RUN_AS_NODE
$env:ELECTRON_RUN_AS_NODE = '1'
try {
  & $exe @a
  $code = $LASTEXITCODE
} finally {
  if ($null -eq $old) { Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue }
  else { $env:ELECTRON_RUN_AS_NODE = $old }
}
exit $code
