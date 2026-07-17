import React, { useState } from 'react';
import { ShoppingCart, X, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

export default function EarnView({ profile, setProfile }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  // Product data matching the image format
  const products = [
    {
      id: 1,
      vip: 'VIP 1',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop',
      price: 5000,
      dailyIncome: 1315,
      totalIncome: 39450,
      validity: '30 days',
      status: 'available'
    },
    {
      id: 2,
      vip: 'VIP 2',
      image: 'https://images.unsplash.com/photo-1519861531473-92002639313cc?w=400&h=400&fit=crop',
      price: 10000,
      dailyIncome: 2631,
      totalIncome: 78930,
      validity: '30 days',
      status: 'available'
    },
    {
      id: 3,
      vip: 'VIP 3',
      image: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400&h=400&fit=crop',
      price: 20000,
      dailyIncome: 5263,
      totalIncome: 157890,
      validity: '30 days',
      status: 'available'
    },
    {
      id: 4,
      vip: 'VIP 4',
      image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop',
      price: 50000,
      dailyIncome: 13157,
      totalIncome: 394710,
      validity: '30 days',
      status: 'available'
    },
    {
      id: 5,
      vip: 'VIP 5',
      image: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&h=400&fit=crop',
      price: 100000,
      dailyIncome: 26315,
      totalIncome: 789450,
      validity: '30 days',
      status: 'coming_soon'
    },
    {
      id: 6,
      vip: 'VIP 6',
      image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop',
      price: 200000,
      dailyIncome: 52630,
      totalIncome: 1578900,
      validity: '30 days',
      status: 'coming_soon'
    },
  ];

  const handleBuy = (product) => {
    // Open modal without checking balance
    setSelectedProduct(product);
  };

 const handleConfirm = async () => {
    const userBalance = profile?.balance || 0;
    
    if (userBalance < selectedProduct.price) {
      toast.error(`Insufficient balance!`);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('vip_level', selectedProduct.vip)
        .single();

      if (productError || !product) {
        toast.error('Product not found in database.');
        return;
      }

      // 1. Create the purchase record
      const purchaseDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(purchaseDate.getDate() + product.validity_days);

      const { error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          product_id: product.id,
          purchase_date: purchaseDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
          total_paid: product.price,
          status: 'active'
        });

      if (purchaseError) throw purchaseError;

      // 2. CRITICAL STEP: Update the balance in the database
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: userBalance - product.price })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      // 3. Update local state
      setProfile(prev => ({ ...prev, balance: userBalance - product.price }));

      toast.success(`Successfully purchased ${selectedProduct.vip}!`);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Transaction failed.');
    }
  };
  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold mb-1">Product</h1>
        <p className="text-gray-400 text-sm">Browse and purchase products to start earning.</p>
      </div>

      {/* Product Grid - 2 columns, compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="bg-white rounded-lg p-4 flex flex-col items-center"
          >
            {/* VIP Label */}
            <h3 className="text-base font-bold text-gray-800 mb-3">{product.vip}</h3>
            
            {/* Product Image */}
            <div className="w-32 h-32 mb-3 flex items-center justify-center bg-gray-50 rounded-lg">
              {!imageErrors[product.id] ? (
                <img 
                  src={product.image} 
                  alt={product.vip}
                  className="w-full h-full object-contain"
                  onError={() => handleImageError(product.id)}
                />
              ) : (
                <Package className="h-16 w-16 text-gray-400" />
              )}
            </div>

            {/* Price */}
            <div className="text-red-600 font-bold text-base mb-1">
              ₦ {product.price.toLocaleString()}
            </div>

            {/* Daily Income */}
            <div className="text-gray-600 text-xs mb-0.5">Daily income</div>
            <div className="text-red-600 font-bold text-xs mb-0.5">
              ₦ {product.dailyIncome.toLocaleString()}
            </div>

            {/* Total Income */}
            <div className="text-gray-500 text-xs mb-0.5">Total income</div>
            <div className="text-gray-800 font-bold text-xs mb-3">
              ₦ {product.totalIncome.toLocaleString()}
            </div>

            {/* Buy Button or Coming Soon */}
            {product.status === 'available' ? (
              <button 
                onClick={() => handleBuy(product)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-6 rounded text-sm transition-colors w-full"
              >
                Buy
              </button>
            ) : (
              <button 
                disabled
                className="bg-gray-400 text-white font-bold py-1.5 px-6 rounded text-sm w-full cursor-not-allowed"
              >
                Coming soon
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Purchase Confirmation Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-scroll p-4 sm:p-6 relative">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* VIP Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">{selectedProduct.vip}</h2>

            {/* Description */}
            <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6">
              After purchasing the product, your earnings will be credited to your account every 24 hours.
            </p>

            {/* Product Details */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* Product Image */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mx-auto sm:mx-0 bg-gray-100 rounded-lg">
                {!imageErrors[selectedProduct.id] ? (
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.vip}
                    className="w-full h-full object-contain"
                    onError={() => handleImageError(selectedProduct.id)}
                  />
                ) : (
                  <Package className="h-12 w-12 text-gray-400" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-1.5 sm:space-y-2">
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Price:</span>
                  <span className="text-gray-800 font-bold text-xs sm:text-sm ml-2">₦ {selectedProduct.price.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Daily income:</span>
                  <span className="text-gray-800 font-bold text-xs sm:text-sm ml-2">₦ {selectedProduct.dailyIncome.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Total income:</span>
                  <span className="text-gray-800 font-bold text-xs sm:text-sm ml-2">₦ {selectedProduct.totalIncome.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Validity period:</span>
                  <span className="text-gray-800 font-bold text-xs sm:text-sm ml-2">{selectedProduct.validity}</span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <p className="text-gray-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              You can make multiple purchases to increase your income.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 sm:py-3 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 sm:py-3 rounded-lg transition-colors text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}