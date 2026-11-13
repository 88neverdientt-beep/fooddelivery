# Test-only native Excel validation: hidden, read-only, macros disabled; never saves workbooks.
$ErrorActionPreference='Stop'
$taskRoot='F:\New folder\fooddelivery-admin-reports-20261113'
$taskFiles=@('orders-0.xlsx','orders-4.xlsx','orders-5.xlsx','delivery-all.xlsx','delivery-empty.xlsx','delivery-filtered.xlsx','browser-orders.xlsx','browser-delivery.xlsx')
$excel=$null;$proof=@()
try {
 $excel=New-Object -ComObject Excel.Application
 $excel.Visible=$false;$excel.DisplayAlerts=$false;$excel.AutomationSecurity=3
 foreach($name in $taskFiles){
  $file=Join-Path $taskRoot $name;$before=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
  $book=$excel.Workbooks.Open($file,0,$true)
  try {
   if(-not $book.ReadOnly -or $book.FileFormat -ne 51 -or $book.Worksheets.Count -ne 2){throw 'Read-only XLSX/shape check failed'}
   if($book.Worksheets.Item(1).Name -ne 'TongHop' -or $book.Worksheets.Item(2).Name -ne 'ChiTiet'){throw 'Unexpected sheet names'}
   foreach($sheet in $book.Worksheets){
    if($sheet.Cells.Item(1,1).Value2 -ne 'FOOD DELIVERY' -or $sheet.UsedRange.HasFormula -ne $false -or $sheet.Hyperlinks.Count -ne 0){throw 'Unexpected metadata, formula or hyperlink'}
    $sheet.Activate();if(-not $excel.ActiveWindow.FreezePanes -or $excel.ActiveWindow.SplitRow -ne 8){throw 'Frozen header missing'}
    foreach($cell in $sheet.UsedRange.Cells){if($cell.Text -match '^#{3,}$'){throw 'Clipped numeric display detected'}}
   }
   $detail=$book.Worksheets.Item(2);$rows=$detail.UsedRange.Rows.Count-9
   if($rows -gt 0){
    if($name -like '*orders*'){
     if($detail.Cells.Item(9,4).Value2 -is [string] -or -not $detail.Cells.Item(9,4).NumberFormat.Contains('VND')){throw 'Currency cell type/format mismatch'}
     if($detail.Cells.Item(9,6).Value2 -is [string]){throw 'Order date must be numeric Excel date'}
    }
   }
   $proof+=@{file=$name;openedInMicrosoftExcel=$true;version=$excel.Version;readOnly=$true;dataRows=$rows;sheets=2;noFormula=$true;freezeHeader=$true}
  }finally{$book.Close($false);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($book)}
  if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $before){throw 'Workbook was modified'}
 }
 $proof | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskRoot 'native-excel-results.json') -Encoding UTF8
 Write-Output 'Microsoft Excel: 8/8 report workbooks opened read-only; two sheets, typed money/date, no formulas, frozen header and original bytes verified.'
}finally{if($excel){$excel.Quit();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)}}
