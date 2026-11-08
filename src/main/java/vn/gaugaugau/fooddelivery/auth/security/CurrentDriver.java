package vn.gaugaugau.fooddelivery.auth.security;
@org.springframework.stereotype.Component("currentDriver")
public class CurrentDriver {public Long id(){return CurrentActor.get().driverId();}}
