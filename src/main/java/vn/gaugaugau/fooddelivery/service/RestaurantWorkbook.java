package vn.gaugaugau.fooddelivery.service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.*;

/** ECMA-376 XLSX with explicit literal inline strings, no formula or shared-string table. */
public final class RestaurantWorkbook implements AutoCloseable {
    private static final String NS="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static final String REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static final String[] HEADERS={"Mã nhà hàng","Tên nhà hàng","Email đăng nhập","Số điện thoại","Địa chỉ","Hoạt động","Ngày tạo","Mã tài khoản","Trạng thái tài khoản"};
    private final ZipOutputStream zip;
    private final int capacity;
    private final String[] headers;
    private final String sheetName;
    private final java.util.Set<Integer> numericColumns;
    private final boolean positiveOnly;
    private int sheet,row;
    private boolean complete;
    public RestaurantWorkbook(OutputStream output)throws IOException {this(output,1_048_575);}
    RestaurantWorkbook(OutputStream output,int capacity)throws IOException {this(output,capacity,HEADERS,"Nhà hàng",-1);}
    public RestaurantWorkbook(OutputStream output,String[] headers,String sheetName,int numericColumn)throws IOException {
        this(output,1_048_575,headers,sheetName,numericColumn);
    }
    private RestaurantWorkbook(OutputStream output,int capacity,String[] headers,String sheetName,int numericColumn)throws IOException {
        this(output,capacity,headers,sheetName,numericColumn<0?java.util.Set.of():java.util.Set.of(numericColumn),true);
    }
    public RestaurantWorkbook(OutputStream output,String[] headers,String sheetName,java.util.Set<Integer> numericColumns)throws IOException {
        this(output,1_048_575,headers,sheetName,numericColumns,false);
    }
    private RestaurantWorkbook(OutputStream output,int capacity,String[] headers,String sheetName,java.util.Set<Integer> numericColumns,boolean positiveOnly)throws IOException {
        if(headers.length<1||headers.length>26||numericColumns.stream().anyMatch(i->i<0||i>=headers.length)||!sheetName.matches("[\\p{L} ]{1,20}"))throw new IllegalArgumentException("Invalid workbook layout");
        this.headers=headers.clone();this.sheetName=sheetName;this.numericColumns=java.util.Set.copyOf(numericColumns);this.positiveOnly=positiveOnly;
        if(capacity<1||capacity>1_048_575)throw new IllegalArgumentException("Invalid capacity");
        this.capacity=capacity;zip=new ZipOutputStream(output,StandardCharsets.UTF_8);startSheet();
    }
    private void text(String s)throws IOException {zip.write(s.getBytes(StandardCharsets.UTF_8));}
    private void entry(String name,String s)throws IOException {zip.putNextEntry(new ZipEntry(name));text(s);zip.closeEntry();}
    private void startSheet()throws IOException {
        sheet++;row=0;zip.putNextEntry(new ZipEntry("xl/worksheets/sheet"+sheet+".xml"));
        text("<?xml version='1.0' encoding='UTF-8'?><worksheet xmlns='"+NS+"'><sheetViews><sheetView workbookViewId='0'><pane ySplit='1' topLeftCell='A2' activePane='bottomLeft' state='frozen'/></sheetView></sheetViews><cols><col min='1' max='1' width='19' customWidth='1'/><col min='2' max='5' width='34' customWidth='1'/><col min='6' max='"+headers.length+"' width='25' customWidth='1'/></cols><sheetData>");cells(headers,true);
    }
    public void row(String...values)throws IOException {
        if(complete)throw new IllegalStateException("Workbook already completed");
        if(values.length!=headers.length)throw new IllegalArgumentException("Unexpected columns");
        if(row>capacity){endSheet();startSheet();}cells(values,false);
    }
    private void cells(String[] values,boolean header)throws IOException {
        row++;text("<row r='"+row+"'"+(header?" ht='32' customHeight='1'":"")+">");
        for(int i=0;i<values.length;i++) {
            String reference=""+(char)('A'+i)+row;
            if(!header&&numericColumns.contains(i)&&(positiveOnly||values[i]!=null)) {
                var number=new java.math.BigDecimal(values[i]);
                if(number.scale()>2||(positiveOnly?number.signum()<=0:number.signum()<0)||number.compareTo(new java.math.BigDecimal("9999999999.99"))>0)throw new IllegalArgumentException("Invalid monetary value");
                text("<c r='"+reference+"' t='n' s='2'><v>"+number.toPlainString()+"</v></c>");
            } else text("<c r='"+reference+"' t='inlineStr' s='"+(header?1:0)+"'><is><t xml:space='preserve'>"+xml(values[i])+"</t></is></c>");
        }
        text("</row>");
    }
    private void endSheet()throws IOException {text("</sheetData><autoFilter ref='A1:"+(char)('A'+headers.length-1)+row+"'/></worksheet>");zip.closeEntry();}
    // =,+,-,@ and whitespace-prefixed expressions remain literal text; IDs/phone preserve precision/zeros.
    static String xml(String value) {
        if(value==null)return "";var out=new StringBuilder();
        value.codePoints().filter(c->c==9||c==10||c==13||(c>=32&&c<=0xD7FF)||(c>=0xE000&&c<=0xFFFD)||(c>=0x10000&&c<=0x10FFFF)).forEach(c->{
            switch(c){case '&'->out.append("&amp;");case '<'->out.append("&lt;");case '>'->out.append("&gt;");default->out.appendCodePoint(c);}
        });return out.toString();
    }
    public void complete()throws IOException {
        if(complete)throw new IllegalStateException("Workbook already completed");endSheet();
        var sheets=new StringBuilder();var rels=new StringBuilder();var types=new StringBuilder();
        for(int i=1;i<=sheet;i++) {
            sheets.append("<sheet name='").append(sheetName).append(" ").append(i).append("' sheetId='").append(i).append("' r:id='rId").append(i).append("'/>");
            rels.append("<Relationship Id='rId").append(i).append("' Type='").append(REL).append("/worksheet' Target='worksheets/sheet").append(i).append(".xml'/>");
            types.append("<Override PartName='/xl/worksheets/sheet").append(i).append(".xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'/>");
        }
        entry("xl/workbook.xml","<workbook xmlns='"+NS+"' xmlns:r='"+REL+"'><sheets>"+sheets+"</sheets></workbook>");
        entry("xl/_rels/workbook.xml.rels","<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>"+rels+"<Relationship Id='styles' Type='"+REL+"/styles' Target='styles.xml'/></Relationships>");
        entry("_rels/.rels","<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='workbook' Type='"+REL+"/officeDocument' Target='xl/workbook.xml'/></Relationships>");
        entry("[Content_Types].xml","<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/><Override PartName='/xl/workbook.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'/><Override PartName='/xl/styles.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'/>"+types+"</Types>");
        entry("xl/styles.xml","<styleSheet xmlns='"+NS+"'>"+(numericColumns.isEmpty()?"":"<numFmts count='1'><numFmt numFmtId='164' formatCode='#,##0.00&amp;quot; ₫&amp;quot;'/></numFmts>".replace("&amp;quot;","&quot;"))+"<fonts count='2'><font><sz val='11'/><name val='Calibri'/></font><font><b/><sz val='11'/><name val='Calibri'/></font></fonts><fills count='2'><fill><patternFill patternType='none'/></fill><fill><patternFill patternType='gray125'/></fill></fills><borders count='1'><border/></borders><cellStyleXfs count='1'><xf numFmtId='0' fontId='0' fillId='0' borderId='0'/></cellStyleXfs><cellXfs count='"+(numericColumns.isEmpty()?2:3)+"'><xf numFmtId='49' fontId='0' fillId='0' borderId='0' xfId='0' applyNumberFormat='1' applyAlignment='1'><alignment vertical='top' wrapText='1'/></xf><xf numFmtId='49' fontId='1' fillId='0' borderId='0' xfId='0' applyFont='1' applyAlignment='1'><alignment wrapText='1'/></xf>"+(numericColumns.isEmpty()?"":"<xf numFmtId='164' fontId='0' fillId='0' borderId='0' xfId='0' applyNumberFormat='1'/>")+"</cellXfs><cellStyles count='1'><cellStyle name='Normal' xfId='0' builtinId='0'/></cellStyles></styleSheet>");
        zip.finish();complete=true;
    }
    @Override public void close()throws IOException {zip.close();}
}
