package vn.gaugaugau.fooddelivery.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import vn.gaugaugau.fooddelivery.auth.config.AuthProperties;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.repository.CustomerRepository;
// Keep Stage 1 schema validation unchanged until the auth migration is approved and applied.
@Configuration(proxyBeanMethods=false)
@EntityScan(basePackageClasses=Customer.class)
@EnableJpaRepositories(basePackageClasses=CustomerRepository.class)
@EnableConfigurationProperties(AuthProperties.class)
public class PersistenceConfiguration {}
