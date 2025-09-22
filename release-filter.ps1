Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param (
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$CaptureOutput
    )

    if ($CaptureOutput) {
        $result = & git @Arguments
    }
    else {
        & git @Arguments
        $result = $null
    }

    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $exitCode."
    }

    if ($CaptureOutput) {
        return $result
    }
}

function Select-OptionInteractive {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [Parameter(Mandatory = $true)]
        [string[]]$Options
    )

    $selectedIndex = 0
    $originalForeground = [System.Console]::ForegroundColor
    $originalBackground = [System.Console]::BackgroundColor

    Write-Host "$Prompt (Use arrow keys and Enter)"
    Write-Host ""
    $menuStart = [System.Console]::CursorTop

    foreach ($option in $Options) {
        Write-Host ""
    }

    while ($true) {
        $width = try { [Math]::Max(1, [System.Console]::WindowWidth) } catch { 120 }
        $usableWidth = $width - 1
        if ($usableWidth -lt 1) {
            $usableWidth = 1
        }

        for ($index = 0; $index -lt $Options.Length; $index++) {
            [System.Console]::SetCursorPosition(0, $menuStart + $index)
            $isSelected = $index -eq $selectedIndex
            if ($isSelected) {
                [System.Console]::ForegroundColor = [System.ConsoleColor]::Black
                [System.Console]::BackgroundColor = [System.ConsoleColor]::Gray
                $prefix = '>'
            }
            else {
                [System.Console]::ForegroundColor = $originalForeground
                [System.Console]::BackgroundColor = $originalBackground
                $prefix = ' '
            }

            $line = "$prefix $($Options[$index])"
            if ($line.Length -gt $usableWidth) {
                $line = $line.Substring(0, $usableWidth)
            }
            else {
                $line = $line.PadRight($usableWidth)
            }

            [System.Console]::Write($line)
        }

        [System.Console]::ForegroundColor = $originalForeground
        [System.Console]::BackgroundColor = $originalBackground

        $key = [System.Console]::ReadKey($true)

        switch ($key.Key) {
            'UpArrow' { if ($selectedIndex -gt 0) { $selectedIndex-- } else { $selectedIndex = $Options.Length - 1 } }
            'DownArrow' { if ($selectedIndex -lt $Options.Length - 1) { $selectedIndex++ } else { $selectedIndex = 0 } }
            'Home' { $selectedIndex = 0 }
            'End' { $selectedIndex = $Options.Length - 1 }
            'Enter' {
                [System.Console]::SetCursorPosition(0, $menuStart + $Options.Length)
                Write-Host ""
                return $selectedIndex
            }
        }
    }
}

function Select-OptionFallback {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [Parameter(Mandatory = $true)]
        [string[]]$Options
    )

    Write-Host $Prompt
    for ($index = 0; $index -lt $Options.Length; $index++) {
        Write-Host ("[{0}] {1}" -f ($index + 1), $Options[$index])
    }

    while ($true) {
        $response = Read-Host "Enter choice (1-$($Options.Length))"
        $parsed = 0
        if ([int]::TryParse($response, [ref]$parsed) -and $parsed -ge 1 -and $parsed -le $Options.Length) {
            return $parsed - 1
        }
        Write-Host "Invalid selection. Enter a number between 1 and $($Options.Length)." -ForegroundColor Yellow
    }
}

function Select-Option {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [Parameter(Mandatory = $true)]
        [string[]]$Options
    )

    if (-not $Options -or $Options.Length -eq 0) {
        throw "No options provided for selection."
    }

    $shouldFallback = $false
    try {
        if ([System.Console]::IsInputRedirected -or [System.Console]::IsOutputRedirected) {
            $shouldFallback = $true
        }
    }
    catch {
        $shouldFallback = $true
    }

    if (-not $shouldFallback) {
        try {
            return Select-OptionInteractive -Prompt $Prompt -Options $Options
        }
        catch {
            $shouldFallback = $true
        }
    }

    return Select-OptionFallback -Prompt $Prompt -Options $Options
}

try {
    $repoRoot = Resolve-Path -LiteralPath $PSScriptRoot

    if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
        throw "Unable to locate a .git directory at $repoRoot. Run this script from inside the repository root."
    }

    $filterDirectories = Get-ChildItem -Path $repoRoot -Directory |
        Where-Object { $_.Name -notmatch '^\.' } |
        Sort-Object -Property Name

    if (-not $filterDirectories) {
        throw "No filter directories found in $repoRoot."
    }

    $filterOptions = $filterDirectories | ForEach-Object { $_.Name }
    $filterIndex = Select-Option -Prompt 'Select a filter' -Options $filterOptions
    $filterName = $filterOptions[$filterIndex]
    Write-Host "Selected filter: $filterName"
    Write-Host ""

    Push-Location -LiteralPath $repoRoot
    try {
        $tagPattern = "$filterName-*"
        $existingTags = Invoke-Git -Arguments @('tag', '--list', $tagPattern) -CaptureOutput
    }
    finally {
        Pop-Location
    }

    $hasPreviousRelease = $false
    $latestVersion = [Version]'0.0.0'

    if ($existingTags) {
        $versionCandidates = foreach ($tag in $existingTags) {
            if ($tag -match ("^{0}-(\d+\.\d+\.\d+)$" -f [regex]::Escape($filterName))) {
                [Version]$Matches[1]
            }
        }

        if ($versionCandidates) {
            $latestVersion = $versionCandidates | Sort-Object -Descending | Select-Object -First 1
            $hasPreviousRelease = $true
        }
    }

    if ($hasPreviousRelease) {
        Write-Host ("Latest released version: {0}" -f $latestVersion)
    }
    else {
        Write-Host 'No previous releases found. Defaulting to 0.0.0.'
    }

    Write-Host ""

    $releaseOptions = @(
        'Patch (x.y.Z -> x.y.(Z+1))',
        'Minor (x.y.Z -> x.(y+1).0)'
    )
    $releaseIndex = Select-Option -Prompt 'Select release type' -Options $releaseOptions
    $releaseChoice = if ($releaseIndex -eq 0) { 'Patch' } else { 'Minor' }
    Write-Host "Release type: $releaseChoice"

    switch ($releaseChoice) {
        'Patch' {
            $newVersion = New-Object System.Version -ArgumentList $latestVersion.Major, $latestVersion.Minor, ($latestVersion.Build + 1)
        }
        'Minor' {
            $newVersion = New-Object System.Version -ArgumentList $latestVersion.Major, ($latestVersion.Minor + 1), 0
        }
    }

    $newTag = "$filterName-$($newVersion.ToString())"
    Write-Host ""
    Write-Host ("Proposed tag: {0}" -f $newTag)

    $confirmation = Read-Host 'Create this tag and push to origin? (y/n)'
    if ($confirmation -notmatch '^(?i)y(es)?$') {
        Write-Host 'Release cancelled.'
        exit 0
    }

    Push-Location -LiteralPath $repoRoot
    try {
        Invoke-Git -Arguments @('tag', $newTag)
        Invoke-Git -Arguments @('push', 'origin', $newTag)
    }
    finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host ("Tag {0} created and pushed to origin." -f $newTag)
}
catch {
    Write-Error $_
    exit 1
}
