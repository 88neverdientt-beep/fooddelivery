package vn.gaugaugau.fooddelivery.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.io.*;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.time.*;
import java.util.*;
import java.util.zip.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class BusinessReportTest {
    @Test void validatesDatesAndInclusiveEnd(){var q=BusinessReportQuery.parse(false,Map.of("from","2026-01-01","to","2026-01-31"));assertEquals(LocalDateTime.of(2026,2,1,0,0),q.arguments().get(1));assertEquals(0,q.page());assertEquals(20,q.size());}
    @Test void rejectsBadDates(){for(var date:List.of("2026-02-30","2026-1-01","not-date",""))assertThrows(ResponseStatusException.class,()->BusinessReportQuery.parse(false,Map.of("from",date)));assertThrows(ResponseStatusException.class,()->BusinessReportQuery.parse(false,Map.of("from","2026-01-01","to","2026-12-31")));assertThrows(ResponseStatusException.class,()->BusinessReportQuery.parse(false,Map.of("from","2026-02-01","to","2026-01-01")));}
    @Test void rejectsInjectionAndUnknownFilters(){for(var p:List.of(Map.of("sort","order_id; DROP TABLE orders"),Map.of("restaurantId","1 OR 1=1"),Map.of("unexpected","true"),Map.of("driverId","1"),Map.of("status","FAILED")))assertThrows(ResponseStatusException.class,()->BusinessReportQuery.parse(false,p));}
    @Test void rejectsBadPagesAndIds(){for(var p:List.of(Map.of("page","-1"),Map.of("size","51"),Map.of("size","0"),Map.of("restaurantId","0"),Map.of("restaurantId","01"),Map.of("page","2147483648")))assertThrows(ResponseStatusException.class,()->BusinessReportQuery.parse(false,p));}
    @Test void bindsOnlyValuesAndCorrectProfile(){var q=BusinessReportQuery.parse(true,Map.of("status","DELIVERED","driverId","12","sort","oldest"));assertTrue(q.where().contains("d.driver_id=?"));assertFalse(q.where().contains("12"));assertEquals("d.delivery_id ASC",q.ordering());assertEquals(12L,q.arguments().get(3));}
    @Test void zeroDenominatorIsUnknown(){assertNull(BusinessReportService.rate(0,0));assertEquals(new BigDecimal("33.33"),BusinessReportService.rate(1,3));}
    @Test void exportRejectsOverLimitBeforeStreamingOrWriting()throws Exception {var repo=mock(vn.gaugaugau.fooddelivery.repository.BusinessReportRepository.class);when(repo.summary(any())).thenReturn(new LinkedHashMap<>(Map.of("total",10001L,"completed",0)));var output=new ByteArrayOutputStream();assertThrows(ResponseStatusException.class,()->new BusinessReportService(repo).export(false,Map.of(),output));assertEquals(0,output.size());verify(repo,never()).stream(any(),any());}
    @Test void driverPaginationIsIndependentAndBounded(){var q=BusinessReportQuery.parse(true,Map.of("page","2","driverPage","1","size","5"));assertEquals(2,q.page());assertEquals(1,q.driverPage());assertThrows(ResponseStatusException.class,()->BusinessReportQuery.parse(true,Map.of("driverPage","-1")));}
    @Test void supportsAllActualDeliveryStates(){for(var s:List.of("PENDING","PICKED_UP","DELIVERING","DELIVERED","CANCELLED"))assertEquals(s,BusinessReportQuery.parse(true,Map.of("status",s)).status());}
    @Test void workbookHasTwoSheetsAndLiteralUserText()throws Exception {
        var bytes=new ByteArrayOutputStream();var q=BusinessReportQuery.parse(false,Map.of());var rs=mock(ResultSet.class);
        when(rs.getObject("orderId")).thenReturn(10L);when(rs.getObject("customerName")).thenReturn("=HYPERLINK(\"bad\")");when(rs.getObject("restaurantName")).thenReturn("Món Việt & <Test>");when(rs.getObject("amount")).thenReturn(new BigDecimal("100000.50"));when(rs.getObject("shipping")).thenReturn(new BigDecimal("15000.00"));when(rs.getObject("status")).thenReturn("COMPLETED");
        try(var w=new BusinessReportWorkbook(bytes,q,Map.of("total",1,"completionRate",new BigDecimal("100.00")))){w.detail(rs);w.complete();}
        var entries=unzip(bytes.toByteArray());assertTrue(entries.get("xl/workbook.xml").contains("name='TongHop'"));assertTrue(entries.get("xl/workbook.xml").contains("name='ChiTiet'"));var detail=entries.get("xl/worksheets/sheet2.xml");assertTrue(detail.contains("HYPERLINK"));assertFalse(detail.contains("<f>"));assertTrue(detail.contains("Món Việt &amp; &lt;Test&gt;"));assertTrue(detail.contains("ySplit='8'"));assertTrue(detail.contains("100000.50"));assertTrue(entries.get("xl/worksheets/sheet1.xml").contains("t='n'><v>1.00</v>"));
    }
    @Test void emptyWorkbookIsValidTwoSheets()throws Exception {var b=new ByteArrayOutputStream();try(var w=new BusinessReportWorkbook(b,BusinessReportQuery.parse(true,Map.of()),Map.of("total",0))){w.complete();}assertTrue(unzip(b.toByteArray()).get("xl/worksheets/sheet2.xml").contains("Tổng dòng"));}
    static Map<String,String> unzip(byte[] bytes)throws Exception {var files=new HashMap<String,String>();try(var z=new ZipInputStream(new ByteArrayInputStream(bytes))){for(var e=z.getNextEntry();e!=null;e=z.getNextEntry())files.put(e.getName(),new String(z.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));}return files;}
}
