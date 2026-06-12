import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Package } from "lucide-react";

export default function ListingFormPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    productName: "",
    price: "",
    subCategoryId: "",
    deliveryCharges: false,
    shippingWeight: "",
    sellerPinCode: "",
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.productName.trim()) e.productName = "Product name is required";
    if (!form.price || Number(form.price) <= 0) e.price = "Valid price is required";
    if (!form.sellerPinCode || !/^\d{6}$/.test(form.sellerPinCode))
      e.sellerPinCode = "6-digit pin code is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    navigate("/listing/review", { state: { listingData: form } });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const inputCls = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
      errors[field] ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Add New Product</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Product Info</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls("productName")}
              placeholder="e.g. Cotton Kurta"
              value={form.productName}
              onChange={(e) => handleChange("productName", e.target.value)}
            />
            {errors.productName && (
              <p className="text-xs text-red-600 mt-1">{errors.productName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls("price")}
              type="number"
              placeholder="500"
              value={form.price}
              onChange={(e) => handleChange("price", e.target.value)}
            />
            {errors.price && (
              <p className="text-xs text-red-600 mt-1">{errors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Sub Category ID
            </label>
            <input
              className={inputCls("subCategoryId")}
              placeholder="e.g. cat-123"
              value={form.subCategoryId}
              onChange={(e) => handleChange("subCategoryId", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Shipping Weight (g)
            </label>
            <input
              className={inputCls("shippingWeight")}
              type="number"
              placeholder="200"
              value={form.shippingWeight}
              onChange={(e) => handleChange("shippingWeight", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Seller Pin Code <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls("sellerPinCode")}
              placeholder="400001"
              maxLength={6}
              value={form.sellerPinCode}
              onChange={(e) =>
                handleChange("sellerPinCode", e.target.value.replace(/\D/g, ""))
              }
            />
            {errors.sellerPinCode && (
              <p className="text-xs text-red-600 mt-1">{errors.sellerPinCode}</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={form.deliveryCharges}
              onClick={() => handleChange("deliveryCharges", !form.deliveryCharges)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.deliveryCharges ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.deliveryCharges ? "translate-x-5" : ""
                }`}
              />
            </button>
            <span className="text-sm text-slate-700">Delivery charges applicable</span>
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Review & Submit <ArrowRight className="w-4 h-4" />
        </button>
      </main>
    </div>
  );
}
