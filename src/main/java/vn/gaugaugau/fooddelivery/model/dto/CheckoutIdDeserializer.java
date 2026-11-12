package vn.gaugaugau.fooddelivery.model.dto;

/** Checkout/cart reference IDs must never be inferred by truncating a decimal token. */
public final class CheckoutIdDeserializer extends tools.jackson.databind.ValueDeserializer<Long> {
    @Override public Long deserialize(tools.jackson.core.JsonParser parser,tools.jackson.databind.DeserializationContext context)throws tools.jackson.core.JacksonException {
        if(parser.currentToken()==tools.jackson.core.JsonToken.VALUE_NUMBER_FLOAT)
            return context.reportInputMismatch(Long.class,"Mã tham chiếu phải là số nguyên");
        return context.readValue(parser,Long.class);
    }
}
