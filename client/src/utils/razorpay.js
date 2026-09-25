const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loader = null;


export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        loader = null; // allow a retry after a network blip
        script.remove();
        reject(new Error("Couldn't load the payment window. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return loader;
};
