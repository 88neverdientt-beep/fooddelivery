package vn.gaugaugau.fooddelivery.service;

import java.io.*;
import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import vn.gaugaugau.fooddelivery.repository.BusinessReportRepository;
import vn.gaugaugau.fooddelivery.model.dto.PageResponse;

@Service @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class BusinessReportService {
    private final BusinessReportRepository repository;
    public record Report(BusinessReportQuery filters,String timeZone,LocalDateTime generatedAt,Map<String,Object> summary,List<Map<String,Object>> series,PageResponse<Map<String,Object>> details,PageResponse<Map<String,Object>> drivers){}
    public static BigDecimal rate(Object numerator,Object denominator){var n=new BigDecimal(numerator.toString());var d=new BigDecimal(denominator.toString());return d.signum()==0?null:n.multiply(BigDecimal.valueOf(100)).divide(d,2,RoundingMode.HALF_UP);}
    private Map<String,Object> summary(BusinessReportQuery q){var s=repository.summary(q);if(q.delivery())s.put("successRate",rate(s.get("delivered"),s.get("assigned")));else s.put("completionRate",rate(s.get("completed"),s.get("total")));return s;}
    public Report read(boolean delivery,Map<String,String> parameters){
        var q=BusinessReportQuery.parse(delivery,parameters);var s=summary(q);long total=((Number)s.get("total")).longValue();
        long drivers=delivery?repository.driverCount(q):0;
        return new Report(q,ZoneId.systemDefault().getId(),LocalDateTime.now(),s,delivery?List.of():repository.series(q),page(repository.details(q),q,total),new PageResponse<>(delivery?repository.drivers(q):List.of(),q.driverPage(),q.size(),drivers,(int)((drivers+q.size()-1)/q.size())));
    }
    private PageResponse<Map<String,Object>> page(List<Map<String,Object>> rows,BusinessReportQuery q,long count){return new PageResponse<>(rows,q.page(),q.size(),count,(int)Math.min(Integer.MAX_VALUE,(count+q.size()-1)/q.size()));}
    public void export(boolean delivery,Map<String,String> parameters,OutputStream output)throws IOException {
        var q=BusinessReportQuery.parse(delivery,parameters);var s=summary(q);
        if(((Number)s.get("total")).longValue()>10000)throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"Báo cáo vượt 10.000 dòng; hãy thu hẹp bộ lọc.");
        try(var workbook=new BusinessReportWorkbook(output,q,s,delivery?repository.exportDrivers(q):List.of())){
            int[] count={0};repository.stream(q,rs->{if(++count[0]>10000)throw new IllegalStateException("Export limit exceeded");try{workbook.detail(rs);}catch(IOException e){throw new UncheckedIOException(e);}});workbook.complete();
        }catch(UncheckedIOException e){throw e.getCause();}
    }
}
