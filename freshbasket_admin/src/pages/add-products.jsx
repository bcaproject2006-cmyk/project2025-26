const AddProduct = () => {
  return (
    <div className="card">
      <h2>Add Product</h2>

      <form className="product-form">
        <div className="form-group">
          <label>Category ID</label>
          <input type="number" placeholder="Enter category id" />
        </div>

        <div className="form-group">
          <label>Product Name</label>
          <input type="text" placeholder="Enter product name" />
        </div>

        <div className="form-group">
          <label>Unit</label>
          <select>
            <option value="">Select unit</option>
            <option>Kg</option>
            <option>Gram</option>
            <option>Liter</option>
            <option>Piece</option>
          </select>
        </div>

        <div className="form-group">
          <label>Price</label>
          <input type="number" placeholder="Enter price" />
        </div>

        <div className="form-group full">
          <label>Product Image</label>
          <input type="file" />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select>
            <option value="">Select status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        <button className="btn">Save Product</button>
      </form>
    </div>
  );
};

export default AddProduct;
