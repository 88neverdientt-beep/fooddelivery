import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import vn.gaugaugau.fooddelivery.repository.PaymentMethodRepository;

/** App-account TCP/JPA/repository read only; never constructs an Order/Payment/Account. */
public final class MainPaymentMethodReadCheck {
    public static void main(String[] args) {
        try {
            ((ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME)).setLevel(ch.qos.logback.classic.Level.OFF);
            java.util.logging.LogManager.getLogManager().reset();
            if(args.length!=2 || !(args[0].equals("probe") || args[0].equals("cod")))throw new IllegalArgumentException();
            var input=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8));
            String user=new String(Base64.getDecoder().decode(input.readLine()),StandardCharsets.UTF_8);
            String password=new String(Base64.getDecoder().decode(input.readLine()),StandardCharsets.UTF_8);
            var source=MainJpaValidate.appReadOnlySource(user,password,args[1]);
            Class.forName("com.mysql.cj.jdbc.Driver");
            try(var c=source.getConnection()) {
                if(!c.isReadOnly())throw new IllegalStateException();
                try(var s=c.createStatement();var grants=s.executeQuery("SHOW GRANTS")) {
                    int count=0;while(grants.next())count++;
                    if(count!=2)throw new IllegalStateException();
                }
            }
            if(args[0].equals("probe")) {
                System.out.println("{\"status\":\"PASS\",\"mode\":\"probe\",\"account\":\"fooddelivery_app@127.0.0.1\",\"tcp\":true,\"tlsRequired\":true,\"jdbcReadOnly\":true,\"rootUsedAsBackend\":false}");return;
            }
            try(var factory=MainJpaValidate.configuration(source).buildSessionFactory();var em=factory.createEntityManager()) {
                if(factory.getMetamodel().getEntities().size()!=16)throw new IllegalStateException();
                var repository=new JpaRepositoryFactory(em).getRepository(PaymentMethodRepository.class);
                // Exact query method used by CustomerReadService to expose checkout choices.
                var choices=repository.findByIsActiveTrueAndPaymentMethodCodeOrderByPaymentMethodIdAsc("COD");
                if(choices.size()!=1)throw new IllegalStateException();
                var cod=choices.getFirst();
                // Exact lookup used by PaymentService.createPayment before any Order/Payment writer.
                var found=repository.findById(cod.getPaymentMethodId()).orElseThrow();
                if(!Boolean.TRUE.equals(found.getIsActive()) || !"COD".equals(found.getPaymentMethodCode())
                    || !"Thanh toán khi nhận hàng".equals(found.getPaymentMethodName()))throw new IllegalStateException();
                System.out.println("{\"status\":\"PASS\",\"mode\":\"cod\",\"account\":\"fooddelivery_app@127.0.0.1\",\"tcp\":true,\"tlsRequired\":true,\"jdbcReadOnly\":true,\"entitiesValidated\":16,\"activeCodChoices\":1,\"findByIdUsableByPaymentService\":true,\"checkoutCompleted\":false,\"businessEntitiesPersisted\":false,\"webServerStarted\":false}");
            }
        }catch(Throwable e) {
            System.out.println("{\"status\":\"FAIL\",\"errorType\":\""+e.getClass().getSimpleName()+"\",\"detailsWithheld\":true}");System.exit(1);
        }
    }
}
