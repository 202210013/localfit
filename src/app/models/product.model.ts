export interface Product {
  id: number; // Remove the optional ? to make it required
  name: string;
  price: number;
  description: string;
  image: string;
  user_id?: number;
  author_id?: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
  seller_name?: string;
  user_name?: string;
}