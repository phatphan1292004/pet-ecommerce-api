import 'dotenv/config';
import { AppDataSource } from '@/app/database';
import { Brand } from '@/app/entities/Brand';
import { Category } from '@/app/entities/Categories';
import { Product } from '@/app/entities/Product';
import { ObjectId } from 'mongodb';

interface RawProductSeed {
  name: string;
  slug: string;
  brandSlug: string;
  subCategorySlug: string;
  price: number;
  originalPrice: number;
  discount: number;
  description: string;
  longDescription: string;
  specifications: {
    productName: string;
    brand: string;
    weight: string;
    type: string;
    purpose: string;
    origin: string;
  };
  benefits: {
    healthSupport: string;
    nutritionNeeds: string;
    fatSupport: string;
    packaging: string;
  };
  usage: string;
  ingredients: string;
  stock: number;
  shipping: string;
  species: 'dog' | 'cat' | 'both';
  tags: string[];
  images: string[];
}

const productsData: RawProductSeed[] = [
  // 1. HẠT CHO CHÓ (Dry Dog Food) - 8 items
  {
    name: "Hạt Royal Canin Club Pro cho chó trưởng thành",
    slug: "hat-royal-canin-club-pro-cho-cho-truong-thanh",
    brandSlug: "royal-canin",
    subCategorySlug: "hat-cho-cho",
    price: 650000,
    originalPrice: 720000,
    discount: 10,
    description: "Thức ăn hạt khô dinh dưỡng cao dành riêng cho chó trưởng thành tất cả các giống.",
    longDescription: "Hạt Royal Canin Club Pro cung cấp đầy đủ chất dinh dưỡng thiết yếu, hỗ trợ hệ tiêu hóa khỏe mạnh, cải thiện chất lượng lông da và duy trì cân nặng lý tưởng cho chú chó của bạn.\n\nCông thức độc quyền giúp tăng cảm giác ngon miệng và kích thích thèm ăn ở những chú chó kén ăn nhất.",
    specifications: {
      productName: "Royal Canin Club Pro",
      brand: "Royal Canin",
      weight: "20kg",
      type: "Thức ăn hạt khô",
      purpose: "Dinh dưỡng hàng ngày",
      origin: "Pháp"
    },
    benefits: {
      healthSupport: "Tăng đề kháng, hỗ trợ xương khớp",
      nutritionNeeds: "Protein 25%, Chất béo 14%",
      fatSupport: "Kiểm soát cân nặng tối ưu",
      packaging: "Bao 20kg chuyên dụng"
    },
    usage: "Cho ăn trực tiếp hoặc trộn thêm với nước ấm, pate tùy nhu cầu của chó. Tham khảo bảng hướng dẫn cho ăn theo cân nặng trên bao bì.",
    ingredients: "Bột ngô, bột thịt gia cầm khô, mỡ động vật, gluten ngô, protein động vật thủy phân, bột củ cải đường, các loại vitamin và khoáng chất thiết yếu.",
    stock: 50,
    shipping: "Giao hàng nhanh trong 2h tại TP.HCM",
    species: "dog",
    tags: ["hạt cho chó", "royal canin", "thức ăn cho chó", "chó trưởng thành", "dinh dưỡng hàng ngày", "hỗ trợ tiêu hóa", "đẹp lông", "kiểm soát cân nặng", "chó lớn", "hạt khô", "pháp", "adult dog", "dry dog food", "chó kén ăn", "royal canin club pro"],
    images: ["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt mềm Zenith cho chó con dễ tiêu hoá",
    slug: "hat-mem-zenith-cho-cho-con-de-tieu-hoa",
    brandSlug: "zenith",
    subCategorySlug: "hat-cho-cho",
    price: 185000,
    originalPrice: 200000,
    discount: 8,
    description: "Thức ăn hạt mềm bán ẩm đặc biệt dành riêng cho chó con dưới 12 tháng tuổi giúp bảo vệ hệ tiêu hóa non nớt.",
    longDescription: "Hạt Zenith Puppy là sản phẩm hạt mềm cao cấp từ Hàn Quốc. Với thành phần chính là thịt cừu tươi và gạo lứt, sản phẩm giúp cung cấp năng lượng dồi dào cho chó con phát triển toàn diện.\n\nHạt mềm, dễ nhai và dễ hấp thu, cực kỳ thích hợp cho chó con mới tập ăn hạt.",
    specifications: {
      productName: "Zenith Puppy Soft Kibble",
      brand: "Zenith",
      weight: "1.2kg",
      type: "Hạt mềm bán ẩm",
      purpose: "Bảo vệ hệ tiêu hóa, phát triển trí não",
      origin: "Hàn Quốc"
    },
    benefits: {
      healthSupport: "Dễ tiêu hóa, hỗ trợ phát triển răng xương",
      nutritionNeeds: "Bổ sung sữa non và dầu cá",
      fatSupport: "Phát triển cơ bắp săn chắc",
      packaging: "Túi ZIP chia nhỏ 4 túi bên trong"
    },
    usage: "Cho ăn trực tiếp hàng ngày. Chia nhỏ thành 3-4 bữa cho chó con dễ hấp thụ.",
    ingredients: "Thịt cừu tươi, ức gà tươi, gạo lứt, yến mạch, dầu cá hồi, beta-glucan, dầu hạt lanh, vitamin tổng hợp.",
    stock: 60,
    shipping: "Giao hàng hỏa tốc nội thành",
    species: "dog",
    tags: ["hạt mềm cho chó", "zenith", "thức ăn cho chó con", "chó dưới 12 tháng", "thịt cừu tươi", "gạo lứt", "dễ tiêu hóa", "sữa non", "phát triển trí não", "hạt mềm", "hàn quốc", "puppy food", "soft kibble", "chó con kén ăn", "chó con tập ăn", "zenith puppy"],
    images: ["https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Ganador vị thịt gà và cừu cho chó lớn",
    slug: "hat-ganador-vi-thit-ga-va-cuu-cho-cho-lon",
    brandSlug: "ganador",
    subCategorySlug: "hat-cho-cho",
    price: 85000,
    originalPrice: 95000,
    discount: 11,
    description: "Thức ăn hỗn hợp hoàn chỉnh vị gà và cừu dành cho chó trưởng thành, bổ sung dinh dưỡng tối ưu.",
    longDescription: "Thức ăn hạt Ganador Gà và Cừu được thiết kế bởi các chuyên gia tại Pháp nhằm đảm bảo chất lượng dinh dưỡng cao nhất cho chó lớn.\n\nBổ sung Omega 3 & 6 cho bộ lông bóng mượt, khỏe mạnh, ngăn ngừa rụng lông.",
    specifications: {
      productName: "Ganador Adult Chicken & Lamb",
      brand: "Ganador",
      weight: "1.5kg",
      type: "Thức ăn hạt khô",
      purpose: "Dinh dưỡng cơ bản hằng ngày",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Tăng hệ miễn dịch, chắc khỏe xương",
      nutritionNeeds: "Protein 21%, Chất béo 10%",
      fatSupport: "Đầy đủ dinh dưỡng không béo phì",
      packaging: "Bao bì nilon kín hơi"
    },
    usage: "Phục vụ trực tiếp cùng nước uống sạch bên cạnh.",
    ingredients: "Ngô, bột gia cầm, bột mì, mỡ gia cầm, bột thịt cừu, dầu cá, khoáng chất (Sắt, Đồng, Mangan, Kẽm, Iod, Selen), Vitamin (A, D3, E, K3, B1, B2, B6, B12).",
    stock: 120,
    shipping: "Giao hàng tiêu chuẩn toàn quốc",
    species: "dog",
    tags: ["hạt cho chó", "ganador", "thức ăn cho chó lớn", "chó trưởng thành", "vị gà và cừu", "mượt lông", "omega 3 và 6", "tăng miễn dịch", "hạt khô", "việt nam", "adult dog", "chicken and lamb", "hạt giá rẻ", "thịt cừu", "thịt gà", "ganador adult"],
    images: ["https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Pedigree Puppy vị bò kho và sữa thơm ngon",
    slug: "hat-pedigree-puppy-vi-bo-kho-va-sua-thom-ngon",
    brandSlug: "pedigree",
    subCategorySlug: "hat-cho-cho",
    price: 78000,
    originalPrice: 88000,
    discount: 11,
    description: "Hạt khô thơm vị bò và sữa béo ngậy thích hợp cho chó con tập ăn hạt và phát triển cơ xương.",
    longDescription: "Hạt Pedigree Puppy cung cấp cho chó con hệ dưỡng chất toàn diện với Canxi, Phốt pho giúp răng chắc khỏe, cùng sữa thơm béo kích thích vị giác của cún con.",
    specifications: {
      productName: "Pedigree Puppy Beef & Milk",
      brand: "Pedigree",
      weight: "1.3kg",
      type: "Thức ăn hạt khô",
      purpose: "Dành cho chó con tập ăn hạt",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Phát triển trí não, xương chắc khỏe",
      nutritionNeeds: "Gấp đôi canxi và kẽm",
      fatSupport: "Giúp chó năng động và lanh lợi",
      packaging: "Bao túi nhựa"
    },
    usage: "Có thể ngâm hạt với nước ấm hoặc sữa chuyên dụng cho chó con trước khi cho ăn.",
    ingredients: "Ngũ cốc (ngô, lúa mì), protein động vật (thịt bò, gia cầm), dầu thực vật, vitamin, khoáng chất và bột sữa.",
    stock: 90,
    shipping: "Giao hàng nhanh 2-3 ngày",
    species: "dog",
    tags: ["hạt cho chó con", "pedigree", "chó con tập ăn", "vị bò kho và sữa", "chắc răng", "phát triển xương", "canxi", "sữa bò", "hạt khô", "thái lan", "puppy beef milk", "chó con dưới 1 tuổi", "dinh dưỡng chó con", "pedigree puppy"],
    images: ["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Taste of the Wild High Prairie Canine vị bò nướng",
    slug: "hat-taste-of-the-wild-high-prairie-canine-vi-bo-nuong",
    brandSlug: "taste-of-wild",
    subCategorySlug: "hat-cho-cho",
    price: 360000,
    originalPrice: 400000,
    discount: 10,
    description: "Thức ăn hạt không ngũ cốc cao cấp bậc nhất chứa thịt bò nướng hoang dã cho mọi giống chó.",
    longDescription: "Taste of the Wild mang lại chế độ ăn uống tự nhiên nhất cho chó cưng của bạn. Công thức không chứa ngũ cốc, thay vào đó bổ sung khoai lang và đậu hà lan cung cấp năng lượng dễ tiêu hóa.\n\nHương vị thịt nướng thơm lừng kích thích bản năng săn mồi hoang dã của cún cưng.",
    specifications: {
      productName: "Taste of the Wild High Prairie",
      brand: "Taste of the Wild",
      weight: "2kg",
      type: "Thức ăn không ngũ cốc (Grain-Free)",
      purpose: "Dinh dưỡng tự nhiên cao cấp, hạn chế dị ứng",
      origin: "Mỹ"
    },
    benefits: {
      healthSupport: "Hạn chế dị ứng lông da, mượt lông",
      nutritionNeeds: "Protein động vật hoang dã cao (32%)",
      fatSupport: "Đảm bảo cân đối cơ bắp săn chắc",
      packaging: "Bao nilon cao cấp ép chân không"
    },
    usage: "Cho ăn trực tiếp theo định lượng ghi trên nhãn bao bì phù hợp với cân nặng của chó.",
    ingredients: "Thịt trâu, thịt cừu, thịt gà, khoai lang, đậu hà lan, thịt bò tót nướng, thịt nai nướng, dầu cá, rễ rau diếp xoắn khô, cà chua, quả việt quất, quả mâm xôi.",
    stock: 35,
    shipping: "Giao hàng hỏa tốc trong ngày",
    species: "dog",
    tags: ["hạt không ngũ cốc", "taste of the wild", "thức ăn cao cấp", "chó dị ứng", "thịt bò nướng", "thịt nai nướng", "grain free", "mỹ", "mượt lông", "mọi giống chó", "wild protein", "thức ăn không ngũ cốc cho chó", "chó nhạy cảm", "protein cao", "taste of the wild dog"],
    images: ["https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Reflex Plus Puppy vị cá hồi cho chó con",
    slug: "hat-reflex-plus-puppy-vi-ca-hoi-cho-cho-con",
    brandSlug: "reflex",
    subCategorySlug: "hat-cho-cho",
    price: 198000,
    originalPrice: 220000,
    discount: 10,
    description: "Hạt siêu cao cấp dành cho chó con với thành phần cá hồi Đại Tây Dương giúp tăng cường hệ miễn dịch.",
    longDescription: "Reflex Plus Puppy chứa hệ dưỡng chất Xylo-oligosaccharides (XOS) thế hệ mới giúp giảm thiểu các vấn đề về đường ruột, giảm mùi hôi chất thải và nâng cao khả năng miễn dịch cho chó con.",
    specifications: {
      productName: "Reflex Plus Medium & Large Puppy Salmon",
      brand: "Reflex",
      weight: "3kg",
      type: "Thức ăn hạt khô siêu cao cấp",
      purpose: "Hỗ trợ tiêu hóa, đẹp da lông",
      origin: "Thổ Nhĩ Kỳ"
    },
    benefits: {
      healthSupport: "Hệ tiêu hóa khỏe mạnh, giảm mùi hôi phân",
      nutritionNeeds: "Omega 3 & 6 từ dầu cá hồi tươi",
      fatSupport: "Tăng trưởng xương khớp khỏe mạnh",
      packaging: "Bao khóa ZIP tiện lợi"
    },
    usage: "Dùng cho chó con từ 2 đến 12 tháng tuổi. Cho ăn khô hoặc ngâm nước ấm.",
    ingredients: "Protein cá hồi khử nước, protein động vật khử nước, ngô, mỡ gà, gạo, bột củ cải đường, hương cá hồi, vitamin và khoáng chất.",
    stock: 45,
    shipping: "Giao hàng nhanh toàn quốc",
    species: "dog",
    tags: ["hạt cho chó con", "reflex plus", "vị cá hồi", "chó dưới 12 tháng", "hỗ trợ đường ruột", "giảm mùi hôi phân", "tăng đề kháng", "omega 3", "thổ nhĩ kỳ", "puppy salmon", "đẹp da lông chó", "reflex plus puppy", "siêu cao cấp"],
    images: ["https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Royal Canin Mini Puppy cho chó con giống nhỏ",
    slug: "hat-royal-canin-mini-puppy-cho-cho-con-giong-nho",
    brandSlug: "royal-canin",
    subCategorySlug: "hat-cho-cho",
    price: 175000,
    originalPrice: 195000,
    discount: 10,
    description: "Thức ăn hạt cao cấp dành riêng cho chó con dưới 10 tháng tuổi thuộc nhóm giống nhỏ dưới 10kg khi trưởng thành.",
    longDescription: "Royal Canin Mini Puppy đáp ứng nhu cầu năng lượng cực lớn của cún con thuộc giống nhỏ trong giai đoạn phát triển ngắn. Hạt có kích thước nhỏ, thiết kế hình học giúp cún nhỏ dễ nhai và làm sạch mảng bám răng.",
    specifications: {
      productName: "Royal Canin Mini Puppy",
      brand: "Royal Canin",
      weight: "800g",
      type: "Thức ăn hạt khô cao cấp",
      purpose: "Dành riêng cho chó con giống nhỏ (Poodle, Pomeranian, Pug...)",
      origin: "Pháp"
    },
    benefits: {
      healthSupport: "Phát triển hệ miễn dịch tự nhiên",
      nutritionNeeds: "Dồi dào năng lượng phù hợp giống nhỏ",
      fatSupport: "Hạn chế mảng bám răng miệng",
      packaging: "Túi ZIP chống ẩm"
    },
    usage: "Tham khảo bảng chỉ dẫn lượng thức ăn khuyến nghị theo tháng tuổi và cân nặng dự kiến khi trưởng thành.",
    ingredients: "Protein gia cầm tách béo, gạo, mỡ động vật, ngô, gluten lúa mì, bột củ cải đường, khoáng chất, dầu cá, men bia.",
    stock: 80,
    shipping: "Giao hàng nhanh 2h TP.HCM",
    species: "dog",
    tags: ["hạt cho chó con", "royal canin", "mini puppy", "chó giống nhỏ", "poodle", "phốc sóc", "pug", "chó dưới 10kg", "sạch răng", "pháp", "small breed puppy", "thức ăn cho poodle con", "royal canin mini puppy", "dễ nhai"],
    images: ["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Zenith Light hạt mềm giảm cân cho chó",
    slug: "hat-zenith-light-hat-mem-giam-can-cho-cho",
    brandSlug: "zenith",
    subCategorySlug: "hat-cho-cho",
    price: 195000,
    originalPrice: 210000,
    discount: 7,
    description: "Hạt mềm giảm cân hữu cơ cao cấp vị thịt cừu dành cho chó có xu hướng thừa cân béo phì hoặc chó già.",
    longDescription: "Hạt mềm Zenith Light có tỷ lệ chất béo cực thấp kết hợp Carnitine hỗ trợ đốt cháy mỡ thừa và chuyển hóa năng lượng, thích hợp cho chó ít vận động hoặc chó già có hệ tiêu hóa yếu.",
    specifications: {
      productName: "Zenith Light & Senior Soft Kibble",
      brand: "Zenith",
      weight: "1.2kg",
      type: "Hạt mềm bán ẩm hữu cơ",
      purpose: "Hỗ trợ giảm cân, tốt cho khớp chó già",
      origin: "Hàn Quốc"
    },
    benefits: {
      healthSupport: "Giảm áp lực lên xương khớp, tốt cho chó già",
      nutritionNeeds: "Bổ sung Glucosamine và Chondroitin",
      fatSupport: "Công thức ít calo, giàu chất xơ",
      packaging: "Bao bao gồm 4 túi nhỏ 300g bên trong"
    },
    usage: "Thay thế thức ăn hàng ngày, tuân thủ nghiêm ngặt liều lượng để đạt hiệu quả giảm cân mong muốn.",
    ingredients: "Thịt cừu tươi, gạo lứt, yến mạch, bột dừa, bột khoai tây, Glucosamine, Chondroitin, L-carnitine, dầu cá hồi tươi.",
    stock: 30,
    shipping: "Giao hàng nhanh nội thành",
    species: "dog",
    tags: ["hạt mềm giảm cân", "zenith", "chó béo phì", "chó già", "thịt cừu tươi", "glucosamine", "chondroitin", "khớp khỏe", "ít calo", "hàn quốc", "light dog food", "senior dog food", "hạt mềm cho chó già", "kiểm soát mỡ thừa", "zenith light"],
    images: ["https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600"]
  },

  // 2. PATE CHO CHÓ (Wet Dog Food) - 7 items
  {
    name: "Pate Pedigree gói vị thịt gà và gan nướng",
    slug: "pate-pedigree-goi-vi-thit-ga-va-gan-nuong",
    brandSlug: "pedigree",
    subCategorySlug: "pate-cho-cho",
    price: 16000,
    originalPrice: 18000,
    discount: 11,
    description: "Thức ăn ướt dạng xốt hảo hạng vị gà và gan nướng đóng gói tiện lợi cho chó trưởng thành.",
    longDescription: "Pate Pedigree gói mang lại hương vị thơm ngon khó cưỡng từ thịt gà thật cùng gan nướng béo ngậy ngập trong xốt sánh mịn, bổ sung nước hiệu quả tránh sỏi thận ở chó.",
    specifications: {
      productName: "Pedigree Chicken & Liver Gravy Pouch",
      brand: "Pedigree",
      weight: "130g",
      type: "Pate xốt (Wet food)",
      purpose: "Bữa ăn phụ dinh dưỡng hoặc trộn hạt",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Dễ hấp thu, cấp nước cơ thể",
      nutritionNeeds: "Giàu vitamin E và khoáng chất bảo vệ da lông",
      fatSupport: "Dễ tiêu hóa, ngon miệng",
      packaging: "Gói nhôm ép kín 130g"
    },
    usage: "Trộn trực tiếp với hạt khô hoặc cho ăn riêng như một bữa ăn phụ ngon miệng.",
    ingredients: "Thịt gà, phụ phẩm từ gà, gan bò, gluten lúa mì, chất tạo đông, khoáng chất, vitamin.",
    stock: 200,
    shipping: "Giao nhanh trong 2h",
    species: "dog",
    tags: ["pate pedigree", "pate cho chó", "pate gói", "thịt gà gan nướng", "thức ăn ướt cho chó", "bù nước cho chó", "trộn hạt", "pedigree gravy", "tiện lợi", "ngon miệng", "chó trưởng thành"],
    images: ["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate lon King's Pet vị heo và gà cho chó cưng",
    slug: "pate-lon-kings-pet-vi-heo-va-ga-cho-cho-cung",
    brandSlug: "kings-pet",
    subCategorySlug: "pate-cho-cho",
    price: 45000,
    originalPrice: 50000,
    discount: 10,
    description: "Pate lon tươi ngon kết hợp hoàn hảo giữa thịt heo và gà nội địa tươi sống chất lượng cao.",
    longDescription: "Pate King's Pet là thương hiệu pate tươi đóng lon đầu tiên tại Việt Nam đạt chuẩn chất lượng. Với nguồn thịt sạch, không chất bảo quản hay hương liệu nhân tạo, sản phẩm giữ trọn vẹn dinh dưỡng nguyên bản.",
    specifications: {
      productName: "Pate King's Pet Pork & Chicken",
      brand: "King's Pet",
      weight: "400g",
      type: "Pate lon xay mịn",
      purpose: "Bữa ăn chính giàu đạm động vật",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Ngon miệng tự nhiên, bổ sung năng lượng nhanh chóng",
      nutritionNeeds: "Hàm lượng protein và collagen tự nhiên dồi dào",
      fatSupport: "Không độn tinh bột, không chất tạo mùi",
      packaging: "Lon thiếc có nắp giật tiện dụng"
    },
    usage: "Cho ăn trực tiếp. Sau khi mở nắp cần đậy kín nắp nhựa kèm theo và bảo quản trong ngăn mát tủ lạnh tối đa 7 ngày.",
    ingredients: "Thịt heo sạch 40%, thịt gà sạch 40%, gan gà đông lạnh, nước tinh khiết, gelatin thực phẩm.",
    stock: 100,
    shipping: "Giao hàng hỏa tốc trong ngày",
    species: "dog",
    tags: ["pate lon", "kings pet", "pate việt nam", "heo gà", "pate tươi đóng lon", "không chất bảo quản", "giàu collagen", "đạm động vật", "kings pet pork chicken", "chó lớn ăn ngon"],
    images: ["https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate lon Monge Grill vị thịt bò nướng cho chó",
    slug: "pate-lon-monge-grill-vi-thit-bo-nuong-cho-cho",
    brandSlug: "monge",
    subCategorySlug: "pate-cho-cho",
    price: 35000,
    originalPrice: 38000,
    discount: 8,
    description: "Pate cao cấp nhập khẩu từ Ý chứa các miếng thịt bò thật được nướng lò thơm phức.",
    longDescription: "Monge Grill mang đến trải nghiệm ẩm thực đẳng cấp cho cún cưng với những lát thịt bò nướng lò hảo hạng trong nước sốt sánh đặc. Không chứa màu nhân tạo hay chất bảo quản hóa học.",
    specifications: {
      productName: "Monge Grill Oven Basted Chunk Beef",
      brand: "Monge",
      weight: "100g",
      type: "Pate cắt khúc nướng lò",
      purpose: "Bữa ăn nhẹ cao cấp cho chó",
      origin: "Ý"
    },
    benefits: {
      healthSupport: "Thúc đẩy phát triển cơ bắp chắc khỏe",
      nutritionNeeds: "Hàm lượng vitamin D3 và E cao giúp xương chắc khỏe",
      fatSupport: "Công thức không ngũ cốc (Grain-free)",
      packaging: "Túi nhôm dẹt xi mạ bạc sang trọng"
    },
    usage: "Cho ăn trực tiếp ở nhiệt độ phòng. Bảo quản lạnh sau khi mở túi.",
    ingredients: "Thịt và các dẫn xuất động vật (thịt bò nướng 10%), khoáng chất, glucosamine, chondroitin sulfate.",
    stock: 150,
    shipping: "Giao hàng nhanh toàn quốc",
    species: "dog",
    tags: ["pate cho chó", "monge grill", "pate ý", "thịt bò nướng", "pate nhập khẩu", "grain free", "glucosamine", "chondroitin", "khớp khỏe", "thức ăn ướt cao cấp", "monge beef", "nướng lò"],
    images: ["https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Pedigree Puppy vị bò xốt ngập cho chó con",
    slug: "pate-pedigree-puppy-vi-bo-xot-ngap-cho-cho-con",
    brandSlug: "pedigree",
    subCategorySlug: "pate-cho-cho",
    price: 16500,
    originalPrice: 19000,
    discount: 13,
    description: "Thức ăn dạng xốt thơm ngon vị bò ngập sốt dinh dưỡng thích hợp cho hệ tiêu hóa của chó con.",
    longDescription: "Pate xốt bò cho chó con Pedigree Puppy được điều chế đặc biệt giúp cún cưng dễ nhai, dễ nuốt và dễ tiêu hóa. Chứa Omega 6 và Kẽm cho làn da khỏe mạnh và bộ lông mềm mượt.",
    specifications: {
      productName: "Pedigree Puppy Beef Gravy Pouch",
      brand: "Pedigree",
      weight: "130g",
      type: "Pate xốt cho chó con",
      purpose: "Tập ăn dặm, bổ sung dưỡng chất phát triển nhanh",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Phát triển hệ xương và khớp từ nhỏ",
      nutritionNeeds: "Dồi dào Canxi và Vitamin D",
      fatSupport: "Bữa ăn dễ nhai nuốt thích hợp cún nhỏ",
      packaging: "Gói nhôm kín hơi"
    },
    usage: "Cho ăn trực tiếp hoặc dằm nhỏ trộn chung với cháo hoặc hạt ngâm.",
    ingredients: "Thịt bò tươi, gan bò phụ phẩm, chất tạo đông, nước sốt thịt, khoáng chất thiết yếu.",
    stock: 180,
    shipping: "Giao hàng nhanh trong ngày",
    species: "dog",
    tags: ["pate cho chó con", "pedigree puppy", "vị bò sốt ngập", "thức ăn ướt cho chó con", "canxi", "vitamin d", "omega 6", "kẽm mượt lông", "chó con tập ăn", "dễ tiêu hóa", "pedigree pouch puppy"],
    images: ["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate lon King's Pet hỗn hợp thịt cho chó",
    slug: "pate-lon-kings-pet-hon-hop-thit-cho-cho",
    brandSlug: "kings-pet",
    subCategorySlug: "pate-cho-cho",
    price: 43000,
    originalPrice: 48000,
    discount: 10,
    description: "Pate tươi đóng lon đa dạng nguồn đạm từ heo, bò, gà thơm ngon đậm đà kích thích cún ăn nhiều hơn.",
    longDescription: "Pate hỗn hợp thịt King's Pet chứa nguồn dinh dưỡng phong phú từ các loại thịt bò, gà, heo tươi sạch. Công thức độc quyền giữ được kết cấu mềm ẩm mọng nước tự nhiên giúp bổ sung nước phòng sỏi thận ở chó hiệu quả.",
    specifications: {
      productName: "Pate King's Pet Meat Blend",
      brand: "King's Pet",
      weight: "400g",
      type: "Pate lon xay mịn",
      purpose: "Bữa ăn chính hoặc trộn hạt chống ngán",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Tăng cơ bắp khỏe mạnh, chắc thịt",
      nutritionNeeds: "Độ ẩm đạt 80% bù nước tốt",
      fatSupport: "Không phụ gia hóa học độc hại",
      packaging: "Lon thiếc kèm nắp bảo quản silicon"
    },
    usage: "Cho ăn trực tiếp hoặc trộn với hạt. Bảo quản lạnh sau khi mở nắp.",
    ingredients: "Thịt heo sạch, thịt gà, thịt bò, gan gà, nước tinh khiết, phụ gia thực phẩm an toàn.",
    stock: 95,
    shipping: "Giao nhanh 2h tại TP.HCM",
    species: "dog",
    tags: ["pate lon", "kings pet", "pate tươi cho chó", "hỗn hợp thịt", "bù nước cho chó", "không độn bột", "thịt bò thịt gà thịt heo", "kings pet meat blend", "chó lớn", "kích thích ăn uống"],
    images: ["https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate lon Monge Grill vị thịt gà nướng cho chó lớn",
    slug: "pate-lon-monge-grill-vi-thit-ga-nuong-cho-cho-lon",
    brandSlug: "monge",
    subCategorySlug: "pate-cho-cho",
    price: 35000,
    originalPrice: 38000,
    discount: 8,
    description: "Thức ăn hạt ướt cắt lát nhỏ nướng lò vị thịt gà dai ngon nhập khẩu từ Ý.",
    longDescription: "Miếng thịt gà nướng lò thơm lừng ngập trong sốt mịn từ nhãn hiệu Monge nổi tiếng châu Âu. Rất giàu protein chất lượng cao dễ hấp thụ giúp phát triển các cơ quan cún cưng hoàn hảo.",
    specifications: {
      productName: "Monge Grill Oven Basted Chicken",
      brand: "Monge",
      weight: "100g",
      type: "Pate cắt lát nước lò sốt",
      purpose: "Bữa ăn bổ sung cho chó trưởng thành",
      origin: "Ý"
    },
    benefits: {
      healthSupport: "Chống oxy hóa tế bào tốt",
      nutritionNeeds: "Chứa Glucosamine & Chondroitin bảo vệ khớp xương",
      fatSupport: "Cực thấp chất béo bão hòa",
      packaging: "Túi nhôm bảo quản tốt"
    },
    usage: "Mở bao ăn trực tiếp. Khuyên dùng 2-3 túi/ngày tùy trọng lượng chó.",
    ingredients: "Thịt gà nướng lò 12%, gan heo, ngô, dầu thực vật, vitamin và khoáng chất thiết yếu.",
    stock: 140,
    shipping: "Giao hàng nhanh toàn quốc",
    species: "dog",
    tags: ["pate cho chó lớn", "monge grill", "pate ý", "gà nướng lò", "nhập khẩu châu âu", "glucosamine", "khớp khỏe", "ít chất béo bão hòa", "đạm dễ hấp thu", "monge chicken"],
    images: ["https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate lon Pedigree vị thịt bò kho rau củ",
    slug: "pate-lon-pedigree-vi-thit-bo-kho-rau-cu",
    brandSlug: "pedigree",
    subCategorySlug: "pate-cho-cho",
    price: 49000,
    originalPrice: 55000,
    discount: 11,
    description: "Pate đóng lon cỡ lớn vị bò kho kết hợp rau củ tươi mang lại bữa ăn đầy đủ chất dinh dưỡng và chất xơ.",
    longDescription: "Pate lon bò kho rau củ Pedigree là bữa ăn đầy đủ tiện lợi nhất cho cún cưng lớn. Sự kết hợp giữa thịt bò thật giàu sắt cùng cà rốt, đậu hà lan cung cấp vitamin A, chất xơ tự nhiên hỗ trợ đắc lực cho tiêu hóa.",
    specifications: {
      productName: "Pedigree Beef & Vegetable Can",
      brand: "Pedigree",
      weight: "400g",
      type: "Pate đông đặc rau củ",
      purpose: "Bữa ăn chính dinh dưỡng toàn diện",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Tăng nhu động ruột, giảm táo bón",
      nutritionNeeds: "Bổ sung Vitamin A từ cà rốt tự nhiên",
      fatSupport: "Chất xơ tự nhiên dồi dào hỗ trợ ruột",
      packaging: "Lon sắt siêu bền vững"
    },
    usage: "Chia đôi hộp cho hai bữa ăn của chó lớn hoặc trộn trực tiếp cùng hạt.",
    ingredients: "Thịt bò tươi 20%, đậu hà lan, cà rốt khô, tinh bột biến tính, thạch đông, vitamin tổng hợp.",
    stock: 120,
    shipping: "Giao hàng hỏa tốc trong ngày",
    species: "dog",
    tags: ["pate lon cho chó", "pedigree can", "bò kho rau củ", "cà rốt đậu hà lan", "chất xơ tiêu hóa", "vitamin a", "bữa ăn chính", "pate lon lớn", "pedigree beef vegetable", "giảm táo bón"],
    images: ["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"]
  },

  // 3. BÁNH THƯỞNG / SNACK / XƯƠNG GẶM CHO CHÓ - 5 items
  {
    name: "Xương gặm Pedigree DentaStix làm sạch răng",
    slug: "xuong-gam-pedigree-dentastix-lam-sach-rang",
    brandSlug: "pedigree",
    subCategorySlug: "banh-thuong-sup-thuong-snack-cho-cho",
    price: 36000,
    originalPrice: 42000,
    discount: 14,
    description: "Bánh xương nhai gặm giúp làm sạch răng, ngăn ngừa mảng bám và mảng vôi răng cho chó trung bình.",
    longDescription: "Xương DentaStix có thiết kế hình chữ X độc quyền giúp cọ xát sâu vào kẽ răng cún khi nhai. Được chứng minh lâm sàng giảm đến 80% mảng bám và vôi răng tích tụ.",
    specifications: {
      productName: "Pedigree DentaStix Daily Oral Care",
      brand: "Pedigree",
      weight: "75g",
      type: "Xương nhai sạch răng",
      purpose: "Vệ sinh răng miệng, giảm mùi hôi miệng",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Giảm sưng nướu, giảm mùi hôi miệng rõ rệt",
      nutritionNeeds: "Ít béo, không thêm đường nhân tạo",
      fatSupport: "Ăn mỗi ngày mà không sợ tăng cân",
      packaging: "Túi ZIP bảo quản giòn lâu"
    },
    usage: "Cho cún nhai 1 thanh mỗi ngày vào buổi sáng hoặc tối sau bữa ăn chính.",
    ingredients: "Bột ngô, bột mì, glycerin thực vật, gelatin, hương khói, kẽm sulfat, khoáng chất làm sạch răng.",
    stock: 150,
    shipping: "Giao hàng toàn quốc nhanh chóng",
    species: "dog",
    tags: ["xương gặm cho chó", "pedigree dentastix", "sạch răng chó", "vệ sinh răng miệng", "giảm hôi miệng", "giảm mảng bám vôi răng", "chữ x độc quyền", "snack cho chó", "bánh thưởng chó", "dentastix medium"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Que gặm DoggyMan vị bò cuộn da bò dai ngon",
    slug: "que-gam-doggyman-vi-bo-cuon-da-bo-dai-ngon",
    brandSlug: "doggy-man",
    subCategorySlug: "xuong-gam-que-gam-cho-cho",
    price: 52000,
    originalPrice: 60000,
    discount: 13,
    description: "Snack da bò tự nhiên cuộn thịt bò thật dai ngon, kích thích khả năng nhai gặm giải tỏa căng thẳng cho cún.",
    longDescription: "Sản phẩm từ thương hiệu Nhật Bản DoggyMan. Da bò tự nhiên sấy khô cuốn quanh miếng thịt bò tươi sấy mang đến hương vị bùi béo kích thích, giúp cún giải trí cả ngày, tránh cắn phá đồ đạc trong nhà.",
    specifications: {
      productName: "DoggyMan Beef Wrapped Rawhide Chew",
      brand: "Doggy Man",
      weight: "120g (6 que)",
      type: "Que gặm da bò cuốn thịt",
      purpose: "Giải tỏa stress, mài răng cún",
      origin: "Việt Nam (Công nghệ Nhật Bản)"
    },
    benefits: {
      healthSupport: "Giúp cơ hàm săn chắc khỏe mạnh",
      nutritionNeeds: "Giàu protein động vật từ da bò sạch",
      fatSupport: "Không chứa phụ gia tẩy trắng hóa học",
      packaging: "Túi nilon hàn miệng cao cấp"
    },
    usage: "Sử dụng làm phần thưởng khi huấn luyện hoặc cho gặm khi cún ở một mình.",
    ingredients: "Da bò sạch sấy khô 70%, thịt bò tươi 25%, glycerin thực vật, muối khoáng.",
    stock: 80,
    shipping: "Giao hàng hỏa tốc nội thành",
    species: "dog",
    tags: ["que gặm cho chó", "doggyman", "da bò cuộn thịt bò", "mài răng chó", "giảm stress cho chó", "chống cắn phá đồ", "đồ chơi nhai cho chó", "doggyman chew", "thịt bò thật", "da bò tự nhiên"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Bánh thưởng Forcans dưỡng lông vị việt quất",
    slug: "banh-thuong-forcans-duong-long-vi-viet-quat",
    brandSlug: "forcans",
    subCategorySlug: "banh-thuong-sup-thuong-snack-cho-cho",
    price: 68000,
    originalPrice: 75000,
    discount: 9,
    description: "Snack bánh thưởng giòn rụm vị việt quất bổ sung dưỡng chất cho làn da khỏe mạnh và bộ lông óng mượt.",
    longDescription: "Bánh thưởng Forcans Việt Quất nhập khẩu từ Hàn Quốc chứa nguồn Vitamin C dồi dào, các chất chống oxy hóa tự nhiên giúp bảo vệ tế bào lông của cún, ngăn ngừa viêm da dị ứng.",
    specifications: {
      productName: "Forcans Blueberry Skin & Coat Treat",
      brand: "Forcans",
      weight: "100g",
      type: "Bánh thưởng xốp giòn",
      purpose: "Dưỡng lông da mềm mượt, bổ sung vitamin",
      origin: "Hàn Quốc"
    },
    benefits: {
      healthSupport: "Hạn chế rụng lông cún hiệu quả",
      nutritionNeeds: "Bổ sung Collagen và Vitamin C, E",
      fatSupport: "Hương việt quất tự nhiên thơm ngọt mát",
      packaging: "Hũ nhựa kín bảo quản độ giòn"
    },
    usage: "Cho ăn trực tiếp từ 2-5 viên mỗi ngày tùy kích thước của chó.",
    ingredients: "Bột việt quất tươi, bột mì, collagen động vật, vitamin tổng hợp, chất xơ táo.",
    stock: 75,
    shipping: "Giao hàng tiêu chuẩn toàn quốc",
    species: "dog",
    tags: ["bánh thưởng cho chó", "forcans", "dưỡng lông chó", "vị việt quất", "vitamin c", "collagen", "chống oxy hóa", "hạn chế rụng lông", "snack cho chó", "hàn quốc nhập khẩu", "forcans blueberry"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Snack xương sữa cho chó Pedigree DentaStix cỡ đại",
    slug: "snack-xuong-sua-cho-cho-pedigree-dentastix-co-dai",
    brandSlug: "pedigree",
    subCategorySlug: "xuong-gam-que-gam-cho-cho",
    price: 45000,
    originalPrice: 50000,
    discount: 10,
    description: "Phiên bản DentaStix size lớn dành riêng cho các giống chó lớn từ 25kg trở lên giúp làm sạch răng hàm hiệu quả.",
    longDescription: "Cún cưng cỡ lớn cần lực cắn mạnh và que gặm đủ to để không bị nuốt chửng. Pedigree Dentastix dòng Large Dog thiết kế dai cứng vừa đủ giúp cún nhai lâu hơn, sạch mảng bám răng sâu bên trong.",
    specifications: {
      productName: "Pedigree DentaStix Large Dog",
      brand: "Pedigree",
      weight: "112g (3 thanh to)",
      type: "Xương nhai cỡ lớn",
      purpose: "Chăm sóc răng miệng cho chó lớn",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Phòng ngừa viêm nướu, hôi miệng ở chó lớn",
      nutritionNeeds: "Giàu khoáng chất Kẽm Sulfat bảo vệ răng",
      fatSupport: "Không phẩm màu nhân tạo độc hại",
      packaging: "Túi bảo quản hàn miệng kín"
    },
    usage: "Thích hợp cho chó Husky, Golden Retriever, Alaska... nhai 1 thanh/ngày.",
    ingredients: "Bột gạo, tinh bột ngô, glycerin thực vật, khoáng chất làm sạch răng tự nhiên, hương bò.",
    stock: 90,
    shipping: "Giao hàng nhanh 2h",
    species: "dog",
    tags: ["xương gặm cho chó lớn", "pedigree dentastix", "dentastix large", "chó golden alaska husky", "sạch răng chó lớn", "giảm vôi răng", "vệ sinh răng chó", "xương nhai cỡ đại", "kẽm sulfat"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Xương gặm sạch răng Forcans Dentall 3D hình sao",
    slug: "xuong-gam-sach-rang-forcans-dentall-3d-hinh-sao",
    brandSlug: "forcans",
    subCategorySlug: "xuong-gam-que-gam-cho-cho",
    price: 85000,
    originalPrice: 95000,
    discount: 11,
    description: "Xương gặm thiết kế 3D hình bánh răng cưa độc đáo từ Hàn Quốc giúp quét sạch thức ăn thừa bám sâu kẽ nướu.",
    longDescription: "Bánh xương Forcans Dentall nổi bật với thiết kế đa chiều dạng sao xoắn ốc giúp tăng tối đa diện tích tiếp xúc với bề mặt răng khi nhai. Hương bạc hà tươi mát giúp thổi bay mùi hôi miệng tức thì.",
    specifications: {
      productName: "Forcans Dentall 3D Star Chew",
      brand: "Forcans",
      weight: "140g",
      type: "Xương nhai sạch răng 3D",
      purpose: "Hạn chế vôi răng, làm thơm miệng",
      origin: "Hàn Quốc"
    },
    benefits: {
      healthSupport: "Thổi bay hơi thở nặng mùi tức thì",
      nutritionNeeds: "Bổ sung chất xơ tự nhiên, dễ tiêu hóa",
      fatSupport: "Không chứa gelatin động vật rẻ tiền khó tiêu",
      packaging: "Túi ZIP cao cấp sang trọng"
    },
    usage: "Cho cún nhai trực tiếp hàng ngày.",
    ingredients: "Gạo lứt, cellulose tự nhiên, CMC, hương bạc hà tự nhiên, chiết xuất trà xanh kháng khuẩn.",
    stock: 60,
    shipping: "Giao hàng hỏa tốc toàn quốc",
    species: "dog",
    tags: ["xương gặm cho chó", "forcans dentall", "hình sao 3d", "sạch răng thơm miệng", "vị bạc hà", "chiết xuất trà xanh", "gạo lứt", "dễ tiêu hóa", "không gelatin", "hàn quốc nhập khẩu", "forcans star chew"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },

  // 4. HẠT CHO MÈO (Dry Cat Food) - 10 items
  {
    name: "Hạt Royal Canin Fit 32 cho mèo trưởng thành",
    slug: "hat-royal-canin-fit-32-cho-meo-truong-thanh",
    brandSlug: "royal-canin",
    subCategorySlug: "hat-cho-meo",
    price: 180000,
    originalPrice: 200000,
    discount: 10,
    description: "Thức ăn dinh dưỡng cân bằng hoàn hảo dành cho mèo trưởng thành từ 1 đến 7 tuổi năng động.",
    longDescription: "Royal Canin Fit 32 cung cấp chế độ ăn uống đầy đủ và cân đối với hơn 30 chất dinh dưỡng khác nhau, hỗ trợ đắc lực việc đào thải các búi lông trong dạ dày nhờ hàm lượng xơ dồi dào.",
    specifications: {
      productName: "Royal Canin Fit 32",
      brand: "Royal Canin",
      weight: "2kg",
      type: "Thức ăn hạt khô cho mèo",
      purpose: "Dinh dưỡng cân bằng, tiêu búi lông",
      origin: "Pháp"
    },
    benefits: {
      healthSupport: "Hỗ trợ đào thải búi lông ruột mèo",
      nutritionNeeds: "Protein 32%, Chất béo 15%",
      fatSupport: "Duy trì cân nặng lý tưởng cho mèo nuôi nhà",
      packaging: "Túi ZIP bảo quản kín"
    },
    usage: "Cho ăn khô trực tiếp. Cung cấp đầy đủ nước sạch bên cạnh hạt.",
    ingredients: "Thịt gia cầm khử nước, gạo, lúa mì, ngô, mỡ động vật, xơ thực vật, protein động vật thủy phân, khoáng chất.",
    stock: 70,
    shipping: "Giao hàng hỏa tốc trong 2h",
    species: "cat",
    tags: ["hạt cho mèo", "royal canin", "fit 32", "mèo trưởng thành", "tiêu búi lông", "dinh dưỡng cân bằng", "mèo nuôi nhà", "hạt khô cho mèo", "pháp nhập khẩu", "mèo lớn", "chăm sóc ruột mèo", "royal canin fit 32"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Whiskas vị cá biển thơm ngon cho mèo lớn",
    slug: "hat-whiskas-vi-ca-bien-thom-ngon-cho-meo-lon",
    brandSlug: "whiskas",
    subCategorySlug: "hat-cho-meo",
    price: 115000,
    originalPrice: 130000,
    discount: 12,
    description: "Thức ăn hạt khô vị cá biển thơm ngon ngập tràn nhân xốt sữa kích thích mèo ăn ngon miệng.",
    longDescription: "Hạt Whiskas vị cá biển là lựa chọn phổ biến hàng đầu cho mèo trưởng thành. Những hạt giòn rụm bên ngoài kết hợp lớp nhân sốt cá ngậy béo bên trong mang lại vị ngon khó cưỡng.",
    specifications: {
      productName: "Whiskas Adult Ocean Fish",
      brand: "Whiskas",
      weight: "1.2kg",
      type: "Thức ăn hạt khô nhân sốt",
      purpose: "Dinh dưỡng cơ bản mỗi ngày",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Hỗ trợ hệ niệu khỏe mạnh nhờ kiểm soát khoáng chất",
      nutritionNeeds: "Bổ sung Taurine tốt cho thị lực của mèo",
      fatSupport: "Hương vị cá biển kích thích ăn uống",
      packaging: "Bao nilon dày dặn giữ hương vị"
    },
    usage: "Cho ăn trực tiếp hoặc kết hợp trộn với pate để đổi vị.",
    ingredients: "Ngũ cốc, gluten bắp, bột thịt gia cầm, bột cá biển, dầu cọ, taurine, vitamin tổng hợp.",
    stock: 150,
    shipping: "Giao hàng nhanh toàn quốc",
    species: "cat",
    tags: ["hạt cho mèo lớn", "whiskas", "vị cá biển", "nhân sốt sữa", "thị lực", "taurine", "hệ tiết niệu", "mèo kén ăn", "thái lan", "hạt whiskas adult", "ocean fish", "giá bình dân"],
    images: ["https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Reflex Plus Adult vị cá hồi cho mèo lớn",
    slug: "hat-reflex-plus-adult-vi-ca-hoi-cho-meo-lon",
    brandSlug: "reflex",
    subCategorySlug: "hat-cho-meo",
    price: 135000,
    originalPrice: 150000,
    discount: 10,
    description: "Thức ăn hạt siêu cao cấp nhập khẩu vị cá hồi Đại Tây Dương hỗ trợ da lông cực đỉnh.",
    longDescription: "Reflex Plus Adult Salmon chứa Omega 3 và Omega 6 từ cá hồi chất lượng cao nhập khẩu Thổ Nhĩ Kỳ giúp giảm tình trạng viêm da dị ứng, xơ lông và ngăn ngừa rụng lông hiệu quả ở mèo nuôi trong nhà.",
    specifications: {
      productName: "Reflex Plus Adult Cat Salmon",
      brand: "Reflex",
      weight: "1.5kg",
      type: "Thức ăn hạt siêu cao cấp",
      purpose: "Hạn chế rụng lông, mượt da lông",
      origin: "Thổ Nhĩ Kỳ"
    },
    benefits: {
      healthSupport: "Bộ lông óng mượt bóng khỏe rõ rệt sau 4 tuần",
      nutritionNeeds: "XOS hỗ trợ đường ruột khỏe mạnh",
      fatSupport: "Ngăn ngừa béo phì ở mèo thiến",
      packaging: "Bao khóa ZIP tiện dụng"
    },
    usage: "Cho ăn khô theo lượng chỉ dẫn trên bao bì.",
    ingredients: "Protein cá hồi khử nước, ngô, gạo, mỡ gà, bột củ cải đường, hương cá hồi tự nhiên, men bia khô.",
    stock: 85,
    shipping: "Giao hàng hỏa tốc trong ngày",
    species: "cat",
    tags: ["hạt cho mèo", "reflex plus", "vị cá hồi", "mượt lông mèo", "giảm rụng lông", "omega 3 và 6", "xos lợi khuẩn", "thổ nhĩ kỳ nhập khẩu", "siêu cao cấp", "mèo thiến", "reflex salmon cat"],
    images: ["https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Taste of the Wild Rocky Mountain vị nai nướng",
    slug: "hat-taste-of-the-wild-rocky-mountain-vi-nai-nuong",
    brandSlug: "taste-of-wild",
    subCategorySlug: "hat-cho-meo",
    price: 380000,
    originalPrice: 420000,
    discount: 10,
    description: "Hạt mèo không ngũ cốc siêu cao cấp từ Mỹ chứa thịt nai nướng lò và cá hồi xông khói hoang dã.",
    longDescription: "Mang đậm hương vị hoang dã Rocky Mountain của Mỹ, hạt không chứa ngũ cốc bổ sung protein chất lượng cao từ thịt nai nướng và cá hồi xông khói thích hợp cho mọi giai đoạn phát triển của mèo.",
    specifications: {
      productName: "Taste of the Wild Rocky Mountain Feline",
      brand: "Taste of the Wild",
      weight: "2kg",
      type: "Thức ăn không ngũ cốc (Grain-Free)",
      purpose: "Dinh dưỡng tự nhiên cao cấp nhất, phòng dị ứng",
      origin: "Mỹ"
    },
    benefits: {
      healthSupport: "Tăng khả năng hấp thu dinh dưỡng tốt",
      nutritionNeeds: "Độ đạm cực cao lên đến 42% từ thịt thật",
      fatSupport: "Công thức không độn ngô lúa mì gây béo",
      packaging: "Bao nilon khóa kéo chất lượng"
    },
    usage: "Dùng chung cho mèo con lẫn mèo trưởng thành. Cho ăn trực tiếp.",
    ingredients: "Thịt gà, thịt nai nướng, cá hồi xông khói, khoai lang, đậu hà lan, men bia, quả việt quất khô.",
    stock: 40,
    shipping: "Giao hàng nhanh toàn quốc miễn phí",
    species: "cat",
    tags: ["hạt không ngũ cốc cho mèo", "taste of the wild", "mỹ nhập khẩu", "thịt nai nướng", "cá hồi xông khói", "grain free cat", "siêu cao cấp", "đạm cao 42%", "mọi lứa tuổi", "chống dị ứng", "taste of the wild cat"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Mr.Vet vị thịt gà sấy lạnh bổ dưỡng",
    slug: "hat-mr-vet-vi-thit-ga-say-lanh-bo-duong",
    brandSlug: "mr-vet",
    subCategorySlug: "hat-cho-meo",
    price: 145000,
    originalPrice: 165000,
    discount: 12,
    description: "Thức ăn hạt cao cấp bổ sung ngập tràn các khối thịt gà tươi sấy lạnh nguyên chất.",
    longDescription: "Hạt Mr.Vet kết hợp độc đáo giữa hạt sấy giòn thông thường cùng các miếng thịt gà sấy đông khô thực sự (Freeze-dried) giàu dinh dưỡng, giúp kích thích bản năng nhai xé thịt tự nhiên của loài mèo cưng.",
    specifications: {
      productName: "Mr.Vet Chicken & Freeze-Dried Treats",
      brand: "Mr Vet",
      weight: "1.5kg",
      type: "Hạt trộn thịt sấy lạnh",
      purpose: "Tăng đạm động vật, tăng cân và phát triển cơ",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Giúp mèo tăng cân khỏe mạnh, không tích mỡ xấu",
      nutritionNeeds: "Bổ sung 5% thịt gà sấy đông khô thật",
      fatSupport: "Giàu đạm động vật tinh khiết dễ tiêu",
      packaging: "Bao ZIP mờ sang chảnh"
    },
    usage: "Có thể xóc đều bao trước khi múc để thịt sấy phân bố đều. Cho ăn trực tiếp.",
    ingredients: "Thịt gà tươi khử nước, ngô bột, mỡ gà, thịt gà sấy đông khô 5%, dầu cá hồi, men Saccharomyces.",
    stock: 55,
    shipping: "Giao nhanh nội thành TP.HCM",
    species: "cat",
    tags: ["hạt trộn thịt sấy lạnh", "mr vet", "thịt gà sấy đông khô", "freeze dried cat", "mèo tăng cân", "đạm tinh khiết", "dầu cá hồi", "kích thích vị giác", "mr vet chicken", "mèo cưng ăn ngon"],
    images: ["https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Royal Canin Kitten cho mèo con dưới 12 tháng",
    slug: "hat-royal-canin-kitten-cho-meo-con-duoi-12-thang",
    brandSlug: "royal-canin",
    subCategorySlug: "hat-cho-meo",
    price: 195000,
    originalPrice: 215000,
    discount: 9,
    description: "Thức ăn hạt dinh dưỡng cao cấp dành riêng cho mèo con từ 4 đến 12 tháng tuổi phát triển khung xương vững chắc.",
    longDescription: "Giai đoạn mèo con cần năng lượng dồi dào để phát triển toàn diện. Royal Canin Kitten chứa protein dễ tiêu hóa cao (L.I.P) cùng hệ men vi sinh prebiotics hỗ trợ tối đa hệ tiêu hóa còn non nớt của mèo con.",
    specifications: {
      productName: "Royal Canin Kitten",
      brand: "Royal Canin",
      weight: "2kg",
      type: "Thức ăn hạt khô cho mèo con",
      purpose: "Dành riêng cho mèo con tăng trưởng nhanh",
      origin: "Pháp"
    },
    benefits: {
      healthSupport: "Tăng cường miễn dịch tự nhiên và phát triển não",
      nutritionNeeds: "Canxi và Phốt pho hàm lượng cân đối",
      fatSupport: "Hạt siêu nhỏ dễ nhai nuốt thích hợp mèo con",
      packaging: "Bao khóa ZIP chống gió ẩm"
    },
    usage: "Tham khảo lượng cho ăn theo tuần tuổi. Đảm bảo luôn có nước sạch đi kèm.",
    ingredients: "Protein gia cầm tách béo, gạo, mỡ động vật, ngô, gluten lúa mì, men bia khô, dầu cá.",
    stock: 90,
    shipping: "Giao hàng hỏa tốc trong 2h",
    species: "cat",
    tags: ["hạt cho mèo con", "royal canin", "royal canin kitten", "mèo con dưới 1 tuổi", "phát triển xương", "tăng miễn dịch", "hạt nhỏ dễ nhai", "pháp nhập khẩu", "hệ tiêu hóa non nớt", "dinh dưỡng mèo con"],
    images: ["https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Whiskas Kitten vị cá thu cho mèo con",
    slug: "hat-whiskas-kitten-vi-ca-thu-cho-meo-con",
    brandSlug: "whiskas",
    subCategorySlug: "hat-cho-meo",
    price: 120000,
    originalPrice: 135000,
    discount: 11,
    description: "Thức ăn hạt chứa các túi sữa nhỏ bùi béo kết hợp vị cá thu giòn rụm cho mèo con tập ăn dặm.",
    longDescription: "Hạt Whiskas Kitten chứa các hạt nhỏ hình tròn dễ nhai kèm nhân xốt sữa bò bùi ngậy giúp kích thích vị giác của mèo con từ 2-12 tháng tuổi, mang lại đầy đủ dưỡng chất phát triển nhanh.",
    specifications: {
      productName: "Whiskas Kitten Mackerel with Milk",
      brand: "Whiskas",
      weight: "1.1kg",
      type: "Hạt nhân xốt sữa béo",
      purpose: "Dành cho mèo con cai sữa, tập ăn hạt",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Bổ sung sữa non giúp xương chắc, răng khỏe",
      nutritionNeeds: "Giàu vitamin D, Canxi và Sắt",
      fatSupport: "Kích thước hạt phù hợp khuôn hàm nhỏ",
      packaging: "Bao gói nilon kín giữ ẩm"
    },
    usage: "Nên làm ẩm hạt bằng nước ấm hoặc sữa chuyên dụng cho mèo con trong tháng đầu tiên.",
    ingredients: "Ngũ cốc nguyên hạt, bột gia cầm, bột cá thu 5%, bột sữa non bò, vitamin tổng hợp, dầu nành.",
    stock: 110,
    shipping: "Giao hàng nhanh trong ngày",
    species: "cat",
    tags: ["hạt cho mèo con", "whiskas kitten", "nhân xốt sữa", "cá thu sữa bò", "mèo con cai sữa", "canxi", "vitamin d", "thái lan", "giá bình dân", "hạt nhỏ dễ nhai", "mèo con 2 đến 12 tháng"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Reflex Plus Kitten vị gà siêu bổ dưỡng",
    slug: "hat-reflex-plus-kitten-vi-ga-sieu-bo-duong",
    brandSlug: "reflex",
    subCategorySlug: "hat-cho-meo",
    price: 140000,
    originalPrice: 155000,
    discount: 10,
    description: "Thức ăn siêu cao cấp vị thịt gà tươi nhập khẩu trực tiếp từ Thổ Nhĩ Kỳ dành cho mèo con.",
    longDescription: "Công thức siêu đạm từ thịt gà tươi sạch kết hợp XOS (Xylo-oligosaccharides) giúp tăng tỷ lệ lợi khuẩn đường ruột, hỗ trợ phân mèo con khuôn đẹp và hạn chế mùi hôi phóng uế.",
    specifications: {
      productName: "Reflex Plus Kitten Chicken",
      brand: "Reflex",
      weight: "1.5kg",
      type: "Thức ăn hạt siêu cao cấp",
      purpose: "Phát triển toàn diện và hệ tiêu hóa khỏe mạnh",
      origin: "Thổ Nhĩ Kỳ"
    },
    benefits: {
      healthSupport: "Hạn chế tối đa chứng tiêu chảy ở mèo con",
      nutritionNeeds: "Hàm lượng đạm gà tinh khiết lên tới 36%",
      fatSupport: "Chứa hạt chia giàu Omega bảo vệ da lông",
      packaging: "Bao khóa ZIP nhập khẩu nguyên gói"
    },
    usage: "Dành cho mèo con dưới 1 tuổi. Cho ăn theo nhu cầu ăn uống hàng ngày.",
    ingredients: "Protein thịt gà khô, ngô bột, mỡ gà, gạo lứt, bã củ cải đường, hạt chia sấy, khoáng chất thiết yếu.",
    stock: 65,
    shipping: "Giao hàng tiêu chuẩn toàn quốc",
    species: "cat",
    tags: ["hạt cho mèo con", "reflex plus kitten", "vị gà tươi", "thổ nhĩ kỳ nhập khẩu", "xos hệ tiêu hóa", "giảm mùi hôi phân", "chống tiêu chảy", "hạt chia omega", "đạm cao 36%", "reflex kitten chicken"],
    images: ["https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Taste of the Wild Canyon River vị cá hồi xông khói",
    slug: "hat-taste-of-the-wild-canyon-river-vi-ca-hoi-xong-khoi",
    brandSlug: "taste-of-wild",
    subCategorySlug: "hat-cho-meo",
    price: 390000,
    originalPrice: 430000,
    discount: 9,
    description: "Hạt không ngũ cốc cao cấp nhập khẩu từ Mỹ, chứa các loại cá sông tự nhiên mang lại vị thơm biển sâu dịu mát.",
    longDescription: "Taste of the Wild Canyon River chứa protein từ cá hồi và cá hồ hoang dã mang lại nguồn dinh dưỡng tối ưu và hỗ trợ tối đa hệ tiêu hóa nhạy cảm của các giống mèo nuôi kín trong nhà.",
    specifications: {
      productName: "Taste of the Wild Canyon River Feline",
      brand: "Taste of the Wild",
      weight: "2kg",
      type: "Thức ăn không ngũ cốc (Grain-Free)",
      purpose: "Hạn chế dị ứng và giữ vóc dáng cân đối",
      origin: "Mỹ"
    },
    benefits: {
      healthSupport: "Đặc biệt tốt cho đường ruột và da lông nhạy cảm",
      nutritionNeeds: "Tự nhiên, không dùng màu nhuộm thực phẩm",
      fatSupport: "Đầy đủ dưỡng chất không chứa ngũ cốc tích nước",
      packaging: "Bao nilon bạc ép nhiệt cao cấp"
    },
    usage: "Đổ trực tiếp ra bát ăn hàng ngày cho mèo.",
    ingredients: "Cá hồi tươi, cá hồi khô, khoai lang, khoai tây bột, protein hạt đậu, dầu hạt cải, cá hồi xông khói tự nhiên.",
    stock: 35,
    shipping: "Giao hàng nhanh toàn quốc miễn phí",
    species: "cat",
    tags: ["hạt không ngũ cốc cho mèo", "taste of the wild", "canyon river", "cá hồi xông khói", "mỹ nhập khẩu", "không ngũ cốc", "mèo nhạy cảm", "giảm dị ứng", "đẹp da lông", "đạm cá hồi", "taste of the wild canyon"],
    images: ["https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Hạt Mr.Vet vị cá ngừ sấy đông khô nguyên tảng",
    slug: "hat-mr-vet-vi-ca-ngu-say-dong-kho-nguyen-tang",
    brandSlug: "mr-vet",
    subCategorySlug: "hat-cho-meo",
    price: 150000,
    originalPrice: 170000,
    discount: 12,
    description: "Hạt sấy giòn trộn 5% cá ngừ đông khô cắt nhỏ cung cấp bữa ăn biển sâu cực kỳ hấp dẫn.",
    longDescription: "Mr.Vet Cá Ngừ kết hợp hương vị tươi mát của cá ngừ tự nhiên cùng công nghệ sấy thăng hoa tiên tiến, giữ nguyên vẹn cấu trúc sợi thịt dai ngọt cùng hương vị thơm hấp dẫn khiến mọi chú mèo thích thú nhai ngấu nghiến.",
    specifications: {
      productName: "Mr.Vet Tuna & Freeze-Dried Treats",
      brand: "Mr Vet",
      weight: "1.5kg",
      type: "Hạt trộn cá sấy đông khô",
      purpose: "Hấp dẫn mèo kén ăn, bổ sung Omega tốt cho tim mạch",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Tim mạch khỏe mạnh, mắt sáng lanh lợi",
      nutritionNeeds: "Bổ sung Taurine và Omega 3 phong phú",
      fatSupport: "Nguồn đạm cá ngừ ít béo",
      packaging: "Bao bì ZIP mờ tinh tế"
    },
    usage: "Cho ăn trực tiếp hàng ngày.",
    ingredients: "Cá ngừ khô, bột ngô, cá ngừ sấy đông khô nguyên tảng 5%, mỡ gà sạch, taurine, vitamin và khoáng chất.",
    stock: 50,
    shipping: "Giao hàng nhanh nội thành 2h",
    species: "cat",
    tags: ["hạt trộn cá sấy khô", "mr vet", "cá ngừ sấy lạnh", "mèo kén ăn", "taurine sáng mắt", "omega 3 tim mạch", "freeze dried tuna", "mr vet cat tuna", "đạm cá ngừ"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },

  // 5. PATE CHO MÈO (Wet Cat Food) - 10 items
  {
    name: "Pate Whiskas gói vị cá thu và cá hồi sốt mịn",
    slug: "pate-whiskas-goi-vi-ca-thu-va-ca-hoi-sot-min",
    brandSlug: "whiskas",
    subCategorySlug: "pate-cho-meo",
    price: 15500,
    originalPrice: 17000,
    discount: 9,
    description: "Thức ăn dạng ướt vị cá thu và cá hồi ngập trong nước sốt sánh đặc cực kỳ bổ dưỡng cho mèo lớn.",
    longDescription: "Pate gói Whiskas vị cá thu cá hồi cung cấp nguồn ẩm dồi dào cùng các chất dinh dưỡng cần thiết cho mèo. Gói nhỏ tiện lợi chỉ cần mở xé ra đĩa cho mèo liếm láp sạch sẽ.",
    specifications: {
      productName: "Whiskas Adult Mackerel & Salmon Gravy Pouch",
      brand: "Whiskas",
      weight: "85g",
      type: "Pate xốt nước sốt (Wet food)",
      purpose: "Bữa ăn nhẹ giàu nước, bổ sung khoáng chất",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Ngăn ngừa sỏi thận hiệu quả nhờ bù nước",
      nutritionNeeds: "Chứa kẽm và dầu cá hồi cho lông bóng",
      fatSupport: "Dễ nuốt, kích thích thèm ăn",
      packaging: "Gói nhôm ép 85g tiện dụng"
    },
    usage: "Cho ăn trực tiếp 1-2 gói mỗi ngày tùy kích thước mèo. Nên kết hợp cùng hạt khô.",
    ingredients: "Cá thu thật, cá hồi thật, bột lúa mì, thịt đỏ cá ngừ, khoáng chất và vitamin tổng hợp.",
    stock: 300,
    shipping: "Giao hàng siêu nhanh trong 2h",
    species: "cat",
    tags: ["pate cho mèo", "whiskas pouch", "vị cá thu cá hồi", "pate sốt mịn", "bù nước ngăn sỏi thận", "dầu cá hồi mượt lông", "thức ăn ướt cho mèo", "whiskas adult pouch", "tiện lợi mở gói", "thái lan"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Snappy Tom lon vị thịt gà thơm bùi",
    slug: "pate-snappy-tom-lon-vi-thit-ga-thom-bui",
    brandSlug: "snappy-tom",
    subCategorySlug: "pate-cho-meo",
    price: 32000,
    originalPrice: 35000,
    discount: 9,
    description: "Pate lon vị gà thơm ngậy từ thương hiệu nổi tiếng Úc Snappy Tom, hoàn toàn từ thịt gà thật.",
    longDescription: "Snappy Tom Chicken Feast mang đến hương vị thịt gà thơm bùi được ninh nhừ nhuyễn mịn, cung cấp chất đạm dồi dào, phù hợp cho mèo kén ăn cá hoặc dị ứng hải sản.",
    specifications: {
      productName: "Snappy Tom Chicken Feast Can",
      brand: "Snappy Tom",
      weight: "400g",
      type: "Pate lon xay nhuyễn",
      purpose: "Bữa ăn chính dinh dưỡng toàn diện",
      origin: "Thái Lan (Công nghệ Úc)"
    },
    benefits: {
      healthSupport: "Phù hợp mèo nhạy cảm, ngừa dị ứng hải sản",
      nutritionNeeds: "Chứa Taurine thiết yếu cho mắt sáng",
      fatSupport: "Không phụ gia tạo đặc nhân tạo",
      packaging: "Lon lớn tiết kiệm 400g"
    },
    usage: "Dùng trực tiếp. Bảo quản tủ lạnh sau khi mở nắp, đậy kín nắp nhựa bảo vệ.",
    ingredients: "Thịt gà 60%, thạch rau câu đông tự nhiên, nước dùng gia cầm tươi, vitamin E, taurine.",
    stock: 150,
    shipping: "Giao nhanh toàn quốc",
    species: "cat",
    tags: ["pate lon cho mèo", "snappy tom can", "vị thịt gà", "ngừa dị ứng hải sản", "taurine sáng mắt", "pate lon lớn 400g", "úc thương hiệu", "thức ăn ướt thịt gà", "không tinh bột độn", "mèo lớn ăn ngon", "snappy tom chicken"],
    images: ["https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Nekko vị cá ngừ trong thạch Jelly",
    slug: "pate-nekko-vi-ca-ngu-trong-thach-jelly",
    brandSlug: "nekko",
    subCategorySlug: "pate-cho-meo",
    price: 18000,
    originalPrice: 20000,
    discount: 10,
    description: "Thịt cá ngừ xé nhỏ cao cấp ngập trong thạch rau câu giòn mát hảo hạng từ Nhật Bản.",
    longDescription: "Pate Nekko Jelly mang lại hương vị cá ngừ tươi nguyên bản, được đóng gói giữ trọn hương vị tươi ngon. Lớp thạch jelly mát lạnh giúp kích thích cảm giác thèm ăn của mèo cưng.",
    specifications: {
      productName: "Nekko Tuna in Jelly Pouch",
      brand: "Nekko",
      weight: "70g",
      type: "Thịt cá xé trong thạch (Jelly)",
      purpose: "Bữa ăn phụ giải nhiệt bổ dưỡng",
      origin: "Thái Lan (Chuẩn Nhật Bản)"
    },
    benefits: {
      healthSupport: "Làm mát cơ thể mèo, dễ hấp thu nước",
      nutritionNeeds: "Giàu Omega-3 và vitamin E giúp mượt lông",
      fatSupport: "Không màu hóa học, cực ít calo béo",
      packaging: "Gói nhôm sang trọng có rãnh xé nhanh"
    },
    usage: "Xé gói cho mèo ăn trực tiếp. Nên kết hợp đan xen cùng hạt khô.",
    ingredients: "Cá ngừ tươi trắng sạch 50%, bột thạch agar tự nhiên, dầu cá hồi, vitamin E, taurine.",
    stock: 250,
    shipping: "Giao nhanh nội thành 2h",
    species: "cat",
    tags: ["pate cho mèo", "pate nekko", "nekko jelly", "thịt cá ngừ xé", "thạch jelly giòn mát", "nhật bản công nghệ", "omega 3 mượt lông", "vitamin e", "pate gói nhỏ 70g", "giải nhiệt cơ thể", "nekko tuna jelly"],
    images: ["https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Aatas Cat vị cá hồi hảo hạng ngập sốt",
    slug: "pate-aatas-cat-vi-ca-hoi-hao-hang-ngap-sot",
    brandSlug: "aatas",
    subCategorySlug: "pate-cho-meo",
    price: 24000,
    originalPrice: 28000,
    discount: 14,
    description: "Lon pate cắt khúc cá hồi hảo hạng chan xốt mướt mịn dành riêng cho những chú mèo khó tính nhất.",
    longDescription: "Aatas Cat mang đến trải nghiệm thượng hạng từ Singapore với từng khúc cá hồi tươi giòn tan, ngập trong nước sốt cá đậm đà béo ngậy. Rất giàu axit béo Omega-3 tự nhiên hỗ trợ đắc lực giảm rụng lông.",
    specifications: {
      productName: "Aatas Cat Salmon in Gravy Can",
      brand: "Aatas",
      weight: "80g",
      type: "Khúc cá sốt nước (Gravy)",
      purpose: "Bữa ăn thượng hạng chống kén ăn",
      origin: "Thái Lan (Đăng ký thương hiệu Singapore)"
    },
    benefits: {
      healthSupport: "Giúp lông bóng khỏe, giảm khô xơ lông",
      nutritionNeeds: "Giàu Omega-3 tốt cho tim và khớp",
      fatSupport: "Hoàn toàn từ nguồn đạm cá thật sạch",
      packaging: "Lon nhôm nhỏ gọn, sạch sẽ"
    },
    usage: "Dùng trực tiếp. Khuyên dùng 1-2 lon mỗi ngày làm bữa ăn đổi món ngon miệng.",
    ingredients: "Cá hồi tươi cắt khúc 40%, nước dùng cá hồi, tinh bột sắn làm đặc, khoáng chất, vitamin E.",
    stock: 140,
    shipping: "Giao hàng nhanh toàn quốc",
    species: "cat",
    tags: ["pate lon cho mèo", "aatas cat", "vị cá hồi sốt", "khúc cá hồi thật", "singapore thương hiệu", "omega 3 bóng lông", "giảm xơ lông", "mèo kén ăn ngon miệng", "aatas salmon gravy", "pate cao cấp lon nhỏ"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate lon King's Pet vị cá hồi tươi mọng nước",
    slug: "pate-lon-kings-pet-vi-ca-hoi-tuoi-mong-nuoc",
    brandSlug: "kings-pet",
    subCategorySlug: "pate-cho-meo",
    price: 49000,
    originalPrice: 55000,
    discount: 11,
    description: "Pate tươi đóng lon vị cá hồi sánh mịn, siêu cấp nước giúp phòng ngừa bệnh tiết niệu ở mèo.",
    longDescription: "Với thành phần cá hồi tươi sống cao cấp, pate King's Pet Cá Hồi mang lại độ mềm ẩm hoàn hảo, kết cấu mịn màng giúp cơ thể mèo hấp thu nước tốt nhất có thể, tránh nguy cơ sỏi bàng quang phổ biến ở mèo.",
    specifications: {
      productName: "Pate King's Pet Salmon Feast",
      brand: "King's Pet",
      weight: "400g",
      type: "Pate tươi đóng lon nhuyễn",
      purpose: "Bù nước chủ động, bữa ăn chính",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Phòng ngừa sỏi thận hiệu quả nhờ độ ẩm 83%",
      nutritionNeeds: "Bổ sung lượng Omega dồi dào từ da cá hồi tươi",
      fatSupport: "Không trộn bột, không hóa chất bảo quản",
      packaging: "Lon lớn kèm nắp nhựa dẻo đóng lại sau dùng"
    },
    usage: "Dùng trực tiếp hoặc trộn hạt. Đậy kín nắp nhựa bảo quản lạnh tối đa 7 ngày sau khi khui lon.",
    ingredients: "Cá hồi tươi 35%, cá ngừ đỏ 35%, nước dùng súp, gel đông thực phẩm.",
    stock: 90,
    shipping: "Giao nhanh nội thành TP.HCM",
    species: "cat",
    tags: ["pate tươi đóng lon", "pate cho mèo", "kings pet", "vị cá hồi", "bù nước hệ tiết niệu", "chống sỏi thận mèo", "không chất bảo quản", "da cá hồi giàu omega", "kings pet salmon", "pate tươi 400g"],
    images: ["https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Whiskas Kitten gói vị cá thu béo ngậy cho mèo con",
    slug: "pate-whiskas-kitten-goi-vi-ca-thu-beo-ngay-cho-meo-con",
    brandSlug: "whiskas",
    subCategorySlug: "pate-cho-meo",
    price: 16000,
    originalPrice: 18000,
    discount: 11,
    description: "Pate gói dành riêng cho mèo con từ 2-12 tháng tuổi vị cá thu béo ngon giúp dễ nhai hấp thu.",
    longDescription: "Chứa các khúc thịt cá thu được nghiền mềm mịn ngập trong nước sốt sữa dinh dưỡng, bổ sung canxi và khoáng chất tăng sức đề kháng cho mèo con lớn nhanh như thổi.",
    specifications: {
      productName: "Whiskas Kitten Mackerel Pouch",
      brand: "Whiskas",
      weight: "85g",
      type: "Pate xốt lỏng nghiền mềm",
      purpose: "Bữa ăn ăn dặm cho mèo con",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Dễ nhai, kích thích cơ hàm nhỏ của mèo con",
      nutritionNeeds: "Bổ sung Vitamin D, Canxi và Sữa bò non",
      fatSupport: "Ngon miệng, tăng cân nhanh",
      packaging: "Gói nhôm ép bền dai"
    },
    usage: "Bóp đều gói trước khi xé mở, dọn ra đĩa cho mèo ăn.",
    ingredients: "Cá thu tươi, gan bò phụ phẩm, gluten lúa mì, dầu nành béo, khoáng chất làm sạch răng, sữa bột bò.",
    stock: 180,
    shipping: "Giao hàng nhanh toàn quốc",
    species: "cat",
    tags: ["pate cho mèo con", "whiskas kitten pouch", "vị cá thu", "nước sốt sữa bò", "cai sữa ăn dặm", "canxi", "vitamin d", "dễ nhai dễ tiêu hóa", "tăng đề kháng", "mèo con dưới 1 tuổi", "whiskas kitten mackerel"],
    images: ["https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Snappy Tom vị cá ngừ và gà dạng lon lớn",
    slug: "pate-snappy-tom-vi-ca-ngu-va-ga-dang-lon-lon",
    brandSlug: "snappy-tom",
    subCategorySlug: "pate-cho-meo",
    price: 32000,
    originalPrice: 35000,
    discount: 9,
    description: "Sự kết hợp hoàn hảo giữa cá ngừ đại dương tươi rói cùng gà xé thơm bùi trong lon to siêu tiết kiệm.",
    longDescription: "Snappy Tom Tuna & Chicken mang lại đạm kép phong phú từ cá ngừ đỏ và ức gà tươi. Thức ăn hạt ướt dạng đông nhẹ đông tự nhiên, rất thích hợp làm bữa ăn chính cho các gia đình đông mèo cưng.",
    specifications: {
      productName: "Snappy Tom Tuna with Chicken Can",
      brand: "Snappy Tom",
      weight: "400g",
      type: "Pate đông nhẹ đông tự nhiên",
      purpose: "Bữa ăn chính dinh dưỡng đa dạng đạm",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Không độn bột ngô, không gây khó tiêu",
      nutritionNeeds: "Đầy đủ dưỡng chất axit béo Omega-3 tự nhiên",
      fatSupport: "Ít béo, ngừa béo phì",
      packaging: "Lon thiếc cao cấp 400g"
    },
    usage: "Dùng trực tiếp. Đậy kín lon bảo quản mát tủ lạnh.",
    ingredients: "Cá ngừ đỏ 40%, thịt gà 20%, thạch agar, vitamin E tổng hợp, chất chống oxy hóa tự nhiên.",
    stock: 160,
    shipping: "Giao hàng nhanh 2h",
    species: "cat",
    tags: ["pate lon cho mèo", "snappy tom can", "cá ngừ và gà xé", "pate đông thạch agar", "lon lớn 400g tiết kiệm", "đạm kép", "không độn tinh bột", "omega 3 tự nhiên", "mèo nhà ăn ngon", "snappy tom tuna chicken"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Nekko Jelly vị cá ngừ và thanh cua ngon ngọt",
    slug: "pate-nekko-jelly-vi-ca-ngu-va-thanh-cua-ngon-ngot",
    brandSlug: "nekko",
    subCategorySlug: "pate-cho-meo",
    price: 18500,
    originalPrice: 21000,
    discount: 12,
    description: "Những thỏi thanh cua đỏ mọng ngọt thơm ngập trong thạch cá ngừ hảo hạng chinh phục mọi chú mèo nuôi.",
    longDescription: "Sản phẩm là phiên bản cao cấp từ Nekko Nhật Bản. Thanh cua biển dai ngọt cắt khúc nhỏ vừa nhai trộn chung cá ngừ trắng hảo hạng trong lớp thạch giòn mát giúp mèo sảng khoái và ngon miệng vô cùng.",
    specifications: {
      productName: "Nekko Tuna with Kanikama in Jelly Pouch",
      brand: "Nekko",
      weight: "70g",
      type: "Cá xé và thanh cua trong thạch (Jelly)",
      purpose: "Bữa ăn đổi vị ngọt dịu cho mèo kén ăn",
      origin: "Thái Lan (Hợp tác Nhật Bản)"
    },
    benefits: {
      healthSupport: "Hệ miễn dịch khỏe mạnh nhờ chiết xuất trà xanh kháng khuẩn",
      nutritionNeeds: "Cung cấp Protein, Taurine dồi dào",
      fatSupport: "Không chứa các chất béo xấu bão hòa",
      packaging: "Gói nhôm mạ bạc rực rỡ"
    },
    usage: "Cho ăn trực tiếp. Nên bổ dung thường xuyên để mèo bù nước.",
    ingredients: "Cá ngừ đỏ, thanh cua biển 10%, thạch thực vật, prebiotics hỗ trợ ruột cún mèo, vitamin E.",
    stock: 220,
    shipping: "Giao hàng nhanh trong ngày",
    species: "cat",
    tags: ["pate gói cho mèo", "pate nekko", "nekko jelly", "thịt cá ngừ thanh cua", "thanh cua biển ngọt dai", "nhật bản chuẩn", "chiết xuất trà xanh kháng khuẩn", "prebiotics tốt ruột", "mèo kén ăn ngon", "nekko tuna kanikama"],
    images: ["https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate Aatas Cat vị gà xé nhỏ thơm ngon",
    slug: "pate-aatas-cat-vi-ga-xe-nho-thom-ngon",
    brandSlug: "aatas",
    subCategorySlug: "pate-cho-meo",
    price: 24500,
    originalPrice: 28000,
    discount: 13,
    description: "Ức gà xé sợi nhỏ mọng nước ngập trong sốt gà ninh ngọt từ nhãn hàng Aatas danh tiếng.",
    longDescription: "Mèo cưng rất yêu thích cấu trúc sợi thịt dai ngọt tự nhiên. Aatas Cat Chicken in Gravy sử dụng thịt ức gà nạc xé tay nhỏ dễ nhai, hòa quyện sốt cô đặc ngọt thanh tự nhiên giúp bữa ăn của mèo ngập tràn hứng khởi.",
    specifications: {
      productName: "Aatas Cat Chicken in Gravy Can",
      brand: "Aatas",
      weight: "80g",
      type: "Thịt gà xé trong sốt lỏng",
      purpose: "Bữa ăn giàu đạm nạc ít béo cho mèo nuôi nhà",
      origin: "Thái Lan"
    },
    benefits: {
      healthSupport: "Kiểm soát cân nặng lý tưởng, không tăng calo béo",
      nutritionNeeds: "Nạc ức gà tinh khiết dễ tiêu hóa hấp thu",
      fatSupport: "Phù hợp mèo già hệ tiêu hóa yếu",
      packaging: "Lon nhôm mỏng nhẹ có nắp giật"
    },
    usage: "Dùng trực tiếp 1-2 lon/ngày tùy nhu cầu của mèo.",
    ingredients: "Thịt ức gà nạc 45%, nước dùng súp gà, bột sắn làm sánh sốt, vitamin E dưỡng da lông cún mèo.",
    stock: 130,
    shipping: "Giao hàng nhanh chóng",
    species: "cat",
    tags: ["pate lon cho mèo", "aatas cat can", "thịt gà xé tay", "nước sốt gà ninh", "ít béo kiểm soát cân nặng", "mèo lớn mèo già", "đạm nạc dễ tiêu", "singapore thương hiệu", "aatas chicken gravy"],
    images: ["https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Pate lon King's Pet vị cá ngừ sạch thơm ngon",
    slug: "pate-lon-kings-pet-vi-ca-ngu-sach-thom-ngon",
    brandSlug: "kings-pet",
    subCategorySlug: "pate-cho-meo",
    price: 45000,
    originalPrice: 50000,
    discount: 10,
    description: "Pate đóng lon cỡ đại từ nguồn cá ngừ đại dương tươi rói đánh bắt trực tiếp, thơm ngậy cuốn hút.",
    longDescription: "Hương vị cá ngừ đại dương tươi ngon bùi béo kết cấu mịn nhuyễn mọng nước, là bữa ăn chính ngon miệng giúp bảo vệ hệ đường ruột và cung cấp dưỡng chất cần thiết cho bé mèo khỏe mạnh lanh lợi.",
    specifications: {
      productName: "Pate King's Pet Tuna Feast Can",
      brand: "King's Pet",
      weight: "400g",
      type: "Pate tươi xay nhuyễn mịn",
      purpose: "Bữa ăn chính tiết kiệm, bù nước tối đa",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Ngăn bệnh đường tiết niệu, thận mèo",
      nutritionNeeds: "Tự nhiên, không pha bột lúa mì hay bột ngô",
      fatSupport: "Giàu axit amin thiết yếu hỗ trợ tim",
      packaging: "Lon thiếc cứng cáp kèm nắp nhựa dẻo dai"
    },
    usage: "Cho ăn trực tiếp. Giữ lạnh đậy nắp sau khi mở bao bì.",
    ingredients: "Cá ngừ tươi đánh bắt sạch 70%, thạch agar tự nhiên, nước tinh khiết giải nhiệt.",
    stock: 110,
    shipping: "Giao nhanh trong 2h",
    species: "cat",
    tags: ["pate tươi cho mèo", "kings pet can", "vị cá ngừ đại dương", "lon lớn 400g tiết kiệm", "ngừa sỏi thận tiết niệu", "bù nước chủ động", "không độn tinh bột", "axit amin bổ tim", "kings pet tuna can"],
    images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"]
  },

  // 6. SNACK / CÁT / ĐỒ CHƠI CHO MÈO - 10 items
  {
    name: "Súp thưởng Ciao Churu vị cá ngừ thanh ngọt",
    slug: "sup-thuong-ciao-churu-vi-ca-ngu-thanh-ngot",
    brandSlug: "whiskas",
    subCategorySlug: "snack-cho-meo",
    price: 45000,
    originalPrice: 50000,
    discount: 10,
    description: "Súp thưởng dạng sệt liếm láp vị cá ngừ thơm ngon nổi tiếng Nhật Bản đốn gục mọi chú mèo cưng.",
    longDescription: "Súp thưởng Ciao Churu giúp tăng sự tương tác thân thiết giữa bạn và mèo. Dạng súp lỏng mịn, hương cá ngừ ngậy thơm, rất dễ liếm và hỗ trợ bù nước hữu ích cho các bé mèo lười uống nước.",
    specifications: {
      productName: "Ciao Churu Tuna Puree Treat",
      brand: "Whiskas",
      weight: "56g (4 thanh x 14g)",
      type: "Súp thưởng dạng sệt",
      purpose: "Thưởng tương tác, cấp nước nhanh chóng",
      origin: "Nhật Bản"
    },
    benefits: {
      healthSupport: "Bổ sung lượng nước lớn phòng bệnh thận mèo",
      nutritionNeeds: "Có chứa tinh chất trà xanh làm giảm mùi hôi phân",
      fatSupport: "Không ngũ cốc độn béo",
      packaging: "Túi nilon chứa 4 thanh súp nhỏ dài tiện lợi"
    },
    usage: "Xé đầu thanh súp nhỏ rồi bóp nhẹ từ từ cho mèo liếm trực tiếp.",
    ingredients: "Cá ngừ trắng tươi, tinh bột sắn làm đặc, hương cá ngừ cô đặc, vitamin E, chiết xuất trà xanh.",
    stock: 250,
    shipping: "Giao hàng nhanh toàn quốc",
    species: "cat",
    tags: ["súp thưởng cho mèo", "ciao churu", "vị cá ngừ", "thức ăn sệt liếm", "bù nước cho mèo lười", "trà xanh khử mùi phân", "snack cho mèo", "bánh thưởng mèo", "ciao nhật bản", "ciao churu tuna"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Cát vệ sinh cho mèo PetQ hương chanh thơm mát",
    slug: "cat-ve-sinh-cho-meo-petq-huong-chanh-thom-mat",
    brandSlug: "petq",
    subCategorySlug: "cat-ve-sinh-cho-meo",
    price: 65000,
    originalPrice: 75000,
    discount: 13,
    description: "Cát vệ sinh đất sét Bentonite vón cục nhanh, khóa mùi hiệu quả cùng hương chanh sảng khoái.",
    longDescription: "Cát bentonite đất sét tự nhiên PetQ có khả năng vón cục cực nhanh chỉ sau 3 giây khi gặp nước thải mèo cưng, hạn chế bụi tối đa, bảo vệ hô hấp cho cả mèo lẫn người nuôi.",
    specifications: {
      productName: "PetQ Lemon Bentonite Cat Litter",
      brand: "PetQ",
      weight: "5kg (8L)",
      type: "Cát đất sét bentonite",
      purpose: "Vệ sinh khay cát cho mèo uế phóng",
      origin: "Trung Quốc (Công nghệ PetQ)"
    },
    benefits: {
      healthSupport: "Diệt khuẩn khử mùi tốt, ít bám chân mèo",
      nutritionNeeds: "Không độc hại cho mèo nhạy cảm",
      fatSupport: "Khóa chặt mùi hôi amoniac tức thì",
      packaging: "Bao nilon dày chống rách có tay quai xách"
    },
    usage: "Đổ cát vào khay vệ sinh sâu tối thiểu 6-8cm. Dùng xẻng hốt các cục vón bẩn vứt đi mỗi ngày.",
    ingredients: "Đất sét bentonite tự nhiên 100%, hạt hương liệu chanh khử mùi sảng khoái.",
    stock: 120,
    shipping: "Giao nhanh toàn quốc phí ưu đãi",
    species: "cat",
    tags: ["cát vệ sinh cho mèo", "cát đất sét bentonite", "petq litter", "vón cục nhanh", "khóa mùi hương chanh", "ít bụi bảo vệ hô hấp", "đất sét bentonite chanh", "khay cát vệ sinh mèo", "petq lemon"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Cát đất sét bentonite Snappy Tom mùi oải hương dịu nhẹ",
    slug: "cat-dat-set-bentonite-snappy-tom-mui-oai-huong-diu-nhe",
    brandSlug: "snappy-tom",
    subCategorySlug: "cat-ve-sinh-cho-meo",
    price: 70000,
    originalPrice: 80000,
    discount: 13,
    description: "Cát đất sét vón cục siêu tốc từ Úc hương hoa oải hương (Lavender) thơm dịu, lấn át mọi mùi khó chịu.",
    longDescription: "Snappy Tom Lavender Litter sử dụng đất sét tự nhiên tinh khiết chất lượng cao. Khả năng khóa chất lỏng và vón siêu cứng giúp tiết kiệm lượng cát sử dụng và dễ thu dọn khay vệ sinh.",
    specifications: {
      productName: "Snappy Tom Lavender Cat Litter",
      brand: "Snappy Tom",
      weight: "5kg (8L)",
      type: "Cát đất sét vón cứng",
      purpose: "Khử mùi hôi phân mèo uế, vệ sinh mèo",
      origin: "Trung Quốc (Công nghệ Úc)"
    },
    benefits: {
      healthSupport: "Ít bụi bảo vệ mắt mèo cưng tránh ghèn viêm",
      nutritionNeeds: "Ngăn sự sinh sôi nấm mốc trong khay cát",
      fatSupport: "Mùi oải hương dễ chịu thanh lọc phòng nuôi",
      packaging: "Bao dập quai xách tiện lợi"
    },
    usage: "Đổ cát dày 7-10cm vào khay vệ sinh sạch sẽ khô ráo của mèo.",
    ingredients: "Đất sét khoáng thiên nhiên bentonite, hạt tinh dầu oải hương kháng khuẩn.",
    stock: 100,
    shipping: "Giao nhanh nội thành TP.HCM",
    species: "cat",
    tags: ["cát vệ sinh cho mèo", "snappy tom litter", "cát bentonite oải hương", "hương hoa lavender", "vón cục siêu cứng", "tiết kiệm cát", "khử mùi hôi amoniac", "ít bụi hại mắt mèo", "snappy tom lavender"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Đồ chơi cần câu mèo lông vũ Fofos vui nhộn",
    slug: "do-choi-can-cau-meo-long-vu-fofos-vui-nhon",
    brandSlug: "fofos",
    subCategorySlug: "do-choi-cho-meo",
    price: 49000,
    originalPrice: 60000,
    discount: 18,
    description: "Đồ chơi cần câu tay cầm đàn hồi kết hợp lông vũ tự nhiên sắc màu và chuông kêu lanh coong.",
    longDescription: "Cần câu mèo Fofos giúp mèo cưng vận động nhảy cao bắt mồi, giải tỏa căng thẳng stress và tránh béo phì. Lông vũ tự nhiên nhuộm an toàn, có chuông kêu kích thích thính giác mèo tột độ.",
    specifications: {
      productName: "Fofos Teaser Wand Feather Toy",
      brand: "Fofos",
      weight: "50g",
      type: "Cần câu chơi với mèo",
      purpose: "Tăng tương tác, giúp mèo tập nhảy vận động cơ khớp",
      origin: "Trung Quốc"
    },
    benefits: {
      healthSupport: "Đốt mỡ thừa cún mèo, giảm stress tù túng nhà",
      nutritionNeeds: "Nhựa ABS đàn hồi cao cấp siêu bền dẻo",
      fatSupport: "Kích thích hoạt động tự nhiên bản năng mèo",
      packaging: "Gói thẻ treo nilon tiện bày bán"
    },
    usage: "Cầm tay vẩy lắc trước mặt mèo kích thích bé vồ bắt.",
    ingredients: "Nhựa dẻo đàn hồi, lông vũ chim tự nhiên tiệt trùng, lục lạc kim loại không gỉ.",
    stock: 60,
    shipping: "Giao hàng nhanh trong ngày",
    species: "cat",
    tags: ["đồ chơi cho mèo", "cần câu mèo", "lông vũ tự nhiên", "fofos toy", "chuông kêu lanh coong", "mèo vận động", "chống stress trầm cảm mèo", "tay cầm đàn hồi", "fofos feather wand", "tương tác chủ nuôi"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Đồ chơi chuột bông cho mèo CattyMan xịn sò",
    slug: "do-choi-chuot-bong-cho-meo-cattyman-xin-so",
    brandSlug: "catty-man",
    subCategorySlug: "do-choi-cho-meo",
    price: 35000,
    originalPrice: 40000,
    discount: 13,
    description: "Chuột bông mềm nhồi cỏ mèo catnip kích thích kích thích mèo ôm ấp cào vồ vui nhộn.",
    longDescription: "Chuột bông CattyMan Nhật Bản được may tỉ mỉ bền chắc với chất liệu vải bố tự nhiên siêu dai chịu cào cắn tốt. Bên trong nhồi lá cỏ mèo catnip sấy khô thơm dịu tạo phấn khích cực lớn cho mèo.",
    specifications: {
      productName: "CattyMan Catnip Stuffed Mouse Toy",
      brand: "Catty Man",
      weight: "20g",
      type: "Đồ chơi nhồi cỏ mèo (Catnip)",
      purpose: "Giải trí tự chơi cho mèo, cào vồ giải tỏa cuồng chân",
      origin: "Việt Nam (Hợp tác Nhật Bản)"
    },
    benefits: {
      healthSupport: "Làm thư thái tinh thần mèo nhờ tinh dầu catnip",
      nutritionNeeds: "Vải bố dệt organic dai chắc chịu lực cào",
      fatSupport: "Giúp mèo tự chơi cả ngày không chán",
      packaging: "Thẻ kẹp treo giấy thân thiện môi trường"
    },
    usage: "Ném cho mèo ôm cào đùa giỡn tự nhiên.",
    ingredients: "Vải bố đay cotton tự nhiên, bông gòn sợi mềm, lá cỏ mèo khô catnip.",
    stock: 140,
    shipping: "Giao nhanh toàn quốc",
    species: "cat",
    tags: ["đồ chơi cho mèo", "cattyman", "chuột bông nhồi catnip", "cỏ mèo sấy khô", "vải bố tự nhiên siêu dai", "mèo cào móng giải trí", "chuột giả cho mèo", "cattyman mouse toy", "tinh thần phấn khích"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Lược chải lông mèo CattyMan cán gỗ bền đẹp",
    slug: "luoc-chai-long-meo-cattyman-can-go-ben-dep",
    brandSlug: "catty-man",
    subCategorySlug: "luoc-chai-long-meo",
    price: 110000,
    originalPrice: 130000,
    discount: 15,
    description: "Lược kim chải lông mèo rụng cán gỗ xà cừ cao cấp, đầu đinh bọc silicon không gây xước da.",
    longDescription: "Lược chải lông CattyMan cán gỗ cầm đầm tay sang trọng. Đầu răng kim thép không gỉ đàn hồi cao được bọc đầu tròn silicon êm ái mát-xa kích thích tuần hoàn máu da cún mèo giúp mọc lông nhanh mềm mịn.",
    specifications: {
      productName: "CattyMan Wooden Handle Slicker Brush",
      brand: "Catty Man",
      weight: "150g",
      type: "Dụng cụ chăm sóc lông (Brush)",
      purpose: "Gỡ rối lông mèo, lấy đi lông chết rụng tránh liếm bụng",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Giảm tình trạng mèo nuốt lông gây tắc ruột",
      nutritionNeeds: "Cán gỗ xà cừ tự nhiên siêu bền, sang trọng",
      fatSupport: "Mát-xa nướu da dịu nhẹ không gây đau",
      packaging: "Vỉ ép nhựa chống bụi bám lược"
    },
    usage: "Chải xuôi theo hướng lông mọc từ đầu xuống đuôi. Chải nhẹ nhàng vùng bụng và sau tai mèo.",
    ingredients: "Gỗ xà cừ tự nhiên, răng kim thép đàn hồi không gỉ, đệm cao su dẻo mềm.",
    stock: 45,
    shipping: "Giao hàng nhanh trong 2h",
    species: "cat",
    tags: ["lược chải lông mèo", "cattyman", "gỡ rối lông mèo", "lấy lông chết rụng", "cán gỗ xà cừ", "đầu đinh bọc silicon", "mát xa da mèo", "ngừa tắc ruột do búi lông", "cattyman brush", "chăm sóc lông mèo"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Gel dinh dưỡng vitamin mèo Forcans hỗ trợ lông mượt",
    slug: "gel-dinh-duong-vitamin-meo-forcans-ho-tro-long-muot",
    brandSlug: "forcans",
    subCategorySlug: "vitamin-supplement-cho-meo",
    price: 185000,
    originalPrice: 210000,
    discount: 12,
    description: "Gel dưỡng lông bổ sung đa vitamin dồi dào cùng kẽm và dầu hoa anh thảo ép lạnh.",
    longDescription: "Gel Forcans dưỡng lông cho mèo từ Hàn Quốc là thực phẩm chức năng tuyệt vời bổ sung Vitamin nhóm B, Vitamin A, D, E và kẽm thúc đẩy mọc lông dày khỏe, giảm xơ xác và giảm gàu khô nứt da mèo.",
    specifications: {
      productName: "Forcans Nutrition Plus Salmon & Evening Primrose Gel",
      brand: "Forcans",
      weight: "120g",
      type: "Gel dinh dưỡng lỏng sệt (Supplement)",
      purpose: "Phục hồi lông rụng xơ xào, bổ sung vitamin thiết yếu",
      origin: "Hàn Quốc"
    },
    benefits: {
      healthSupport: "Lông mèo mượt óng ả rõ rệt sau 2 tuần sử dụng",
      nutritionNeeds: "Giàu Omega 6 từ tinh dầu hoa anh thảo ép lạnh",
      fatSupport: "Vị cá hồi béo ngậy cực kỳ kích thích mèo liếm láp",
      packaging: "Tuýp nhựa dẻo bóp dễ dàng"
    },
    usage: "Cho ăn trực tiếp từ tuýp hoặc bôi lên chân cho mèo tự liếm. Liều lượng 1-2 muỗng cà phê mỗi ngày.",
    ingredients: "Dầu hoa anh thảo, mỡ cá hồi Nauy, vitamin A, B1, B2, B6, B12, D3, E, kẽm gluconate, taurine.",
    stock: 50,
    shipping: "Giao hàng hỏa tốc trong ngày",
    species: "cat",
    tags: ["gel dinh dưỡng cho mèo", "forcans gel", "vitamin tổng hợp cho mèo", "dưỡng mượt lông mèo", "dầu hoa anh thảo", "kẽm gluconate", "giảm khô xơ rụng lông", "vị cá hồi ngon miệng", "hàn quốc nhập khẩu", "forcans nutrition gel"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Cát đậu nành hữu cơ PetQ hương trà xanh tự nhiên",
    slug: "cat-dau-nanh-huu-co-petq-huong-tra-xanh-tu-nhien",
    brandSlug: "petq",
    subCategorySlug: "cat-ve-sinh-cho-meo",
    price: 125000,
    originalPrice: 140000,
    discount: 11,
    description: "Cát đậu nành hữu cơ thân thiện môi trường, vón hút cực đỉnh, xả được trực tiếp trong bồn cầu.",
    longDescription: "Cát đậu nành (Tofu) PetQ làm hoàn toàn từ bã đậu nành hữu cơ tự nhiên ép viên nhỏ đường kính 2mm. Khả năng hút nước nhanh vón cực chặt và có thể hòa tan nhanh trong nước nên xả trực tiếp bồn cầu vô cùng tiện lợi và sạch sẽ.",
    specifications: {
      productName: "PetQ Green Tea Tofu Cat Litter",
      brand: "PetQ",
      weight: "2.8kg (6L)",
      type: "Cát hữu cơ đậu nành (Tofu)",
      purpose: "Cát vệ sinh tự tiêu xả bồn cầu an toàn môi trường",
      origin: "Việt Nam (Nguyên liệu nhập khẩu)"
    },
    benefits: {
      healthSupport: "Không bụi 100%, cực an toàn nếu mèo lỡ nuốt phải",
      nutritionNeeds: "Tự phân hủy sinh học tự nhiên, bảo vệ môi trường",
      fatSupport: "Khử mùi hôi phân bằng tinh chất trà xanh organic",
      packaging: "Bao bì hút chân không vuông vức, sạch sẽ"
    },
    usage: "Đổ vào khay dày khoảng 5-6cm. Vớt cục phân vón xả thẳng xuống toilet xả nước trôi.",
    ingredients: "Xơ bã đậu nành thiên nhiên 90%, tinh bột bắp kết dính, tinh dầu trà xanh hữu cơ.",
    stock: 140,
    shipping: "Giao nhanh nội thành TP.HCM",
    species: "cat",
    tags: ["cát đậu nành cho mèo", "cát tofu hữu cơ", "petq tofu", "xả bồn cầu toilet", "hương trà xanh green tea", "không bụi 100%", "tự phân hủy sinh học", "an toàn sức khỏe mèo", "cát bã đậu nành", "thân thiện môi trường"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Đồ chơi tháp bóng 3 tầng Fofos vui nhộn cho mèo cưng",
    slug: "do-choi-thap-bong-3-tang-fofos-vui-nhon-cho-meo-cung",
    brandSlug: "fofos",
    subCategorySlug: "do-choi-cho-meo",
    price: 135000,
    originalPrice: 160000,
    discount: 16,
    description: "Tháp bóng đồ chơi 3 tầng chuyển động xoay tròn vui mắt giúp mèo giải trí tự chơi tránh trầm cảm.",
    longDescription: "Đồ chơi thông minh tháp bóng 3 tầng Fofos sử dụng nhựa ABS cứng bền an toàn chịu va đập cào cào mạnh. Từng tầng chứa quả bóng màu nổi bật xoay vòng nhanh khi mèo cào vuốt, khơi dậy bản năng săn đuổi của mèo.",
    specifications: {
      productName: "Fofos 3-Tier Tower of Tracks Cat Toy",
      brand: "Fofos",
      weight: "400g",
      type: "Đồ chơi trí tuệ vận động (Tower Toy)",
      purpose: "Giải trí tự chơi trong nhà, kích hoạt phản xạ đuổi bắt",
      origin: "Trung Quốc"
    },
    benefits: {
      healthSupport: "Chống trầm cảm tự kỷ ở mèo nhốt lồng phòng hẹp",
      nutritionNeeds: "Nhựa cứng ABS nhẵn bóng không gây kẹt móng da",
      fatSupport: "Chân tháp chống trượt giúp vững vàng khi chơi",
      packaging: "Hộp giấy bìa cứng cartoon bảo vệ sản phẩm nguyên vẹn"
    },
    usage: "Đặt tháp bóng trên nền nhà phẳng rồi gẩy bóng cho mèo làm quen chơi.",
    ingredients: "Nhựa ABS siêu bền nguyên sinh 100%, bóng màu rực rỡ.",
    stock: 40,
    shipping: "Giao hàng tiêu chuẩn toàn quốc",
    species: "cat",
    tags: ["đồ chơi cho mèo", "tháp bóng 3 tầng", "fofos toy", "đồ chơi trí tuệ thông minh", "nhựa abs chịu lực", "mèo tự chơi giải trí", "đuổi bắt phản xạ", "giảm tự kỷ mèo nuôi trong nhà", "tháp xoay bóng", "fofos tower of tracks"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Snack bánh thưởng CattyMan ức gà sấy giòn bùi",
    slug: "snack-banh-thuong-cattyman-uc-ga-say-gion-bui",
    brandSlug: "catty-man",
    subCategorySlug: "snack-cho-meo",
    price: 38000,
    originalPrice: 45000,
    discount: 16,
    description: "Ức gà thật sấy khô thái miếng vuông nhỏ dai ngon giòn thơm làm quà thưởng huấn luyện cho mèo.",
    longDescription: "Snack CattyMan Ức Gà Sấy dồi dào protein nạc sạch, được sấy ở nhiệt độ thấp đảm bảo cấu trúc xốp dai ngọt tự nhiên của thịt gà. Rất thơm ngọt, là món ăn vặt lành mạnh cho mèo cưng yêu thích.",
    specifications: {
      productName: "CattyMan Freeze-Dried Chicken Breast Bites",
      brand: "Catty Man",
      weight: "35g",
      type: "Thịt sấy khô ăn vặt (Snack)",
      purpose: "Thưởng khích lệ huấn luyện cún mèo cưng",
      origin: "Việt Nam"
    },
    benefits: {
      healthSupport: "Dinh dưỡng nạc tinh khiết, chắc cơ bắp mèo",
      nutritionNeeds: "100% ức gà organic sấy khô",
      fatSupport: "Hàm lượng chất béo cực thấp dưới 2%",
      packaging: "Túi ZIP bảo quản giữ thịt giòn dai lâu"
    },
    usage: "Thưởng 3-6 viên/ngày sau giờ chơi đùa hoặc huấn luyện.",
    ingredients: "Ức gà nạc tự nhiên cắt viên sấy khô khử nước 100%.",
    stock: 120,
    shipping: "Giao nhanh nội thành TP.HCM",
    species: "cat",
    tags: ["snack cho mèo", "bánh thưởng mèo", "cattyman", "ức gà sấy đông khô", "freeze dried chicken breast", "quà thưởng huấn luyện", "đạm nạc ít béo", "ức gà 100% sấy", "cattyman freeze dried", "thức ăn vặt cho mèo"],
    images: ["https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600"]
  }
];

const seedProducts = async (): Promise<void> => {
  await AppDataSource.initialize();
  const productRepo = AppDataSource.getMongoRepository(Product);
  const brandRepo = AppDataSource.getMongoRepository(Brand);
  const categoryRepo = AppDataSource.getMongoRepository(Category);

  console.log(`Initialized database. Preparing to seed ${productsData.length} products...`);

  // Helper to ensure ObjectId type
  const toObjectId = (id: any): ObjectId => {
    if (id instanceof ObjectId) return id;
    if (typeof id === 'string') return new ObjectId(id);
    if (id && typeof id.toHexString === 'function') return new ObjectId(id.toHexString());
    if (id && typeof id.toString === 'function') return new ObjectId(id.toString());
    return new ObjectId(id);
  };

  // Cache existing brands and categories to minimize DB calls
  const allBrands = await brandRepo.find({});
  const allCategories = await categoryRepo.find({});

  const brandMap = new Map<string, ObjectId>();
  for (const b of allBrands) {
    if (b.slug && b._id) {
      brandMap.set(b.slug, toObjectId(b._id));
    }
  }

  // Map subcategory slug to its ObjectId
  const subCategoryMap = new Map<string, ObjectId>();
  for (const c of allCategories) {
    if (c.subcategories) {
      for (const sc of c.subcategories) {
        if (sc.slug && sc._id) {
          subCategoryMap.set(sc.slug, toObjectId(sc._id));
        }
      }
    }
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of productsData) {
    // Resolve Brand ID
    let brandId = brandMap.get(item.brandSlug);
    if (!brandId) {
      // Fallback: If brand slug doesn't match, search by casing or use the first brand
      console.warn(`Warning: Brand slug "${item.brandSlug}" not found in database. Searching name...`);
      const matchedBrand = allBrands.find(b => b.name.toLowerCase().includes(item.brandSlug.replace('-', ' ')));
      if (matchedBrand) {
        brandId = toObjectId(matchedBrand._id);
      } else if (allBrands.length > 0) {
        brandId = toObjectId(allBrands[0]._id);
        console.warn(`Fallback: Using first brand "${allBrands[0].name}" for product "${item.name}"`);
      } else {
        console.error(`Error: No brands found in database. Cannot insert products!`);
        await AppDataSource.destroy();
        process.exit(1);
      }
    }

    // Resolve Subcategory ID
    let subCategoryId = subCategoryMap.get(item.subCategorySlug);
    if (!subCategoryId) {
      console.warn(`Warning: Subcategory slug "${item.subCategorySlug}" not found. Searching...`);
      // Find any subcategory containing parts of the slug
      let foundScId: ObjectId | null = null;
      for (const c of allCategories) {
        if (c.subcategories) {
          const sc = c.subcategories.find(s => s.slug.includes(item.subCategorySlug) || item.subCategorySlug.includes(s.slug));
          if (sc) {
            foundScId = toObjectId(sc._id);
            break;
          }
        }
      }
      if (foundScId) {
        subCategoryId = foundScId;
      } else {
        // Fallback to the first subcategory in the first category
        const fallbackCat = allCategories.find(c => c.subcategories && c.subcategories.length > 0);
        if (fallbackCat && fallbackCat.subcategories) {
          subCategoryId = toObjectId(fallbackCat.subcategories[0]._id);
          console.warn(`Fallback: Using subcategory "${fallbackCat.subcategories[0].name}" for product "${item.name}"`);
        } else {
          console.error(`Error: No categories or subcategories found in database. Cannot insert products!`);
          await AppDataSource.destroy();
          process.exit(1);
        }
      }
    }

    // Check if product already exists by slug
    let product = await productRepo.findOneBy({ slug: item.slug });
    let isNew = false;

    if (!product) {
      product = new Product();
      isNew = true;
    }

    product.name = item.name;
    product.slug = item.slug;
    product.brand = toObjectId(brandId);
    product.subcategories = toObjectId(subCategoryId);
    product.price = item.price;
    product.originalPrice = item.originalPrice;
    product.discount = item.discount;
    product.description = item.description;
    product.longDescription = item.longDescription;
    product.specifications = item.specifications;
    product.benefits = item.benefits;
    product.usage = item.usage;
    product.ingredients = item.ingredients;
    product.stock = item.stock;
    product.shipping = item.shipping;
    product.species = item.species;
    product.tags = item.tags;
    product.images = item.images;
    product.is_active = true;
    product.review = 0;

    await productRepo.save(product);

    if (isNew) {
      createdCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`Seeding process finished!`);
  console.log(`Created new: ${createdCount} products.`);
  console.log(`Updated existing: ${updatedCount} products.`);

  await AppDataSource.destroy();
};

seedProducts().catch(async (error) => {
  console.error("Seeding products failed:", error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
