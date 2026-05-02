package com.tqt.detaithuctap.dto.report;
import lombok.AllArgsConstructor; import lombok.Data;
import java.math.BigDecimal;

@Data @AllArgsConstructor
public class SeriesPoint {
    private String label;       // yyyy-MM
    private BigDecimal value;   // số tiền
}
