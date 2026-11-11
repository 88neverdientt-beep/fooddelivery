package vn.gaugaugau.fooddelivery.utils;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Compare the form revision under a transaction lock, never a freshly fetched replacement. */
public final class VersionPreconditions {
 private VersionPreconditions(){}
 public static void check(Long expected,Long actual,boolean required){
  if(expected==null){if(required)throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,"A resource revision is required");return;}
  if(expected<0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid resource revision");
  if(!expected.equals(actual))throw new ResponseStatusException(HttpStatus.CONFLICT,"Resource changed; reload before saving");
 }
}
