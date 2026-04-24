$f = "c:\Users\MSI-PC\Downloads\TEst Site\New folder\imlosttho-main\shared\styles\main.css"
$c = [System.IO.File]::ReadAllText($f)

# 1. Update team-card
$oldCard = '    .team-card \{[\s\S]+?transition: box-shadow \.2s, transform \.2s;[\s\S]+?\}'
$newCard = '    .team-card {
      background: rgba(30, 30, 46, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      overflow: visible;
      position: relative;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .team-card:hover {
      transform: translateY(-5px) scale(1.01);
      background: rgba(40, 40, 60, 0.85);
      border-color: var(--tc);
      box-shadow: 0 10px 40px -15px var(--tc);
    }'
$c = [regex]::Replace($c, $oldCard, $newCard)

# 2. Update section-label (HUD style)
$oldLabel = '    .section-label \{[\s\S]+?text-shadow: 0 0 16px rgba\(245, 200, 66, \.25\);[\s\S]+?\}'
$newLabel = "    .section-label {
      font-family: 'Orbitron', sans-serif;
      font-size: .85rem;
      font-weight: 800;
      letter-spacing: 3px;
      margin-top: 50px;
      margin-bottom: 25px;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 15px;
      text-transform: uppercase;
      outline: none;
    }
    .section-label::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 20px;
      background: var(--gold);
      box-shadow: 0 0 12px var(--gold);
    }
    .section-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, var(--border), transparent);
    }"
$c = [regex]::Replace($c, $oldLabel, $newLabel)

# 3. Add nav-search (find a place to inject)
$searchCSS = "    .nav-search {
      margin-right: 20px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .nav-search input {
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 12px 6px 32px;
      color: var(--text);
      font-family: 'Rajdhani', sans-serif;
      font-size: .9rem;
      width: 160px;
      transition: all 0.2s;
      outline: none;
    }
    .nav-search input:focus {
      width: 220px;
      border-color: var(--cyan);
      background: rgba(0,0,0,0.5);
      box-shadow: 0 0 15px rgba(0, 212, 255, 0.15);
    }
    .nav-search svg {
      position: absolute;
      left: 10px;
      color: var(--dim);
      pointer-events: none;
    }`r`n`r`n"
if (!$c.Contains(".nav-search")) {
    $c = $c.Replace(".nav-header {", $searchCSS + "    .nav-header {")
}

# 4. Refine Line Heights
$c = $c.Replace("      margin-top: 4px;`r`n      outline: none;", "      margin-top: 4px;`r`n      outline: none;`r`n      line-height: 1.45;")
$c = $c.Replace("      display: block;", "      display: block;`r`n      line-height: 1.35;`r`n      margin-top: 2px;")

[System.IO.File]::WriteAllText($f, $c)
Write-Output "SUCCESS"
