
export const BODY_TYPES = [
  "Châu Á", "Châu Âu", "Châu Mỹ", "Da màu", "Hàn Quốc"
];

export const AGE_GROUPS = [
  "15-20 tuổi", "20-30 tuổi", "30-40 tuổi", "Trung niên 40+"
];

export const STYLES = [
  { label: "Ảnh chân thực", value: "Chân thực" },
  { 
    label: "Diễn họa màu nước", 
    value: "Phong cách fashion illustration cao cấp với tạo hình người mẫu tối giản, tỷ lệ kéo dài, nhấn mạnh tinh thần thời trang hơn giải phẫu. Kỹ thuật màu nước loang (watercolor wash) kết hợp ink/line mảnh tạo độ mềm, trong và cảm giác chuyển động cho trang phục. Ứng dụng mixed media thủ công như kim tuyến, texture hạt, chấm vẩy màu để tăng chiều sâu và hiệu ứng bề mặt vải. Họa tiết vẽ tay mang tính tự do – nghệ thuật – cảm xúc, không ràng buộc tính chính xác kỹ thuật may. Tổng thể mang tinh thần haute couture illustration, nữ tính, bay bổng, giàu chất thủ công và trình diễn ý tưởng thiết kế." 
  },
  { 
    label: "Phác thảo chì", 
    value: "Phong cách fashion sketch truyền thống với nét vẽ tay nhanh, phóng khoáng, ưu tiên cảm giác chuyển động. Sử dụng line mảnh – line chồng (overlapping lines) để diễn tả cấu trúc, form và độ rủ của vải. Tỷ lệ cơ thể kéo dài, giản lược chi tiết giải phẫu, tập trung vào dáng pose và silhouette trang phục. Màu được thêm nhẹ bằng bút chì màu / marker nhạt, chỉ để nhấn khối và hướng thiết kế. Tổng thể mang tinh thần concept sketch – ý tưởng ban đầu, giàu tính thời trang và sáng tạo." 
  },
  { 
    label: "Vector Illustration", 
    value: "Phong cách digital fashion illustration / vector illustration với tạo hình nhân vật rõ ràng, hiện đại, mang tính thương mại cao. Nét vẽ clean line – smooth outline, kiểm soát chính xác tỷ lệ và đường viền hình thể. Màu sắc flat + gradient mềm, đổ bóng gọn gàng, tạo cảm giác bóng mịn và chiều sâu nhẹ. Trang phục và phụ kiện được xử lý đơn giản hóa chi tiết, nhấn form dáng và phong cách lifestyle. Tổng thể phù hợp illustration quảng cáo, thời trang ứng dụng, stock art, casual fashion concept." 
  }
];

export const SPACES = [
  "Phòng Studio", 
  "Phòng khách", 
  "Phòng Ngủ", 
  "Phòng Bếp", 
  "Sân vườn (có hoa cỏ)", 
  { label: "Thiên nhiên", value: "Thiên nhiên, cảnh quan thiên nhiên, khu nghỉ dưỡng, du lịch, sông suối, khung cảnh tự nhiên" },
  "Đường phố"
];

export const TIMES = [
  "Nắng đẹp", 
  "Bình minh", 
  "Hoàng hôn", 
  "Buổi tối", 
  "Trời mưa", 
  "Studio light"
];

export const RATIOS = [
  { label: "1:1 - Square", value: "1:1" },
  { label: "9:16 - Story", value: "9:16" },
  { label: "3:4 - Portrait", value: "3:4" },
  { label: "16:9 - Cinematic", value: "16:9" },
];

export const AI_MODELS = [
  { label: "Gemini 2.5 Flash (Tốc độ cao)", value: "gemini-2.5-flash-image" },
  { label: "Gemini 3.0 Pro (Chất lượng cao)", value: "gemini-3-pro-image-preview" },
  { label: "Imagen 3 (Chuyên Art - Text Only)", value: "imagen-3.0-generate-001" }
];

// SUGGESTIONS will now be dynamically fetched by AI
// export const SUGGESTIONS = [
//   "giày cao gót", "mũ vành to", "tóc màu vàng", 
//   "làm mịn da", "mỉm cười với camera", "tạo dáng bước đi", 
//   "ánh sáng mềm mại", "chi tiết vải sắc nét"
// ];
