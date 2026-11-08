package vn.gaugaugau.fooddelivery.model.dto;
public abstract class StrictRequest {
    @com.fasterxml.jackson.annotation.JsonAnySetter
    public void rejectUnknown(String key,Object value){throw new IllegalArgumentException("Unexpected request field");}
}
