// Pre-defined subcategories seeded per default category on first launch (and
// backfilled for any category missing new ones later), keyed by the parent
// category's name — see db/queries/subcategories.ts's seedDefaultSubcategories.
// Keys must match constants/categories.ts's DEFAULT_CATEGORIES names exactly.
export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Food: [
    'Groceries',
    'Restaurants',
    'Fast Food',
    'Coffee Shops',
    'Jollibee',
    "McDonald's",
    'Chowking',
    'Seafood',
    'Bakery',
    'Convenience Store',
    'SM/Puregold',
    'Market',
    'Meal Prep',
    'Food Delivery',
  ],
  Transport: [
    'Uber',
    'GrabCar',
    'Taxi',
    'Gas/Petrol',
    'Parking',
    'Toll',
    'Bus',
    'MRT/LRT',
    'Jeepney',
    'Motorcycle Gas',
    'Car Maintenance',
    'Toll Fee',
    'Tricycle',
    'Bike Repair',
  ],
  Utilities: [
    'Electric Bill',
    'Water Bill',
    'Internet',
    'Postpaid Plan',
    'Prepaid Load',
    'Netflix',
    'Spotify',
    'YouTube Premium',
    'Viber Out',
    'Meralco',
    'Maynilad',
    'PLDT',
    'Globe',
    'Smart',
  ],
  Entertainment: [
    'Movies',
    'Gaming',
    'Concerts',
    'Bars/Clubs',
    'Karaoke',
    'Sports',
    'Streaming Services',
    'Books',
    'Hobbies',
    'Gym',
    'Spa',
    'Massage',
    'Beauty Salon',
    'Haircut',
  ],
  Health: [
    'Medicine',
    'Doctor Checkup',
    'Dentist',
    'Eye Doctor',
    'Hospital',
    'Pharmacy',
    'Vitamins',
    'Health Insurance',
    'Mental Health',
    'Fitness Classes',
  ],
  Shopping: [
    'Clothes',
    'Shoes',
    'Electronics',
    'Home Appliances',
    'Furniture',
    'Accessories',
    'Online Shopping',
    'Mall',
    'Tiangge',
    'Books',
    'Toys',
    'Sports Equipment',
  ],
  Other: ['Gifts', 'Donations', 'Tips', 'Miscellaneous'],
};

export interface MerchantMapping {
  keyword: string;
  categoryName: string;
  subcategoryName: string;
}

/**
 * Brand/merchant names the AI chat's mock inference (utils/mockLlm.ts) checks
 * before falling back to a generic "does the message mention any subcategory
 * name" scan — this list wins even when a merchant is itself also a literal
 * DEFAULT_SUBCATEGORIES entry (e.g. "Jollibee" is deliberately mapped to the
 * broader "Fast Food" subcategory here, not the literal "Jollibee" row).
 */
export const MERCHANT_SUBCATEGORY_MAP: MerchantMapping[] = [
  { keyword: 'netflix', categoryName: 'Utilities', subcategoryName: 'Netflix' },
  { keyword: 'jollibee', categoryName: 'Food', subcategoryName: 'Fast Food' },
  { keyword: 'shell', categoryName: 'Transport', subcategoryName: 'Gas/Petrol' },
  { keyword: 'caltex', categoryName: 'Transport', subcategoryName: 'Gas/Petrol' },
  { keyword: 'petron', categoryName: 'Transport', subcategoryName: 'Gas/Petrol' },
  { keyword: 'spotify', categoryName: 'Utilities', subcategoryName: 'Spotify' },
  { keyword: 'youtube premium', categoryName: 'Utilities', subcategoryName: 'YouTube Premium' },
  { keyword: 'mcdo', categoryName: 'Food', subcategoryName: "McDonald's" },
  { keyword: 'chowking', categoryName: 'Food', subcategoryName: 'Chowking' },
  { keyword: 'grab', categoryName: 'Transport', subcategoryName: 'GrabCar' },
  { keyword: 'uber', categoryName: 'Transport', subcategoryName: 'Uber' },
  { keyword: 'meralco', categoryName: 'Utilities', subcategoryName: 'Meralco' },
  { keyword: 'maynilad', categoryName: 'Utilities', subcategoryName: 'Maynilad' },
  { keyword: 'pldt', categoryName: 'Utilities', subcategoryName: 'PLDT' },
  { keyword: 'globe', categoryName: 'Utilities', subcategoryName: 'Globe' },
  { keyword: 'smart', categoryName: 'Utilities', subcategoryName: 'Smart' },
];
