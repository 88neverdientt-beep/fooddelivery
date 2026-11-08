package vn.gaugaugau.fooddelivery.model.dto;
public record PublicRestaurant(Long restaurantId,String name,String address,Boolean restaurantStatus) {
    public static PublicRestaurant from(RestaurantResponseDTO r){return new PublicRestaurant(r.getRestaurantId(),r.getName(),r.getAddress(),r.getRestaurantStatus());}
}
