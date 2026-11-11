package vn.gaugaugau.fooddelivery.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Correlation metadata only: no URL/query/body/cookie/Authorization or credentials are logged. */
@Component @Order(Ordered.HIGHEST_PRECEDENCE+10)
public class RequestCorrelationFilter extends OncePerRequestFilter {
 private static final Logger requests=LoggerFactory.getLogger(RequestCorrelationFilter.class);
 @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException {
  String supplied=request.getHeader("X-Request-ID");
  String id=supplied!=null && supplied.matches("[A-Za-z0-9_-]{1,64}")?supplied:UUID.randomUUID().toString();
  String previous=MDC.get("requestId");long started=System.nanoTime();boolean failed=false;
  MDC.put("requestId",id);response.setHeader("X-Request-ID",id);
  try{chain.doFilter(request,response);}
  catch(ServletException|IOException|RuntimeException e){failed=true;throw e;}
  finally{
   requests.atInfo().addKeyValue("method",request.getMethod())
    .addKeyValue("status",failed?500:response.getStatus()).addKeyValue("durationMs",(System.nanoTime()-started)/1000000L).log("HTTP request completed");
   if(previous==null)MDC.remove("requestId");else MDC.put("requestId",previous);
  }
 }
}
