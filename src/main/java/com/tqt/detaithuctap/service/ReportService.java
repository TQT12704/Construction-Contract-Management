package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.report.KpiResponse;
import com.tqt.detaithuctap.dto.report.SeriesPoint;
import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Customer;
import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.repository.ContractRepository;
import com.tqt.detaithuctap.repository.CustomerRepository;
import com.tqt.detaithuctap.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final CustomerRepository customerRepo;
    private final ContractRepository contractRepo;
    private final PaymentRepository paymentRepo;

    @Transactional(readOnly = true)
    public KpiResponse kpis() {
        long totalCustomers = customerRepo.count();
        long totalContracts = contractRepo.count();

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (ContractStatus st : ContractStatus.values()) {
            byStatus.put(st.name(), contractRepo.countByStatus(st));
        }

        BigDecimal totalValue = contractRepo.sumTotalValue();
        if (totalValue == null) totalValue = BigDecimal.ZERO;

        BigDecimal totalPaid = paymentRepo.sumPaidActualAll();
        if (totalPaid == null) totalPaid = BigDecimal.ZERO;

        BigDecimal receivable = totalValue.subtract(totalPaid);

        return KpiResponse.builder()
                .totalCustomers(totalCustomers)
                .totalContracts(totalContracts)
                .contractsByStatus(byStatus)
                .totalContractValue(totalValue)
                .totalPaid(totalPaid)
                .receivable(receivable)
                .build();
    }

    /** Doanh thu theo tháng (tính trong service, không cần thêm query repo) */
    @Transactional(readOnly = true)
    public List<SeriesPoint> revenueByMonth(int monthsBack) {
        if (monthsBack <= 0) monthsBack = 12;

        LocalDate today = LocalDate.now();
        LocalDate start = today.minusMonths(monthsBack - 1).withDayOfMonth(1);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");

        // Chuẩn bị các bucket yyyy-MM
        LinkedHashMap<String, BigDecimal> buckets = new LinkedHashMap<>();
        for (int i = monthsBack - 1; i >= 0; i--) {
            String label = today.minusMonths(i).format(fmt);
            buckets.put(label, BigDecimal.ZERO);
        }

        // Duyệt tất cả payment (PAID) trong khoảng thời gian, cộng thực thu (actualAmount nếu có, ngược lại amount)
        for (Payment p : paymentRepo.findAll()) {
            if (p.getStatus() != PaymentStatus.PAID) continue;
            LocalDate d = p.getPaymentDate();   // entity của bạn dùng 'paymentDate'
            if (d == null || d.isBefore(start) || d.isAfter(today)) continue;

            String label = d.format(fmt);
            if (!buckets.containsKey(label)) continue;

            BigDecimal val = p.getActualAmount() != null ? p.getActualAmount() : p.getAmount();
            if (val == null) val = BigDecimal.ZERO;
            buckets.put(label, buckets.get(label).add(val));
        }

        List<SeriesPoint> rs = new ArrayList<>();
        buckets.forEach((k, v) -> rs.add(new SeriesPoint(k, v)));
        return rs;
    }

    /** Top khách hàng theo tổng giá trị HĐ (tính trong service, không cần thêm query repo) */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> topCustomersByTotalValue(int topN) {
        if (topN <= 0) topN = 10;
        Map<String, BigDecimal> acc = new HashMap<>();

        for (Contract c : contractRepo.findAll()) {
            BigDecimal val = c.getTotalAmount();
            if (val == null) continue;

            Customer cust = c.getCustomer();
            String name = cust != null
                    ? (cust.getName() != null ? cust.getName() : "#" + cust.getId())
                    : "Unknown";
            acc.put(name, acc.getOrDefault(name, BigDecimal.ZERO).add(val));
        }

        List<Map.Entry<String, BigDecimal>> list = new ArrayList<>(acc.entrySet());
        list.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < Math.min(topN, list.size()); i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("customerName", list.get(i).getKey());
            m.put("totalValue", list.get(i).getValue());
            out.add(m);
        }
        return out;
    }
    public java.util.List<java.util.Map<String, Object>> topCustomersByContractValue(int topN) {
        return topCustomersByTotalValue(topN);
    }
}
