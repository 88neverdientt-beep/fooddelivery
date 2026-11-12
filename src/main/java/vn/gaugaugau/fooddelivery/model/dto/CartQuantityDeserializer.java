package vn.gaugaugau.fooddelivery.model.dto;

/** Preserve existing integer binding, but never truncate decimal JSON quantities. */
public final class CartQuantityDeserializer extends tools.jackson.databind.ValueDeserializer<Integer> {
    @Override public Integer deserialize(tools.jackson.core.JsonParser parser,tools.jackson.databind.DeserializationContext context)throws tools.jackson.core.JacksonException {
        if(parser.currentToken()==tools.jackson.core.JsonToken.VALUE_NUMBER_FLOAT)
            return context.reportInputMismatch(Integer.class,"Số lượng phải là số nguyên");
        return context.readValue(parser,Integer.class);
    }
}
