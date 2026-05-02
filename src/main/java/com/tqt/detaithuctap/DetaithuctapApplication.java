package com.tqt.detaithuctap;

import com.tqt.detaithuctap.entity.CustomerGroupDef;
import com.tqt.detaithuctap.repository.CustomerGroupDefRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class DetaithuctapApplication {

    public static void main(String[] args) {
        SpringApplication.run(DetaithuctapApplication.class, args);
    }

    // ✅ Seed 3 nhóm mặc định nếu chưa có
    @Bean
    CommandLineRunner seedCustomerGroups(CustomerGroupDefRepository repo) {
        return args -> {
            seed(repo, "VIP", "VIP", "Ưu tiên hỗ trợ, chiết khấu cao.");
            seed(repo, "POTENTIAL", "Tiềm năng", "Tiềm năng trở thành khách hàng lớn.");
            seed(repo, "NORMAL", "Thường", "Chính sách tiêu chuẩn.");
        };
    }

    private void seed(CustomerGroupDefRepository repo, String code, String name, String note) {
        repo.findByCodeIgnoreCase(code).orElseGet(() ->
                repo.save(CustomerGroupDef.builder()
                        .code(code)
                        .name(name)
                        .note(note)
                        .build())
        );
    }
}
