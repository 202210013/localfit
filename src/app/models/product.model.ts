export interface Product {
    id: number;
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    seller_name: string;
    sold?: number; 
}