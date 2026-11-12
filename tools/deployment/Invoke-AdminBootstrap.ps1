# Never run as part of normal startup. Requires a SEPARATE user approval.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$JarPath,
    [Parameter(Mandatory=$true)][string]$ExpectedJarSha256,
    [Parameter(Mandatory=$true)][string]$ClientDefaults,
    [Parameter(Mandatory=$true)][string]$ExpectedServerUuid,
    [Parameter(Mandatory=$true)][string]$CredentialFile,
    [Parameter(Mandatory=$true)][string]$PythonPath,
    [Parameter(Mandatory=$true)][string]$JavaPath,
    [switch]$Approved
)
$ErrorActionPreference = 'Stop'
if (-not $Approved) { throw 'Separate approval is required; no bootstrap was executed.' }
if ($env:FOOD_DB_USERNAME -ne 'fooddelivery_app') { throw 'Use the main DML account, never root.' }
if ($env:FOOD_DB_URL -notmatch '^jdbc:mysql://127\.0\.0\.1:3306/fooddelivery(?:\?|$)') { throw 'Unexpected datasource target.' }
if (-not (Test-Path -LiteralPath Env:\FOOD_DB_PASSWORD)) { throw 'Protected database credential is required.' }
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$credentialPath = [IO.Path]::GetFullPath($CredentialFile)
if ($credentialPath.StartsWith($repository+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Credential file must be outside Git.' }
if (-not (Test-Path -LiteralPath $credentialPath -PathType Leaf)) { throw 'Protected credential file is missing.' }
if ((Get-FileHash -LiteralPath $JarPath -Algorithm SHA256).Hash -ne $ExpectedJarSha256) { throw 'Unreviewed application artifact.' }
& $PythonPath -B (Join-Path $PSScriptRoot 'mysql_baseline.py') --profile main --defaults-file $ClientDefaults --expected-server-uuid $ExpectedServerUuid --action verify
if ($LASTEXITCODE -ne 0) { throw 'Schema verification failed; bootstrap refused.' }
$previousEnabled = $env:FOOD_ADMIN_BOOTSTRAP_ENABLED
$previousFile = $env:FOOD_ADMIN_CREDENTIAL_FILE
try {
    $env:FOOD_ADMIN_BOOTSTRAP_ENABLED = 'true'
    $env:FOOD_ADMIN_CREDENTIAL_FILE = $credentialPath
    # Existing explicit CLI; does not start SpringApplication or an HTTP server.
    & $JavaPath '-Dloader.main=vn.gaugaugau.fooddelivery.auth.bootstrap.AdminBootstrap' '-cp' $JarPath 'org.springframework.boot.loader.launch.PropertiesLauncher'
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap failed; do not retry blindly.' }
} finally {
    $env:FOOD_ADMIN_BOOTSTRAP_ENABLED = $previousEnabled
    $env:FOOD_ADMIN_CREDENTIAL_FILE = $previousFile
}
