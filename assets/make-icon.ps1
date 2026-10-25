# 生成水星计划的应用图标（多尺寸 ICO + PNG）
# 用法：powershell -ExecutionPolicy Bypass -File assets\make-icon.ps1
# 设计：深炭底 + 金色水星 + 倾斜轨道环 + 轨道小星。
# 小尺寸采用逐尺寸微调（不靠大图缩小），保证 16/32 像素下星球与轨道仍可辨认。
Add-Type -AssemblyName System.Drawing

$outDir = $PSScriptRoot
if (-not $outDir) { $outDir = (Join-Path $PSScriptRoot '..') }

# 需要打包进 ICO 的尺寸：16 任务栏、24 小图标、32 桌面、48 资源管理器、64/96/128 中图标、256 大图标
$icoSizes = @(16, 24, 32, 48, 64, 96, 128, 256)

$C_GOLD_LIGHT = [System.Drawing.Color]::FromArgb(255, 252, 228, 176)
$C_GOLD       = [System.Drawing.Color]::FromArgb(255, 240, 183, 78)
$C_GOLD_DEEP  = [System.Drawing.Color]::FromArgb(255, 176, 102, 18)
$C_ORBIT      = [System.Drawing.Color]::FromArgb(190, 246, 198, 122)
$C_ORBIT_SOFT = [System.Drawing.Color]::FromArgb(60, 246, 198, 122)
$C_TILE_TOP   = [System.Drawing.Color]::FromArgb(255, 30, 37, 46)
$C_TILE_BOT   = [System.Drawing.Color]::FromArgb(255, 9, 12, 15)
$C_EDGE       = [System.Drawing.Color]::FromArgb(30, 255, 255, 255)

function New-RoundedRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  if ($d -gt $w) { $d = $w }
  if ($d -gt $h) { $d = $h }
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# 在 256x256 设计网格上绘制一帧
function Render-Icon([int]$s) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $k = $s / 256.0
  $g.ScaleTransform([float]$k, [float]$k)

  # 小尺寸加大线宽与元素，抵消缩放损耗
  $isSmall = $s -le 32
  $orbitPen  = if ($isSmall) { 9.0 } elseif ($s -le 64) { 6.0 } else { 3.6 }
  $orbitGlow = if ($isSmall) { 16.0 } else { 9.0 }
  $moonR     = if ($isSmall) { 9.0 } elseif ($s -le 48) { 8.0 } else { 6.5 }

  # 底板：圆角方块。
  # 极小尺寸（16/24/32）必须铺满整格且不留圆角缺口：Windows 在小图标下
  # 对半透明边缘很挑剔，alpha 不是干净的 0/255 时 Shell 会判定图标无效、
  # 直接回退成默认的「快捷方式+蓝箭头」。所以这里用不留边的实心底板。
  if ($isSmall) {
    $tileRect = New-Object System.Drawing.Rectangle(0, 0, 256, 256)
    $tileBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($tileRect, $C_TILE_TOP, $C_TILE_BOT, 90)
    $g.FillRectangle($tileBrush, $tileRect)
  } else {
    $inset = 8.0
    $radius = 54.0
    $tileW = 256 - $inset * 2
    $tile = New-RoundedRect $inset $inset $tileW $tileW $radius
    $tileRect = New-Object System.Drawing.Rectangle($inset, $inset, $tileW, $tileW)
    $tileBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($tileRect, $C_TILE_TOP, $C_TILE_BOT, 90)
    $g.FillPath($tileBrush, $tile)
    $tilePen = New-Object System.Drawing.Pen($C_EDGE, 2)
    $g.DrawPath($tilePen, $tile)
  }

  # 星球尺寸与位置先定好，外晕、本体、轨道环共用同一圆心
  $planetSize = if ($isSmall) { 132.0 } else { 124.0 }
  $px = if ($isSmall) { 62.0 } else { 58.0 }
  $py = if ($isSmall) { 62.0 } else { 60.0 }
  $cx = $px + $planetSize / 2
  $cy = $py + $planetSize / 2

  # 星球外晕（小尺寸省略，否则整体发灰）
  if (-not $isSmall) {
    $pr = $planetSize / 2
    for ($i = 10; $i -ge 1; $i--) {
      $rad = $pr + $i * 5
      $a = [int](5 * (1 - $i / 11.0))
      $glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($a, 233, 163, 60))
      $g.FillEllipse($glow, [single]($cx - $rad), [single]($cy - $rad), [single]($rad * 2), [single]($rad * 2))
      $glow.Dispose()
    }
  }

  # 星球本体
  $planetRect = New-Object System.Drawing.Rectangle([int]$px, [int]$py, [int]$planetSize, [int]$planetSize)
  $planetBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($planetRect, $C_GOLD_LIGHT, $C_GOLD_DEEP, 55)
  $g.FillEllipse($planetBrush, $planetRect)
  $planetBrush.Dispose()

  # 星球边缘上暗下亮的一点立体感
  if (-not $isSmall) {
    $shade = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 120, 62, 6), 3)
    $g.DrawEllipse($shade, $planetRect)
    $shade.Dispose()
  }

  # 轨道环：圆心与星球完全重合，只做倾斜，避免视觉上像两个独立物体
  $ccx = $cx
  $ccy = $cy
  $g.TranslateTransform($ccx, $ccy)
  $g.RotateTransform(-22)
  $orbitW = if ($isSmall) { 196.0 } else { 202.0 }
  $orbitH = if ($isSmall) { 84.0 } else { 62.0 }
  $ox = -$orbitW / 2
  $oy = -$orbitH / 2
  $glowPen = New-Object System.Drawing.Pen($C_ORBIT_SOFT, $orbitGlow)
  $g.DrawEllipse($glowPen, [single]$ox, [single]$oy, [single]$orbitW, [single]$orbitH)
  $glowPen.Dispose()
  $op = New-Object System.Drawing.Pen($C_ORBIT, $orbitPen)
  $g.DrawEllipse($op, [single]$ox, [single]$oy, [single]$orbitW, [single]$orbitH)
  $op.Dispose()

  # 轨道上的小星：放在环的右上交点处，用 -22 度旋转矩阵算出屏幕坐标
  $ang = -22.0 * [Math]::PI / 180.0
  $lx = ($orbitW / 2) * [Math]::Cos($ang)
  $ly = ($orbitH / 2) * [Math]::Sin($ang)
  $rx = $lx * [Math]::Cos($ang) - $ly * [Math]::Sin($ang)
  $ry = $lx * [Math]::Sin($ang) + $ly * [Math]::Cos($ang)
  $mx = $ccx + $rx
  $my = $ccy + $ry
  $g.ResetTransform()

  if (-not $isSmall) {
    $moonGlowB = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 246, 198, 122))
    $gr = $moonR * 2.1
    $g.FillEllipse($moonGlowB, [single]($mx - $gr), [single]($my - $gr), [single]($gr * 2), [single]($gr * 2))
    $moonGlowB.Dispose()
  }
  $moon = New-Object System.Drawing.SolidBrush($C_GOLD_LIGHT)
  $g.FillEllipse($moon, [single]($mx - $moonR), [single]($my - $moonR), [single]($moonR * 2), [single]($moonR * 2))
  $moon.Dispose()

  $g.Dispose()
  $tileBrush.Dispose()
  if ($tile) { $tilePen.Dispose(); $tile.Dispose() }
  return $bmp
}

# 导出 PNG
foreach ($s in $icoSizes) {
  $bmp = Render-Icon $s
  $bmp.Save((Join-Path $outDir "icon-$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# 打包 ICO：所有尺寸都以 PNG 压缩数据嵌入（Vista 及以后均支持）
$datas = @()
foreach ($s in $icoSizes) { $datas += , ([System.IO.File]::ReadAllBytes((Join-Path $outDir "icon-$s.png"))) }

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$icoSizes.Count)
$offset = 6 + 16 * $icoSizes.Count
for ($i = 0; $i -lt $icoSizes.Count; $i++) {
  $sz = $icoSizes[$i]
  $dim = if ($sz -ge 256) { 0 } else { $sz }
  $bw.Write([Byte]$dim); $bw.Write([Byte]$dim)   # 宽、高（0 表示 256）
  $bw.Write([Byte]0); $bw.Write([Byte]0)          # 调色板数、保留位
  $bw.Write([UInt16]1); $bw.Write([UInt16]32)     # 色彩平面、位深
  $bw.Write([UInt32]$datas[$i].Length)
  $bw.Write([UInt32]$offset)
  $offset += $datas[$i].Length
}
foreach ($d in $datas) { $bw.Write($d) }
$bw.Flush()
$icoPath = Join-Path $outDir 'mercury.ico'
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose(); $ms.Dispose()

"icon written: $icoPath ($(($icoSizes -join ',')))"