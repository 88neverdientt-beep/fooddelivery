package vn.gaugaugau.fooddelivery.auth.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import vn.gaugaugau.fooddelivery.auth.model.Account;
import vn.gaugaugau.fooddelivery.auth.repository.AccountRepository;
@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(prefix="fooddelivery.auth",name="persistence-enabled",havingValue="true")
@EntityScan(basePackageClasses=Account.class)
@EnableJpaRepositories(basePackageClasses=AccountRepository.class)
public class AuthPersistenceConfiguration {}
