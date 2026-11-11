param(
    [Parameter(Mandatory = $true)][string]$Reports,
    [Parameter(Mandatory = $true)][int]$ExpectedTests
)
$ErrorActionPreference = 'Stop'
$files = @(Get-ChildItem -LiteralPath $Reports -Filter 'TEST-*.xml' -File)
if ($files.Count -eq 0) { throw 'JUnit reports missing' }
$totals = @{ tests = 0; failures = 0; errors = 0; skipped = 0 }
foreach ($file in $files) {
    [xml]$report = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($key in @('tests', 'failures', 'errors', 'skipped')) {
        $totals[$key] += [int]$report.testsuite.GetAttribute($key)
    }
}
if ($totals.tests -ne $ExpectedTests -or $totals.failures -ne 0 -or $totals.errors -ne 0 -or $totals.skipped -ne 0) {
    throw ('JUnit gate rejected: ' + ($totals | ConvertTo-Json -Compress))
}
Write-Output ('JUnit gate PASS: ' + ($totals | ConvertTo-Json -Compress))
