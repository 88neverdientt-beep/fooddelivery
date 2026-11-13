package vn.gaugaugau.fooddelivery.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.io.*;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.*;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.RowCallbackHandler;
import vn.gaugaugau.fooddelivery.repository.BusinessReportRepository;

/** No DataSource: exercise the service/export/writer pipeline with a schema-permitted legacy aggregate. */
class DeliveryReportNullStatusTest {
    private static Map<String,Object> group(long id,Object delivered,Object cancelled,long assigned){
        var row=new LinkedHashMap<String,Object>();row.put("driverId",id);row.put("driverName","Driver "+id);row.put("assigned",assigned);row.put("delivered",delivered);row.put("cancelled",cancelled);return row;
    }
    private byte[] export(List<Map<String,Object>> groups,String...statuses)throws Exception {
        var repo=mock(BusinessReportRepository.class);
        long assigned=groups.stream().mapToLong(g->((Number)g.get("assigned")).longValue()).sum();
        long delivered=Arrays.stream(statuses).filter("DELIVERED"::equals).count();
        long cancelled=Arrays.stream(statuses).filter("CANCELLED"::equals).count();
        when(repo.summary(any())).thenReturn(new LinkedHashMap<>(Map.of("total",statuses.length,"assigned",assigned,"delivered",delivered,"cancelled",cancelled)));
        when(repo.exportDrivers(any())).thenReturn(groups);
        doAnswer(invocation->{RowCallbackHandler handler=invocation.getArgument(1);for(int i=0;i<statuses.length;i++){
            var rs=mock(ResultSet.class);when(rs.getObject("orderId")).thenReturn((long)i+1);when(rs.getObject("deliveryId")).thenReturn((long)i+11);when(rs.getObject("driverName")).thenReturn("Driver");when(rs.getObject("status")).thenReturn(statuses[i]);handler.processRow(rs);
        }return null;}).when(repo).stream(any(),any());
        var out=new ByteArrayOutputStream();new BusinessReportService(repo).export(true,Map.of("from","2026-11-01","to","2026-11-30"),out);return out.toByteArray();
    }
    @Test void nullOnlyDriverExportsWithoutDroppingDetailOrThrowing()throws Exception {
        var bytes=export(List.of(group(1,null,null,1)),(String)null);
        var files=BusinessReportTest.unzip(bytes);assertTrue(files.get("xl/workbook.xml").contains("name='TongHop'"));assertTrue(files.get("xl/workbook.xml").contains("name='ChiTiet'"));
        assertDetailRows(files,1);assertTrue(files.get("xl/worksheets/sheet2.xml").contains("Chưa xác định"));
    }
    @Test void mixedNullAndDeliveredKeepAssignedDenominator()throws Exception {
        var files=BusinessReportTest.unzip(export(List.of(group(1,1L,0L,2)),null,"DELIVERED"));assertDetailRows(files,2);
        assertTrue(files.get("xl/worksheets/sheet1.xml").contains("<v>0.50</v>"));assertTrue(files.get("xl/worksheets/sheet2.xml").contains("Chưa xác định"));
    }
    @Test void multipleDriversIncludingNullOnlyGroupKeepAllRows()throws Exception {
        var files=BusinessReportTest.unzip(export(List.of(group(1,null,null,2),group(2,1L,1L,2)),null,null,"DELIVERED","CANCELLED"));assertDetailRows(files,4);
        var summary=files.get("xl/worksheets/sheet1.xml");assertTrue(summary.contains("Driver 1"));assertTrue(summary.contains("Driver 2"));assertTrue(summary.contains("<v>0.25</v>"));
    }
    @Test void emptyExportHasTwoSheetsAndUnknownRate()throws Exception {
        var files=BusinessReportTest.unzip(export(List.of()));assertEquals(2,files.keySet().stream().filter(k->k.startsWith("xl/worksheets/sheet")).count());assertDetailRows(files,0);assertNull(BusinessReportService.rate(0,0));
    }
    @Test void validStatesRetainCountsRatesAndExistingStatusLabels()throws Exception {
        var files=BusinessReportTest.unzip(export(List.of(group(1,1L,1L,5)),"PENDING","PICKED_UP","DELIVERING","DELIVERED","CANCELLED"));assertDetailRows(files,5);assertTrue(files.get("xl/worksheets/sheet1.xml").contains("<v>0.20</v>"));assertFalse(files.get("xl/worksheets/sheet2.xml").contains("Chưa xác định"));
    }
    private static void assertDetailRows(Map<String,String> files,int count)throws Exception {
        var factory=DocumentBuilderFactory.newInstance();factory.setNamespaceAware(true);factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        for(var file:files.entrySet())if(file.getKey().endsWith(".xml"))factory.newDocumentBuilder().parse(new ByteArrayInputStream(file.getValue().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        var doc=factory.newDocumentBuilder().parse(new ByteArrayInputStream(files.get("xl/worksheets/sheet2.xml").getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        var rows=doc.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main","row");assertEquals(count+9,rows.getLength());
        var ids=new HashSet<String>();for(int i=8;i<rows.getLength()-1;i++){var first=(org.w3c.dom.Element)rows.item(i).getFirstChild();assertTrue(ids.add(first.getTextContent()),"Duplicate order row");}assertEquals(count,ids.size());
    }
}
