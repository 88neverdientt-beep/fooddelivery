package vn.gaugaugau.fooddelivery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import vn.gaugaugau.fooddelivery.utils.GlobalExceptionHandler;

class Phase8MvcContractTest {
    private final AtomicInteger calls = new AtomicInteger();
    private MockMvc mvc;

    // Non-static test-only controller is not eligible for component scanning.
    @RestController
    class ProbeController {
        @GetMapping(value = "/probe", produces = MediaType.APPLICATION_JSON_VALUE)
        public String read(@RequestParam("q") String query) {
            calls.incrementAndGet();
            return "{}";
        }
        @PostMapping(value = "/probe", consumes = MediaType.APPLICATION_JSON_VALUE)
        public String write(@RequestBody java.util.Map<String, String> body) {
            calls.incrementAndGet();
            return "{}";
        }
    }

    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new ProbeController())
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test void wrongMethodPreserves405AndAllow() throws Exception {
        mvc.perform(put("/probe")).andExpect(status().isMethodNotAllowed())
                .andExpect(header().exists("Allow"));
        assertEquals(0, calls.get());
    }
    @Test void unsupportedInputIs415WithoutEchoingBody() throws Exception {
        mvc.perform(post("/probe").contentType(MediaType.TEXT_PLAIN).content("private-input"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private-input"))));
        assertEquals(0, calls.get());
    }
    @Test void unacceptableResponseIs406() throws Exception {
        mvc.perform(get("/probe").param("q", "safe").accept(MediaType.APPLICATION_XML))
                .andExpect(status().isNotAcceptable());
        assertEquals(0, calls.get());
    }
    @Test void missingRequiredParameterIs400() throws Exception {
        mvc.perform(get("/probe")).andExpect(status().isBadRequest());
        assertEquals(0, calls.get());
    }
}
