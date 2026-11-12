package vn.gaugaugau.fooddelivery.service;
import static org.junit.jupiter.api.Assertions.*;
import java.io.*;
import java.util.*;
import java.util.zip.*;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
class RestaurantWorkbookTest {
    static Map<String,String> parts(byte[] bytes)throws Exception {
        var result=new HashMap<String,String>();
        try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;while((entry=zip.getNextEntry())!=null) {
                byte[] xml=zip.readAllBytes();var parser=DocumentBuilderFactory.newInstance();parser.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);parser.setNamespaceAware(true);
                parser.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
                result.put(entry.getName(),new String(xml,java.nio.charset.StandardCharsets.UTF_8));
            }
        }return result;
    }
    @Test void emptyWorkbookStillHasHeadersStylesAndRelationships()throws Exception {
        var out=new ByteArrayOutputStream();try(var w=new RestaurantWorkbook(out)){w.complete();}
        var p=parts(out.toByteArray());assertEquals(6,p.size());assertTrue(p.get("xl/worksheets/sheet1.xml").contains("Tên nhà hàng"));assertFalse(p.get("xl/worksheets/sheet1.xml").contains("r='A2'"));
        assertTrue(p.get("xl/_rels/workbook.xml.rels").contains("worksheets/sheet1.xml"));
    }
    @Test void formulaPrefixesAndVietnameseStayLiteralWithoutSecretColumns()throws Exception {
        var out=new ByteArrayOutputStream();try(var w=new RestaurantWorkbook(out)) {
            w.row("9007199254740993","=HYPERLINK(\"https://invalid\")","+text","09000123","\t@x & <Hà Nội>","Mở cửa","12/11/2026 08:00:00","-5","Đang hoạt động");w.complete();
        }
        var p=parts(out.toByteArray());String xml=p.get("xl/worksheets/sheet1.xml");
        assertTrue(xml.contains("&amp; &lt;Hà Nội&gt;"));assertTrue(xml.contains("9007199254740993"));assertTrue(xml.contains("09000123"));assertFalse(xml.contains("<f>"));
        assertFalse(p.values().stream().anyMatch(s->s.contains("password")||s.contains("token")||s.contains("hyperlinks")));
        assertEquals(18,xml.split("t='inlineStr'",-1).length-1);
    }
    @Test void capacityStartsAnotherSheetWithoutDroppingRows()throws Exception {
        var out=new ByteArrayOutputStream();try(var w=new RestaurantWorkbook(out,2)){for(int i=1;i<=5;i++)w.row(""+i,"Bếp","a@test.example","0900","Hà Nội","Mở cửa","date","1","ACTIVE");w.complete();}
        var p=parts(out.toByteArray());assertTrue(p.containsKey("xl/worksheets/sheet3.xml"));assertTrue(p.get("xl/workbook.xml").contains("sheetId='3'"));
        assertTrue(p.get("xl/worksheets/sheet3.xml").contains(">5</t>"));
    }
    @Test void illegalXmlControlsAreRemovedButUnicodeAndTabsRemain() {
        assertEquals("Nhà\t\n&amp;&lt;&gt;",RestaurantWorkbook.xml("Nhà\u0000\u0001\t\n&<>"));
    }

    @Test void menuUsesSevenColumnsAndAnExactNumericPriceWithCurrencyStyle()throws Exception {
        var out=new ByteArrayOutputStream();try(var w=new RestaurantWorkbook(out,new String[]{"Mã","Catalog","Tên","Danh mục","Mô tả","Giá (VND)","Trạng thái"},"Thực đơn",5)) {
            w.row("1","2","=SUM(1,2)","Phở","Hà Nội & <nóng>","9999999999.99","Còn bán");w.complete();
        }
        var p=parts(out.toByteArray());String xml=p.get("xl/worksheets/sheet1.xml");
        assertTrue(xml.contains("<c r='F2' t='n' s='2'><v>9999999999.99</v>"));assertTrue(xml.contains("=SUM(1,2)"));assertFalse(xml.contains("<f>"));assertTrue(xml.contains("autoFilter ref='A1:G2'"));
        assertTrue(p.get("xl/styles.xml").contains("numFmtId='164'"));assertTrue(p.get("xl/styles.xml").contains("₫"));
    }
    @Test void menuNumericCellCannotContainFormulaOrInvalidPrice()throws Exception {
        for(String value:List.of("=1+1","10000000000","0.001","0","-1")) {
            var out=new ByteArrayOutputStream();try(var w=new RestaurantWorkbook(out,new String[]{"Tên","Giá"},"Thực đơn",1)) {
                assertThrows(IllegalArgumentException.class,()->w.row("Phở",value));
            }
        }
    }
    @Test void orderMoneyUsesThreeNumericColumnsIncludingZeroWithoutMultiplyingRows()throws Exception {
        var out=new ByteArrayOutputStream();try(var w=new RestaurantWorkbook(out,new String[]{"Mã","Ngày","Nhà hàng","Tên","Khách","Trạng thái","Tạm tính","Phí","Tổng","Thanh toán","Giao hàng"},"Đơn hàng",Set.of(6,7,8))){w.row("1","12/11/2026 01:02:03","2","=SUM(1,2)","3","Chờ xác nhận","0.00","15000.00","15000.00","Chờ thanh toán","Chưa tạo giao hàng");w.complete();}String xml=parts(out.toByteArray()).get("xl/worksheets/sheet1.xml");assertEquals(3,xml.split("t='n'",-1).length-1);assertTrue(xml.contains("<v>0.00</v>"));assertTrue(xml.contains("=SUM(1,2)"));assertFalse(xml.contains("<f>"));
    }
    @Test void missingHistoricalOrderAmountIsBlankInsteadOfInventedZero()throws Exception {
        var out=new ByteArrayOutputStream();try(var w=new RestaurantWorkbook(out,new String[]{"Mã","Ngày","Nhà hàng","Tên","Khách","Trạng thái","Tạm tính","Phí","Tổng","Thanh toán","Giao hàng"},"Đơn hàng",Set.of(6,7,8))){w.row("1","","2","Bếp","3","Chưa ghi nhận",null,"0.00",null,"","" );w.complete();}String xml=parts(out.toByteArray()).get("xl/worksheets/sheet1.xml");assertEquals(1,xml.split("t='n'",-1).length-1);assertTrue(xml.contains("r='G2' t='inlineStr'"));assertFalse(xml.contains("null"));
    }
}
