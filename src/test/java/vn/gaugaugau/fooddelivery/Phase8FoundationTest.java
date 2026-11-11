package vn.gaugaugau.fooddelivery;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.MDC;
import vn.gaugaugau.fooddelivery.utils.VersionPreconditions;
import vn.gaugaugau.fooddelivery.config.RequestCorrelationFilter;
class Phase8FoundationTest {
 @Test void optionalLegacyRevisionRemainsCompatible(){assertDoesNotThrow(()->VersionPreconditions.check(null,5L,false));}
 @Test void strictMissingRevisionIs428(){assertEquals(428,assertThrows(ResponseStatusException.class,()->VersionPreconditions.check(null,5L,true)).getStatusCode().value());}
 @Test void staleAndInvalidRevisionsAreDistinct(){assertEquals(409,assertThrows(ResponseStatusException.class,()->VersionPreconditions.check(4L,5L,true)).getStatusCode().value());assertEquals(400,assertThrows(ResponseStatusException.class,()->VersionPreconditions.check(-1L,5L,true)).getStatusCode().value());assertDoesNotThrow(()->VersionPreconditions.check(5L,5L,true));}
 @Test void correlationAcceptsBoundedIdsAndCleansThreadContext()throws Exception{
  var req=new MockHttpServletRequest("GET","/private");req.addHeader("X-Request-ID","qa-08_123");var res=new MockHttpServletResponse();
  new RequestCorrelationFilter().doFilter(req,res,(a,b)->assertEquals("qa-08_123",MDC.get("requestId")));
  assertEquals("qa-08_123",res.getHeader("X-Request-ID"));assertNull(MDC.get("requestId"));
 }
 @Test void unsafeCorrelationIdIsReplacedAndPriorContextRestoredOnFailure(){
  var req=new MockHttpServletRequest("GET","/private");req.addHeader("X-Request-ID","bad\r\nInjected: value");var res=new MockHttpServletResponse();MDC.put("requestId","previous");
  try{assertThrows(jakarta.servlet.ServletException.class,()->new RequestCorrelationFilter().doFilter(req,res,(a,b)->{assertDoesNotThrow(()->java.util.UUID.fromString(MDC.get("requestId")));throw new jakarta.servlet.ServletException("Deliberate test");}));assertEquals("previous",MDC.get("requestId"));}
  finally{MDC.remove("requestId");}
 }
}
