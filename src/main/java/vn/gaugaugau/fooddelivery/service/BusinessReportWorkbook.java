package vn.gaugaugau.fooddelivery.service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.zip.*;

/** Two-sheet streaming OOXML; all user text is inlineStr, never formulas. */
public final class BusinessReportWorkbook implements AutoCloseable {
    private final ZipOutputStream zip;
    private final BusinessReportQuery query;
    private int row;
    private final int columns;
    private final String title;
    private final String[] fields;
    public BusinessReportWorkbook(OutputStream output,BusinessReportQuery q,Map<String,Object> summary)throws IOException {
        this(output,q,summary,List.of());
    }
    public BusinessReportWorkbook(OutputStream output,BusinessReportQuery q,Map<String,Object> summary,List<Map<String,Object>> drivers)throws IOException {
        zip=new ZipOutputStream(output,StandardCharsets.UTF_8);query=q;
        title=q.delivery()?"BÁO CÁO HIỆU SUẤT GIAO HÀNG":"BÁO CÁO DOANH THU VÀ ĐƠN HÀNG";
        fields=q.delivery()?new String[]{"orderId","deliveryId","driverName","pickupTime","deliveredTime","status","durationSeconds"}:new String[]{"orderId","customerName","restaurantName","amount","shipping","createdAt","status","paymentStatus"};columns=fields.length;
        start(1);metadata();cells(new Object[]{"Chỉ tiêu","Giá trị"},1);
        var labels=Map.ofEntries(Map.entry("total","Tổng dòng theo bộ lọc"),Map.entry("completed","Đơn hoàn thành"),Map.entry("cancelled","Đã hủy"),Map.entry("amount","Giá trị hoàn thành đã thanh toán hợp lệ (VND)"),Map.entry("subtotal","Giá trị món trong tập hợp lệ (VND)"),Map.entry("shipping","Phí giao trong tập hợp lệ (VND)"),Map.entry("paidCount","Số đơn thanh toán hợp lệ"),Map.entry("assigned","Chuyến có tài xế hiện tại"),Map.entry("delivered","Chuyến giao thành công có tài xế"),Map.entry("averageSeconds","Trung bình lấy món→giao (giây)"),Map.entry("validDurationCount","Chuyến đủ mốc thời gian"),Map.entry("completionRate","Tỷ lệ hoàn thành"),Map.entry("successRate","Tỷ lệ giao thành công / đã phân công"));
        for(var e:summary.entrySet())cells(new Object[]{labels.getOrDefault(e.getKey(),e.getKey()),e.getValue()},e.getKey().endsWith("Rate")?5:Set.of("amount","subtotal","shipping").contains(e.getKey())?3:0);
        cells(new Object[]{"Ghi chú","Cohort theo ngày tạo đơn; trạng thái hiện tại. Không phải lợi nhuận hoặc tiền đối soát."},0);
        if(q.delivery()){cells(new Object[]{"Giao thất bại","Không có trạng thái FAILED; hủy được báo riêng."},0);cells(new Object[]{"Thời gian nhận phân công","Không lưu; pickup là lấy món, không phải nhận phân công."},0);}
        if(q.delivery()){
            cells(new Object[]{"Hiệu suất theo tài xế","Toàn bộ nhóm theo bộ lọc, không giới hạn trang UI"},1);
            cells(new Object[]{"Mã tài xế","Tài xế","Đã phân công","Đã giao","Đã hủy","Tỷ lệ giao / phân công (%)"},1);
            // Legacy SUM predicates may be null when no status is known. Matching counts are zero;
            // the underlying delivery status and assigned denominator remain unchanged.
            for(var d:drivers){
                Object delivered=Objects.requireNonNullElse(d.get("delivered"),0L);
                Object cancelled=Objects.requireNonNullElse(d.get("cancelled"),0L);
                cells(new Object[]{String.valueOf(d.get("driverId")),d.get("driverName"),d.get("assigned"),delivered,cancelled,BusinessReportService.rate(delivered,d.get("assigned"))},0);
            }
        }
        end(false);start(2);metadata();
        cells(q.delivery()?new Object[]{"Mã đơn","Mã chuyến","Tài xế","Lấy món","Giao thành công","Trạng thái","Thời lượng (giây)"}:new Object[]{"Mã đơn","Khách hàng","Nhà hàng","Giá trị đơn (VND)","Phí giao (VND)","Ngày đặt","Trạng thái đơn","Thanh toán"},1);
    }
    private java.math.BigDecimal detailAmount=java.math.BigDecimal.ZERO,detailShipping=java.math.BigDecimal.ZERO;
    private long detailCount;
    private void metadata()throws IOException {
        cells(new Object[]{"FOOD DELIVERY",title},1);
        cells(new Object[]{"Kỳ theo ngày tạo đơn",query.from()+" đến "+query.to()+" (bao gồm hai đầu)"},0);
        cells(new Object[]{"Ngày lập / múi giờ",LocalDateTime.now()+" / "+ZoneId.systemDefault()},0);
        cells(new Object[]{"Người lập",query.delivery()?"Quản trị viên phụ trách vận hành (ADMIN)":"Quản trị viên hệ thống (ADMIN)"},0);
        cells(new Object[]{"Người nhận",query.delivery()?"Trưởng bộ phận vận hành":"Ban điều hành / Quản lý kinh doanh"},0);
        cells(new Object[]{"Bộ lọc","status="+(query.status().isEmpty()?"Tất cả":query.status())+"; "+(query.delivery()?"driverId":"restaurantId")+"="+(query.profileId()==null?"Tất cả":query.profileId())+"; sort="+query.sort()},0);
        cells(new Object[]{"Phạm vi","Toàn bộ kết quả theo bộ lọc, không giới hạn trang UI; tối đa 10.000 dòng."},0);
    }
    public void detail(ResultSet rs)throws SQLException,IOException {
        Object[] values=new Object[fields.length];for(int i=0;i<fields.length;i++){
            Object value=rs.getObject(fields[i]);
            if(fields[i].endsWith("Id"))value=value==null?null:value.toString();
            if(value instanceof Timestamp t)value=t.toLocalDateTime();
            if(fields[i].equals("status"))value=query.delivery()&&value==null?"Chưa xác định":OrderExcelExportService.status(query.delivery()?"delivery":"order",(String)value);
            if(fields[i].equals("paymentStatus"))value=OrderExcelExportService.status("payment",(String)value);
            values[i]=value;
        }
        if(!query.delivery()){if(values[3]!=null)detailAmount=detailAmount.add(new java.math.BigDecimal(values[3].toString()));if(values[4]!=null)detailShipping=detailShipping.add(new java.math.BigDecimal(values[4].toString()));}
        detailCount++;cells(values,0);
    }
    private void start(int number)throws IOException {row=0;zip.putNextEntry(new ZipEntry("xl/worksheets/sheet"+number+".xml"));text("<worksheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'><sheetViews><sheetView workbookViewId='0'><pane ySplit='8' topLeftCell='A9' activePane='bottomLeft' state='frozen'/></sheetView></sheetViews><cols><col min='1' max='1' width='"+(number==1?58:24)+"' customWidth='1'/><col min='2' max='2' width='"+(number==1?90:62)+"' customWidth='1'/><col min='3' max='8' width='28' customWidth='1'/></cols><sheetData>");}
    private void cells(Object[] values,int style)throws IOException {
        row++;text("<row r='"+row+"' ht='34' customHeight='1'>");for(int i=0;i<values.length;i++){
            var v=values[i];String ref=""+(char)('A'+i)+row;
            if(v instanceof Number){int s=style==5?5:style==3?3:(!query.delivery()&&row>8&&values.length>=5&&(i==3||i==4)?3:2);String number=style==5?new java.math.BigDecimal(v.toString()).divide(java.math.BigDecimal.valueOf(100)).toPlainString():v.toString();text("<c r='"+ref+"' s='"+s+"' t='n'><v>"+number+"</v></c>");}
            else if(v instanceof LocalDateTime t){double serial=java.time.temporal.ChronoUnit.DAYS.between(LocalDate.of(1899,12,30),t.toLocalDate())+t.toLocalTime().toNanoOfDay()/86400000000000.0;text("<c r='"+ref+"' s='4' t='n'><v>"+serial+"</v></c>");}
            else text("<c r='"+ref+"' s='"+(style==1?1:0)+"' t='inlineStr'><is><t xml:space='preserve'>"+RestaurantWorkbook.xml(v==null?"Không có dữ liệu":v.toString())+"</t></is></c>");
        }text("</row>");
    }
    private void end(boolean detail)throws IOException {text("</sheetData>"+(detail?"<autoFilter ref='A8:"+(char)('A'+columns-1)+(row-1)+"'/>":"")+"</worksheet>");zip.closeEntry();}
    private void text(String text)throws IOException {zip.write(text.getBytes(StandardCharsets.UTF_8));}
    private void entry(String name,String value)throws IOException {zip.putNextEntry(new ZipEntry(name));text(value);zip.closeEntry();}
    public void complete()throws IOException {
        cells(query.delivery()?new Object[]{"Tổng dòng",detailCount}:new Object[]{"Tổng chi tiết (gồm mọi trạng thái đã lọc)",detailCount,"",detailAmount,detailShipping},1);end(true);
        entry("xl/workbook.xml","<workbook xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'><sheets><sheet name='TongHop' sheetId='1' r:id='rId1'/><sheet name='ChiTiet' sheetId='2' r:id='rId2'/></sheets></workbook>");
        entry("_rels/.rels","<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='workbook' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='xl/workbook.xml'/></Relationships>");
        entry("xl/_rels/workbook.xml.rels","<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' Target='worksheets/sheet1.xml'/><Relationship Id='rId2' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' Target='worksheets/sheet2.xml'/><Relationship Id='styles' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles' Target='styles.xml'/></Relationships>");
        entry("[Content_Types].xml","<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/><Override PartName='/xl/workbook.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'/><Override PartName='/xl/styles.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'/><Override PartName='/xl/worksheets/sheet1.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'/><Override PartName='/xl/worksheets/sheet2.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'/></Types>");
        entry("xl/styles.xml","<styleSheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'><numFmts count='2'><numFmt numFmtId='164' formatCode='#,##0.00 &quot;VND&quot;'/><numFmt numFmtId='165' formatCode='dd/mm/yyyy hh:mm:ss'/></numFmts><fonts count='2'><font><sz val='11'/><name val='Calibri'/></font><font><b/><sz val='11'/><name val='Calibri'/></font></fonts><fills count='2'><fill><patternFill patternType='none'/></fill><fill><patternFill patternType='gray125'/></fill></fills><borders count='2'><border/><border><left style='thin'/><right style='thin'/><top style='thin'/><bottom style='thin'/></border></borders><cellStyleXfs count='1'><xf/></cellStyleXfs><cellXfs count='6'><xf numFmtId='49' fontId='0' borderId='1' applyAlignment='1'><alignment wrapText='1' vertical='top'/></xf><xf numFmtId='49' fontId='1' borderId='1' applyFont='1' applyAlignment='1'><alignment wrapText='1'/></xf><xf numFmtId='2' borderId='1' applyNumberFormat='1'/><xf numFmtId='164' borderId='1' applyNumberFormat='1'/><xf numFmtId='165' borderId='1' applyNumberFormat='1'/><xf numFmtId='10' borderId='1' applyNumberFormat='1'/></cellXfs><cellStyles count='1'><cellStyle name='Normal' xfId='0' builtinId='0'/></cellStyles></styleSheet>");zip.finish();
    }
    @Override public void close()throws IOException {zip.close();}
}
