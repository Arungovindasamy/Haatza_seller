// sellerProfileApi.js
const CANONICAL_SELLER_KEY  = "__haatza_sellerId";
const CANONICAL_PIN_KEY     = "__haatza_sellerPinCode";

export const getCachedSellerId = () => {
  const val =
    sessionStorage.getItem(CANONICAL_SELLER_KEY) ||
    localStorage.getItem(CANONICAL_SELLER_KEY)   ||
    sessionStorage.getItem("sellerId")            ||
    localStorage.getItem("sellerId")              ||
    "";
  if (!val || val.trim().length < 2) {
    console.warn("[sellerProfileApi] getCachedSellerId: no sellerId found");
  }
  return val.trim();
};

export const getCachedSellerPinCode = () => {
  const val =
    sessionStorage.getItem(CANONICAL_PIN_KEY) ||
    localStorage.getItem(CANONICAL_PIN_KEY)   ||
    sessionStorage.getItem("sellerPinCode")   ||
    localStorage.getItem("sellerPinCode")     ||
    "";
  if (!val || !/^\d{6}$/.test(val.trim())) {
    console.warn("[sellerProfileApi] getCachedSellerPinCode: invalid or missing pinCode:", val);
  }
  return val.trim();
};