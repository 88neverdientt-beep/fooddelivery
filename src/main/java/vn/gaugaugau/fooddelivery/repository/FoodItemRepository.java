package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.FoodItem;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    @org.springframework.data.jpa.repository.Query(value = """
        select distinct trim(f.category) from FoodItem f
        where f.category is not null and trim(f.category) <> ''
        order by trim(f.category)
        """, countQuery = """
        select count(distinct trim(f.category)) from FoodItem f
        where f.category is not null and trim(f.category) <> ''
        """)
    org.springframework.data.domain.Page<String> findPublicCategories(org.springframework.data.domain.Pageable pageable);


	boolean existsByName(String name);

	boolean existsByNameAndItemIdNot(String name, Long itemId);
}
