import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;
import java.util.logging.Logger;
import javax.sql.DataSource;
import org.hibernate.cfg.Configuration;

/** Explicit Hibernate/JPA metadata validation only; no Spring, web server or entities persisted. */
public final class MainJpaValidate {
    private static final String URL="jdbc:mysql://127.0.0.1:3306/fooddelivery?sslMode=REQUIRED&allowMultiQueries=false&connectTimeout=5000";
    private static final String[] ENTITIES={"model.Customer","model.Restaurant","model.Driver","model.FoodItem",
        "model.RestaurantFoodItem","model.Cart","model.CartItem","model.Order","model.OrderDetail",
        "model.Delivery","model.Payment","model.PaymentMethod","model.Rating",
        "auth.model.Account","auth.model.AuthSession","auth.model.RefreshToken"};

    private static Object invoke(Object target,Method method,Object[] args) throws Throwable {
        try {return method.invoke(target,args);} catch(InvocationTargetException e){throw e.getCause();}
    }
    private static void readSql(String sql) throws SQLException {
        String cleaned=sql.replaceAll("(?s)/\\*.*?\\*/","").strip();
        for(String part:cleaned.split(";")) {
            if(!part.isBlank() && !part.stripLeading().matches("(?is)^(SELECT|SHOW|EXPLAIN|WITH)\\b.*"))
                throw new SQLException("Validator forbids non-read SQL");
        }
        if(cleaned.matches("(?is).*\\bINTO\\s+(OUTFILE|DUMPFILE)\\b.*"))throw new SQLException("File output forbidden");
    }
    private static Statement statement(Statement raw,Connection connection,boolean prepared) {
        Class<?> type=prepared?PreparedStatement.class:Statement.class;
        return (Statement)Proxy.newProxyInstance(MainJpaValidate.class.getClassLoader(),new Class<?>[]{type},(p,m,a)->{
            String name=m.getName();
            if(name.equals("getConnection"))return connection;
            if(name.equals("unwrap"))throw new SQLException("Unwrap forbidden");
            if(name.equals("isWrapperFor"))return false;
            if(name.equals("addBatch") || name.equals("executeBatch") || name.equals("executeLargeBatch") || name.startsWith("executeUpdate") || name.startsWith("executeLargeUpdate"))
                throw new SQLException("Writes/batches forbidden");
            if(name.startsWith("execute") && a!=null && a.length>0 && a[0] instanceof String sql)readSql(sql);
            return invoke(raw,m,a);
        });
    }
    private static Connection readOnly(Connection raw) throws SQLException {
        raw.setReadOnly(true);
        final Connection[] proxy=new Connection[1];
        proxy[0]=(Connection)Proxy.newProxyInstance(MainJpaValidate.class.getClassLoader(),new Class<?>[]{Connection.class},(p,m,a)->{
            String name=m.getName();
            if(name.equals("unwrap"))throw new SQLException("Unwrap forbidden");
            if(name.equals("isWrapperFor"))return false;
            if(name.equals("setReadOnly") && Boolean.FALSE.equals(a[0]))throw new SQLException("Read-only state cannot be disabled");
            if(name.equals("setCatalog") && !"fooddelivery".equals(a[0]))throw new SQLException("Unexpected catalog");
            if(name.equals("prepareCall"))throw new SQLException("Callable statements forbidden");
            if(name.equals("prepareStatement")) {readSql((String)a[0]);return statement((Statement)invoke(raw,m,a),proxy[0],true);}
            if(name.equals("createStatement"))return statement((Statement)invoke(raw,m,a),proxy[0],false);
            if(name.equals("getMetaData")) {
                var metadata=raw.getMetaData();
                return Proxy.newProxyInstance(MainJpaValidate.class.getClassLoader(),new Class<?>[]{DatabaseMetaData.class},(mp,mm,ma)->{
                    if(mm.getName().equals("getConnection"))return proxy[0];
                    if(mm.getName().equals("unwrap"))throw new SQLException("Unwrap forbidden");
                    if(mm.getName().equals("isWrapperFor"))return false;
                    return invoke(metadata,mm,ma);
                });
            }
            return invoke(raw,m,a);
        });
        return proxy[0];
    }
    private static final class ReadOnlySource implements DataSource {
        private final String user,password,uuid,expectedAccount;
        ReadOnlySource(String u,String p,String id){this(u,p,id,"root@localhost");}
        ReadOnlySource(String u,String p,String id,String actor){user=u;password=p;uuid=id;expectedAccount=actor;}
        public Connection getConnection() throws SQLException {
            Connection c=readOnly(DriverManager.getConnection(URL,user,password));
            try(var s=c.createStatement();var r=s.executeQuery("SELECT @@port,@@version,@@server_uuid,DATABASE(),CURRENT_USER()")) {
                if(!r.next() || r.getInt(1)!=3306 || !r.getString(2).equals("8.0.46") || !r.getString(3).equals(uuid)
                    || !r.getString(4).equals("fooddelivery") || !r.getString(5).equals(expectedAccount)) {
                    c.close();throw new SQLException("Unexpected JDBC target");
                }
            }
            return c;
        }
        public Connection getConnection(String u,String p)throws SQLException{throw new SQLException("Credential override forbidden");}
        public PrintWriter getLogWriter(){return null;}
        public void setLogWriter(PrintWriter writer)throws SQLException{if(writer!=null)throw new SQLException("Logging forbidden");}
        public void setLoginTimeout(int seconds){}
        public int getLoginTimeout(){return 5;}
        public Logger getParentLogger(){return Logger.getLogger("MainJpaValidate");}
        public <T>T unwrap(Class<T> t)throws SQLException{throw new SQLException("Unwrap forbidden");}
        public boolean isWrapperFor(Class<?> t){return false;}
        public String toString(){return "ReadOnlyLoginPathDataSource";}
    }
    public static DataSource appReadOnlySource(String user,String password,String uuid) {
        if(!"fooddelivery_app".equals(user))throw new IllegalArgumentException("App identity required");
        return new ReadOnlySource(user,password,uuid,"fooddelivery_app@127.0.0.1");
    }
    public static Configuration configuration(DataSource source) throws Exception {
        var config=new Configuration();
        for(String entity:ENTITIES)config.addAnnotatedClass(Class.forName("vn.gaugaugau.fooddelivery."+entity));
        config.getProperties().put("hibernate.connection.datasource",source);
        config.setProperty("hibernate.hbm2ddl.auto","validate");
        config.setProperty("hibernate.default_catalog","fooddelivery");
        config.setProperty("hibernate.physical_naming_strategy","org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl");
        config.setProperty("hibernate.show_sql","false");
        config.setProperty("hibernate.format_sql","false");
        config.setProperty("hibernate.connection.autocommit","true");
        config.setProperty("hibernate.hbm2ddl.import_files","");
        return config;
    }
    public static void main(String[] args) {
        try {
            // Disable library logging BEFORE JDBC/Hibernate initialization; never print exception messages/stacks.
            ((ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME)).setLevel(ch.qos.logback.classic.Level.OFF);
            java.util.logging.LogManager.getLogManager().reset();
            if(args.length!=2 || !Set.of("probe","validate").contains(args[0]))throw new IllegalArgumentException();
            var input=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8));
            String user=new String(Base64.getDecoder().decode(input.readLine()),StandardCharsets.UTF_8);
            String password=new String(Base64.getDecoder().decode(input.readLine()),StandardCharsets.UTF_8);
            var source=new ReadOnlySource(user,password,args[1]);
            Class.forName("com.mysql.cj.jdbc.Driver");
            try(var c=source.getConnection()) {
                if(!c.isReadOnly())throw new SQLException("Connection is not read-only");
                // Exercise the local parser directly: the probe never reaches JDBC/the server.
                try{readSql("CREATE TABLE forbidden_validator_probe(id INT)");throw new IllegalStateException("Write guard failed");}
                catch(SQLException expected){if(!expected.getMessage().equals("Validator forbids non-read SQL"))throw expected;}
            }
            if(args[0].equals("probe")) {
                System.out.println("{\"status\":\"PASS\",\"mode\":\"probe\",\"jdbcReadOnly\":true,\"writeBlockedBeforeExecution\":true,\"webServerStarted\":false}");return;
            }
            var config=configuration(source);
            try(var factory=config.buildSessionFactory()) {
                if(factory.getMetamodel().getEntities().size()!=16)throw new IllegalStateException("Expected 16 entities");
                System.out.println("{\"status\":\"PASS\",\"mode\":\"validate\",\"entities\":16,\"ddlAuto\":\"validate\",\"jdbcReadOnly\":true,\"writeBlockedBeforeExecution\":true,\"webServerStarted\":false,\"businessEntitiesPersisted\":false}");
            }
        }catch(Throwable error){
            System.out.println("{\"status\":\"FAIL\",\"errorType\":\""+error.getClass().getSimpleName()+"\",\"detailsWithheld\":true}");
            System.exit(1);
        }
    }
}
