const path = require('path');
const fs = require('fs');
const { query, queryOne } = require('../config/database');
const { getRelativeFilePath } = require('../middleware/upload');

class ProductService {
  constructor() {
    this.tableName = 'products';
    this.uploadDir = path.join(__dirname, '../../e-comm-images');
    this.baseUrl = 'http://localhost:3001/e-comm-images/';
  }

  // Create a new product
  async createProduct(data, file, user) {
    try {
      console.log("CREATE PRODUCT - Starting creation process");
      console.log("POST data:", data);
      console.log("File data:", file);

      if (!file) {
        return {
          success: false,
          error: 'No image uploaded',
          status: 400
        };
      }

      const { name, price, description, category, available_sizes, size_quantities } = data;

      // Validate required fields
      if (!name || !price || !description) {
        return {
          success: false,
          error: 'Missing required fields: name, price, or description',
          status: 400
        };
      }

      // Validate price
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return {
          success: false,
          error: 'Price must be a positive number',
          status: 400
        };
      }

      // Handle available sizes
      let sizesArray = [];
      if (available_sizes) {
        try {
          sizesArray = typeof available_sizes === 'string' 
            ? JSON.parse(available_sizes) 
            : available_sizes;
        } catch (e) {
          sizesArray = ['S', 'M', 'L', 'XL']; // Default sizes
        }
      } else {
        sizesArray = ['S', 'M', 'L', 'XL']; // Default sizes
      }

      // Handle size-specific quantities
      let sizeQuantitiesObj = {};
      let totalQuantity = 0;
      
      if (size_quantities) {
        try {
          sizeQuantitiesObj = typeof size_quantities === 'string' 
            ? JSON.parse(size_quantities) 
            : size_quantities;
          
          // Validate quantities are non-negative numbers
          for (const [size, qty] of Object.entries(sizeQuantitiesObj)) {
            const numericQty = parseInt(qty) || 0;
            if (numericQty < 0) {
              return {
                success: false,
                error: `Quantity for size ${size} cannot be negative`,
                status: 400
              };
            }
            sizeQuantitiesObj[size] = numericQty;
            totalQuantity += numericQty;
          }
        } catch (e) {
          // If parsing fails, create default quantities
          sizesArray.forEach(size => {
            sizeQuantitiesObj[size] = 1;
            totalQuantity += 1;
          });
        }
      } else {
        // Create default quantities for all sizes
        sizesArray.forEach(size => {
          sizeQuantitiesObj[size] = 1;
          totalQuantity += 1;
        });
      }

      // Get relative file path for database storage
      const imageRelativePath = getRelativeFilePath(file.path);

      // Insert into database
      const result = await query(
        `INSERT INTO ${this.tableName} 
         (name, price, description, image, category, available_sizes, size_quantities, quantity, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          numericPrice,
          description,
          imageRelativePath,
          category || '',
          JSON.stringify(sizesArray),
          JSON.stringify(sizeQuantitiesObj),
          totalQuantity,
          user.id
        ]
      );

      console.log("CREATE PRODUCT - Product created successfully");
      
      return {
        success: true,
        message: 'Product was created',
        product_id: result.insertId,
        status: 201
      };
    } catch (error) {
      console.error('CREATE PRODUCT - Error:', error);
      return {
        success: false,
        error: 'Unable to create product',
        message: error.message,
        status: 500
      };
    }
  }

  // Read products for authenticated user
  async readProducts(sellerEmail) {
    try {
      let sql = `SELECT p.*, u.email as seller_email FROM ${this.tableName} p 
                 LEFT JOIN users u ON p.user_id = u.id`;
      let params = [];

      if (sellerEmail) {
        sql += ' WHERE u.email = ?';
        params.push(sellerEmail);
      }

      sql += ' ORDER BY p.id DESC';

      const products = await query(sql, params);
      
      // Process products - add full image URLs and parse available_sizes
      const processedProducts = products.map(product => ({
        ...product,
        image: this.baseUrl + product.image,
        available_sizes: product.available_sizes 
          ? JSON.parse(product.available_sizes) 
          : ['S', 'M', 'L', 'XL']
      }));

      return {
        success: true,
        records: processedProducts
      };
    } catch (error) {
      console.error('Error reading products:', error);
      return {
        success: false,
        error: 'Failed to fetch products',
        records: []
      };
    }
  }

  // Read all products (public access)
  async readAllProducts() {
    try {
      const products = await query(
        `SELECT p.*, u.name as seller_name, u.email as seller_email 
         FROM ${this.tableName} p 
         LEFT JOIN users u ON p.user_id = u.id 
         ORDER BY p.id DESC`
      );

      // Process products
      const processedProducts = products.map(product => ({
        ...product,
        image: this.baseUrl + product.image,
        available_sizes: product.available_sizes 
          ? JSON.parse(product.available_sizes) 
          : ['S', 'M', 'L', 'XL']
      }));

      return {
        success: true,
        records: processedProducts
      };
    } catch (error) {
      console.error('Error reading all products:', error);
      return {
        success: false,
        error: 'Failed to fetch products',
        records: []
      };
    }
  }

  // Read all products offline (cached version)
  async readAllProductsOffline() {
    // This could be the same as readAllProducts or implement caching
    return await this.readAllProducts();
  }

  // Read single product
  async readOneProduct(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Product ID is required',
          status: 400
        };
      }

      const product = await queryOne(
        `SELECT p.*, u.name as seller_name, u.email as seller_email 
         FROM ${this.tableName} p 
         LEFT JOIN users u ON p.user_id = u.id 
         WHERE p.id = ?`,
        [id]
      );

      if (!product) {
        return {
          success: false,
          error: 'Product not found',
          status: 404
        };
      }

      // Process product
      const processedProduct = {
        ...product,
        image: this.baseUrl + product.image,
        available_sizes: product.available_sizes 
          ? JSON.parse(product.available_sizes) 
          : ['S', 'M', 'L', 'XL']
      };

      return {
        success: true,
        product: processedProduct
      };
    } catch (error) {
      console.error('Error reading product:', error);
      return {
        success: false,
        error: 'Failed to fetch product',
        status: 500
      };
    }
  }

  // Update product
  async updateProduct(id, data, file, user) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Product ID is required',
          status: 400
        };
      }

      // Check if product exists and belongs to user
      const existingProduct = await queryOne(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND user_id = ?`,
        [id, user.id]
      );

      if (!existingProduct) {
        return {
          success: false,
          error: 'Product not found or access denied',
          status: 404
        };
      }

      const { name, price, description, category, available_sizes, size_quantities } = data;
      
      console.log("UPDATE PRODUCT - Received data:");
      console.log("- Product ID:", id);
      console.log("- Available Sizes:", available_sizes);
      console.log("- Size Quantities:", size_quantities);
      console.log("- Raw data:", data);
      
      // Build update query dynamically
      let updateFields = [];
      let updateValues = [];

      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }

      if (price !== undefined) {
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
          return {
            success: false,
            error: 'Price must be a positive number',
            status: 400
          };
        }
        updateFields.push('price = ?');
        updateValues.push(numericPrice);
      }

      // Handle size-specific quantities
      if (size_quantities !== undefined) {
        console.log("Processing size quantities update...");
        try {
          let sizeQuantitiesObj = typeof size_quantities === 'string' 
            ? JSON.parse(size_quantities) 
            : size_quantities;
          
          console.log("Parsed size quantities:", sizeQuantitiesObj);
          let totalQuantity = 0;
          
          // Validate and calculate total quantity
          for (const [size, qty] of Object.entries(sizeQuantitiesObj)) {
            const numericQty = parseInt(qty) || 0;
            if (numericQty < 0) {
              return {
                success: false,
                error: `Quantity for size ${size} cannot be negative`,
                status: 400
              };
            }
            sizeQuantitiesObj[size] = numericQty;
            totalQuantity += numericQty;
          }
          
          updateFields.push('size_quantities = ?');
          updateValues.push(JSON.stringify(sizeQuantitiesObj));
          
          updateFields.push('quantity = ?');
          updateValues.push(totalQuantity);
          
        } catch (e) {
          return {
            success: false,
            error: 'Invalid size quantities format',
            status: 400
          };
        }
      }

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }

      if (category !== undefined) {
        updateFields.push('category = ?');
        updateValues.push(category);
      }

      if (available_sizes !== undefined) {
        let sizesArray = [];
        try {
          sizesArray = typeof available_sizes === 'string' 
            ? JSON.parse(available_sizes) 
            : available_sizes;
        } catch (e) {
          sizesArray = ['S', 'M', 'L', 'XL'];
        }
        updateFields.push('available_sizes = ?');
        updateValues.push(JSON.stringify(sizesArray));
      }

      // Handle file update
      if (file) {
        const imageRelativePath = getRelativeFilePath(file.path);
        updateFields.push('image = ?');
        updateValues.push(imageRelativePath);

        // Optionally delete old image file
        // This would require implementing file deletion logic
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: 'No fields to update',
          status: 400
        };
      }

      // Add WHERE clause values
      updateValues.push(id, user.id);

      const sql = `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
      
      await query(sql, updateValues);

      return {
        success: true,
        message: 'Product updated successfully'
      };
    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        error: 'Failed to update product',
        status: 500
      };
    }
  }

  // Delete product
  async deleteProduct(id, user) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Product ID is required',
          status: 400
        };
      }

      // Check if product exists and belongs to user
      const existingProduct = await queryOne(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND user_id = ?`,
        [id, user.id]
      );

      if (!existingProduct) {
        return {
          success: false,
          error: 'Product not found or access denied',
          status: 404
        };
      }

      // Delete product from database
      await query(`DELETE FROM ${this.tableName} WHERE id = ? AND user_id = ?`, [id, user.id]);

      // Optionally delete image file
      // This would require implementing file deletion logic

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        error: 'Failed to delete product',
        status: 500
      };
    }
  }
}

module.exports = ProductService;