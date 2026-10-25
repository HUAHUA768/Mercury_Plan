# 生成水星计划的应用图标（多尺寸 ICO）
Add-Type -AssemblyName System.Drawing

$outDir = $PSScriptRoot
if (-not $outDir) { $outDir = 'E:\Mercury_Plan\assets' }
$sizes = @(16, 32, 48, 256)

function New-RoundedRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.ScaleTransform([float]($s / 256.0), [float]($s / 256.0))

  # 底板
  $tile = New-RoundedRect 8 8 240 240 54
  $tileRect = New-Object System.Drawing.Rectangle(8, 8, 240, 240)
  $tileBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $tileRect,
    [System.Drawing.Color]::FromArgb(255, 24, 30, 37),
    [System.Drawing.Color]::FromArgb(255, 9, 12, 15),
    90)
  $g.FillPath($tileBrush, $tile)
  $tilePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(26, 255, 255, 255), 2)
  $g.DrawPath($tilePen, $tile)

  # 星球外晕
  for ($i = 12; $i -ge 1; $i--) {
    $rad = 62 + $i * 4
    $glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(4, 233, 163, 60))
    $g.FillEllipse($glow, 120 - $rad, 116 - $rad, $rad * 2, $rad * 2)
    $glow.Dispose()
  }

  # 星球本体
  $planetRect = New-Object System.Drawing.Rectangle(58, 54, 124, 124)
  $planetBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $planetRect,
    [System.Drawing.Color]::FromArgb(255, 249, 220, 170),
    [System.Drawing.Color]::FromArgb(255, 183, 111, 22),
    55)
  $g.FillEllipse($planetBrush, $planetRect)

  # 轨道
  $g.TranslateTransform(120, 116)
  $g.RotateTransform(-22)
  $orbitPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(165, 242, 188, 107), 3.2)
  $g.DrawEllipse($orbitPen, -101, -31, 202, 62)
  $g.ResetTransform()

  # 轨道上的小星
  $angle = -22 * [Math]::PI / 180
  $mx = 120 + 101 * [Math]::Cos($angle)
  $my = 116 + 101 * [Math]::Sin($angle)
  $moonGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(46, 242, 188, 107))
  $g.FillEllipse($moonGlow, $mx - 13, $my - 13, 26, 26)
  $moon = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 213, 155))
  $g.FillEllipse($moon, $mx - 5.5, $my - 5.5, 11, 11)
  $moonGlow.Dispose(); $moon.Dispose()

  $bmp.Save((Join-Path $outDir "icon-$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  $tileBrush.Dispose(); $tilePen.Dispose(); $planetBrush.Dispose(); $orbitPen.Dispose(); $tile.Dispose()
}

# 打包为 ICO（PNG 压缩格式，支持 256）
$datas = @()
foreach ($s in $sizes) { $datas += , ([System.IO.File]::ReadAllBytes((Join-Path $outDir "icon-$s.png"))) }

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $sz = $sizes[$i]
  $dim = if ($sz -ge 256) { 0 } else { $sz }
  $bw.Write([Byte]$dim); $bw.Write([Byte]$dim)
  $bw.Write([Byte]0); $bw.Write([Byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32)
  $bw.Write([UInt32]$datas[$i].Length)
  $bw.Write([UInt32]$offset)
  $offset += $datas[$i].Length
}
foreach ($d in $datas) { $bw.Write($d) }
$bw.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $outDir 'mercury.ico'), $ms.ToArray())
$bw.Dispose(); $ms.Dispose()

"icon written: " + (Join-Path $outDir 'mercury.ico')
