param(
    [ValidateSet('start','stop','restart','status')]
    [string]$Action = 'status',
    [int]$Port = 8002,
    [string]$Community = 'public',
    [switch]$VerboseOutput
)

function Write-Info($msg){ Write-Host "[INFO ] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[WARN ] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Get-BackendProcessId {
    try {
        $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if($conn){ return $conn.OwningProcess }
        return $null
    } catch { return $null }
}

function Show-Status {
    $backendPid = Get-BackendProcessId
    if($backendPid){
        $p = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
        if($p){
            Write-Info "Backend listening on port $Port (PID=$backendPid, StartTime=$($p.StartTime))"
            try {
                $health = Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 2 -ErrorAction Stop
                Write-Info "Health: status=$($health.status) real_device_detection=$($health.real_device_detection) timestamp=$($health.timestamp)"
            } catch { Write-Warn "Health endpoint not responding yet." }
        } else {
            Write-Warn "Port $Port has a listener but process details unavailable (PID=$backendPid)."            
        }
    } else {
        Write-Warn "No backend process is currently listening on port $Port"
    }
}

function Start-Backend {
    $backendPid = Get-BackendProcessId
    if($backendPid){
        Write-Warn "Backend already running on port $Port (PID=$backendPid). Use -Action restart or stop first."
        return
    }
    Write-Info "Starting backend on port $Port ..."
    $env:METRO_SNMP_COMMUNITY = $Community
    if($VerboseOutput){ Write-Info "Environment METRO_SNMP_COMMUNITY=$Community" }

    # Start hidden so terminal is freed
    $proc = Start-Process -FilePath python -ArgumentList '-m','Backend_for_station_Radios.real_backend' -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 2
    $newBackendPid = Get-BackendProcessId
    if($newBackendPid){
        Write-Info "Started backend (PID=$newBackendPid)."
        Show-Status
    } else {
        Write-Err "Failed to confirm backend is listening. Check for Python errors."    
    }
}

function Stop-Backend {
    $backendPid = Get-BackendProcessId
    if(!$backendPid){ Write-Warn "No backend running on port $Port"; return }
    Write-Info "Stopping backend process PID=$backendPid ..."
    try { Stop-Process -Id $backendPid -Force -ErrorAction Stop; Write-Info "Stopped." }
    catch { Write-Err "Failed to stop process: $($_.Exception.Message)" }
}

switch($Action){
    'status'  { Show-Status }
    'start'   { Start-Backend }
    'stop'    { Stop-Backend }
    'restart' { Stop-Backend; Start-Sleep -Seconds 1; Start-Backend }
}
